// kakamap.js
const dummyData = {
  gasoline: [
    { lat: 35.19891304897737, lon: 126.93758660633249, OS_NM: "(유)착한주유소", PRICE: 1559, NEW_ADR: "광주 북구 동문대로 452 (장등동)" },
    { lat: 35.24230023648585, lon: 126.88775002091218, OS_NM: "행복가득주유소", PRICE: 1565, NEW_ADR: "광주 북구 우치로 952(용전동)" },
    { lat: 35.232368908042574, lon: 126.87864323655424, OS_NM: "광주주유소", PRICE: 1565, NEW_ADR: "광주 북구 빛고을대로 825 (지야동)" },
    { lat: 35.23439884313534, lon: 126.87888448003815, OS_NM: "(주)스피드에너지", PRICE: 1565, NEW_ADR: "광주 북구 빛고을대로 849" },
    { lat: 35.21075116921343, lon: 126.79270690652716, OS_NM: "진곡산단주유소", PRICE: 1565, NEW_ADR: "광주 광산구 임곡로 516,  (진곡동)" }
  ],
  diesel: [
    { lat: 35.15992285990457, lon: 126.8214289648916, OS_NM: "남선석유(주) 임방울셀프주유소", PRICE: 1439, NEW_ADR: "광주 광산구 임방울대로 14" },
    { lat: 35.159890173441596, lon: 126.8204246758662, OS_NM: "유한회사 우이리주유소", PRICE: 1439, NEW_ADR: "광주 광산구 임방울대로 13" },
    { lat: 35.19891304897737, lon: 126.93758660633249, OS_NM: "(유)착한주유소", PRICE: 1439, NEW_ADR: "광주 북구 동문대로 452 (장등동)" },
    { lat: 35.15104647025281, lon: 126.83846115443646, OS_NM: "반디석유시청점", PRICE: 1445, NEW_ADR: "광주 서구 천변좌하로 160 (치평동)" },
    { lat: 35.14964845204208, lon: 126.8374165870456, OS_NM: "(주)대원 강변주유소", PRICE: 1445, NEW_ADR: "광주 서구 천변좌하로 142 (치평동)" }
  ]
};

let mapMarkers = [];
let selectedAmount = 50000; // 기본 주유 금액
let fuelEfficiency = 12.3; // 차량 연비
let currentInfoWindow = null;

function getDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

async function initMap() {
  const lat = 35.15;
  const lon = 126.92;
  const userPos = new kakao.maps.LatLng(lat, lon);
  const mapContainer = document.getElementById('map2');
  const mapOption = { center: userPos, level: 9 };
  const map = new kakao.maps.Map(mapContainer, mapOption);

  new kakao.maps.Marker({ position: userPos, map, title: '현재 위치' });

  const list = document.getElementById('station-list');
  list.innerHTML = '';
  mapMarkers = [];
  currentInfoWindow = null;

  function makeMarker(station, type) {
    const { lat, lon, OS_NM, PRICE, NEW_ADR } = station;
    const position = new kakao.maps.LatLng(lat, lon);
    const emoji = type === 'gasoline' ? '⛽' : '🛢️';


    const markerImage = new kakao.maps.MarkerImage(
      type === 'gasoline' ? '/icon/gas-station(red).png' : '/icon/gas-station(g).png',
      new kakao.maps.Size(27, 27)
    );


    const marker = new kakao.maps.Marker({ map, position, title: OS_NM, image: markerImage });
    mapMarkers.push(marker);

    // 리스트 항목
    const item = document.createElement('div');
    item.className = 'station-item';
    const baseInfo = `
      <strong>${emoji} ${type === 'gasoline' ? '휘발유' : '경유'} - ${OS_NM}</strong><br/>
      💰 ${PRICE}원<br/>
      📍 ${NEW_ADR || '주소 정보 없음'}
    `;
    item.innerHTML = baseInfo;
    list.appendChild(item);

    station.domElement = item;
    station.baseHTML = baseInfo;

    // 인포윈도우 생성 및 클릭 이벤트
    const infoWindow = new kakao.maps.InfoWindow({
      content: `<div style="padding:8px;">${OS_NM}<br/>${PRICE}원</div>`
    });

    kakao.maps.event.addListener(marker, 'click', () => {
      if (currentInfoWindow) currentInfoWindow.close();
      if (currentInfoWindow === infoWindow) {
        currentInfoWindow = null;
      } else {
        infoWindow.open(map, marker);
        currentInfoWindow = infoWindow;
      }
    });

    // 리스트 항목 클릭 시 지도 이동 및 인포윈도우 열기
    item.addEventListener('click', (e) => {
      e.stopPropagation(); // 이벤트 버블링 방지
      if (currentInfoWindow) currentInfoWindow.close();
      infoWindow.open(map, marker);
      currentInfoWindow = infoWindow;
      map.panTo(position); // 부드럽게 지도 이동
    });
  }

  function renderByFuelType(type) {
    list.innerHTML = '';
    mapMarkers.forEach(marker => marker.setMap(null));
    mapMarkers = [];
    dummyData[type].forEach(station => makeMarker(station, type));
    updateCalculations(type);
  }

  function updateCalculations(type) {
    dummyData[type].forEach(station => {
      // 초기화
      station.domElement.innerHTML = station.baseHTML;

      const dist = getDistanceKm(lat, lon, station.lat, station.lon);
      const fuelUsed = dist / fuelEfficiency;
      const drivingCost = fuelUsed * station.PRICE;
      const totalCost = Number(selectedAmount) + drivingCost;
      const realPerLiter = totalCost / (selectedAmount / station.PRICE);

      const extra = `
        <p>📏 거리: ${dist.toFixed(2)} km</p>
        <p>🚗 총비용: ${Math.round(totalCost)} 원</p>
        <p>⚡ 실질 단가: ${realPerLiter.toFixed(1)} 원/L</p>
      `;
      station.domElement.innerHTML += extra;
    });
  }

  // 연료 타입 선택 이벤트
  document.getElementById('sortSelect2').addEventListener('change', (e) => {
    renderByFuelType(e.target.value);
  });

  // 금액 선택 이벤트
  document.getElementById('chargeAmountSelect').addEventListener('change', (e) => {
    const val = e.target.value;
    if (val === 'custom') {
      const input = prompt('직접 입력 (원):');
      const num = Number(input);
      if (!isNaN(num) && num > 0) selectedAmount = num;
    } else {
      selectedAmount = parseInt(val);
    }
    updateCalculations(document.getElementById('sortSelect2').value);
  });

  // 초기 휘발유 렌더링
  renderByFuelType('gasoline');
}

window.initMap = initMap;

