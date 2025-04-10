const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
const proj4 = require('proj4');
const regionCodes = require('./regionCodes');
const { getCoordsFromAddress } = require('./getCoordsFromAddress');
require('dotenv').config();

// KATEC 좌표계 정의
proj4.defs("KATEC", "+proj=tmerc +lat_0=38 +lon_0=128 +k=1 +x_0=400000 +y_0=600000 +ellps=GRS80 +units=m +no_defs");

// TM 좌표 → WGS84 (위경도) 변환 함수
function tmToWGS84(x, y) {
  const [lon, lat] = proj4("KATEC", "WGS84", [parseFloat(x), parseFloat(y)]);
  return { lat, lon };
}

// 지역 코드 추출
async function getRegionCode(lat, lon) {
  const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}`;
  const res = await fetch(url, {
    headers: { "User-Agent": "gas-station-finder/1.0" }
  });
  const data = await res.json();

  // ✅ 여러 옵션 중 지역 이름 추출
  const regionName = data.address.state || data.address.city || data.address.region;

  if (!regionName || !regionCodes[regionName]) {
    console.warn("❗ 유효하지 않은 지역 이름 또는 매핑 없음:", regionName);
    return null;
  }

  console.log("📍 현재 위치 regionName:", regionName);
  console.log("✅ 추출된 코드:", regionCodes[regionName]);

  return regionCodes[regionName];
}

// 오피넷 주유소 정보 + 좌표 변환 + 주소 보정 포함
async function getGasStations(regionCode) {
  const apiKey = process.env.OPINET_API_KEY;
  const cnt = 5;

  const urls = {
    gasoline: `https://www.opinet.co.kr/api/lowTop10.do?out=json&code=${apiKey}&prodcd=B027&area=${regionCode}&cnt=${cnt}`,
    diesel: `https://www.opinet.co.kr/api/lowTop10.do?out=json&code=${apiKey}&prodcd=D047&area=${regionCode}&cnt=${cnt}`
  };

  const [gasolineRes, dieselRes] = await Promise.all([
    fetch(urls.gasoline),
    fetch(urls.diesel)
  ]);

  const gasolineData = await gasolineRes.json();
  const dieselData = await dieselRes.json();

  // TM → WGS84 변환 + 주소 보정 포함
  const convert = async (rawData) => {
    return Promise.all(
      rawData.map(async (station) => {
        const { OS_NM, GIS_X_COOR, GIS_Y_COOR, NEW_ADR, VAN_ADR } = station;
        let latLng = null;

        if (GIS_X_COOR && GIS_Y_COOR) {
          const x = parseFloat(GIS_X_COOR);
          const y = parseFloat(GIS_Y_COOR);
          latLng = tmToWGS84(x, y);

          console.log(`\n🔍 [${OS_NM}] 오피넷 원본 TM 좌표: x=${x}, y=${y}`);
          console.log(`📐 EPSG:5174 → 변환 결과: lat=${latLng.lat}, lon=${latLng.lon}`);
        }

        // TM 변환 실패하거나 이상하면 주소 기반 보정
        if (!latLng || isNaN(latLng.lat) || isNaN(latLng.lon)) {
          const address = NEW_ADR || VAN_ADR;
          const corrected = await getCoordsFromAddress(address);
          if (corrected) {
            latLng = corrected;
            console.log(`📍 주소 기반 보정 (${address}): lat=${latLng.lat}, lon=${latLng.lon}`);
          }
        }

        return {
          ...station,
          lat: latLng?.lat,
          lon: latLng?.lon
        };
      })
    );
  };

  // ⚠️ 비동기 변환 함수이므로 await 필요!
  return {
    gasoline: await convert(gasolineData.RESULT.OIL),
    diesel: await convert(dieselData.RESULT.OIL)
  };
}

module.exports = { getRegionCode, getGasStations };
