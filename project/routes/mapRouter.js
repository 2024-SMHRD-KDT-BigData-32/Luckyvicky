const express = require("express");
const axios = require("axios");
const router = express.Router();
const { regionCodes } = require("../utils/regionCodes");
const getCoordsFromAddress = require("../utils/getCoordsFromAddress");
const proj4 = require('proj4');
const fakeData = require("../fakeGasStations"); // 더미데이터 불러오기

proj4.defs("KATEC", "+proj=tmerc +lat_0=38 +lon_0=128 +k=1 +x_0=400000 +y_0=600000 +ellps=GRS80 +units=m +no_defs");

router.get("/region", async (req, res) => {
  const { lat, lon } = req.query;

  if (!lat || !lon) {
    return res.status(400).json({ error: "위도(lat)와 경도(lon)가 필요합니다." });
  }

  try {
    const apiUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`;
    const headers = { "User-Agent": "Mozilla/5.0" };
    const response = await axios.get(apiUrl, { headers });

    const regionName = response.data.address.state || response.data.address.city;
    const regionCode = regionCodes[regionName];

    if (!regionCode) throw new Error("지역 코드 없음");

    // 여기에 원래 API 호출 로직이 들어가야 함 (지금은 생략)

    throw new Error("일부러 실패시켜서 더미로 가는 테스트");

  } catch (err) {
    console.warn("🔁 주유소 데이터 실패 → 더미 데이터 사용!");
    return res.json(fakeData);  // 🔄 fallback
  }
});

module.exports = router;



// const express = require("express");
// const router = express.Router();
// const { getRegionCode, getGasStations } = require("../utils/gasService");


// router.get("/region", async (req, res) => {
//   const { lat, lon } = req.query;

//   try {
//     const regionCode = await getRegionCode(lat, lon);
//     if (!regionCode) return res.status(404).json({ error: "지역 코드 없음" });

//     const stations = await getGasStations(regionCode);
//     res.json(stations);

//   } catch (err) {
//     console.error("🔥 /region 실패:", err.message);
//     res.status(500).json({ error: "서버 오류" });
//   }
// });

// router.get("/test", (req, res) => {
//     res.send("✅ mapRouter 연결됨");
//   });

// module.exports = router;






// const express = require("express");
// const axios = require("axios");
// const fs = require("fs");
// const path = require("path");
// const router = express.Router();
// const { regionCodes } = require("../utils/regionCodes");
// const getCoordsFromAddress = require("../utils/getCoordsFromAddress");

// const proj4 = require("proj4");

// // 📌 KATEC 정의 추가 (서버에서 최초 한 번만 선언하면 됨)
// proj4.defs(
//   "KATEC",
//   "+proj=tmerc +lat_0=38 +lon_0=128 +k=1 +x_0=400000 +y_0=600000 +ellps=GRS80 +units=m +no_defs"
// );

// // ✅ 지역 주소로 위도/경도 요청 → 좌표 변환 후 응답
// router.get("/coords", async (req, res) => {
//   const address = req.query.address;
//   try {
//     const coords = await getCoordsFromAddress(address);
//     res.json(coords);
//   } catch (err) {
//     console.error("좌표 변환 실패:", err);
//     res.status(500).json({ error: "주소 변환 실패" });
//   }
// });

// // 🔹 현재 위치 기반 최저가 주유소 10개 (가솔린+디젤)
// router.get("/region", async (req, res) => {
//   const { lat, lon } = req.query;

//   if (!lat || !lon) {
//     return res
//       .status(400)
//       .json({ error: "위도(lat)와 경도(lon)가 필요합니다." });
//   }

//   try {
//     // 1️⃣ 지역 코드 조회
//     const apiUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`;
//     const headers = { "User-Agent": "Mozilla/5.0" };
//     const response = await axios.get(apiUrl, { headers });
//     const regionName =
//       response.data.address.state || response.data.address.city;

//     const regionCode = regionCodes[regionName];
//     if (!regionCode) {
//       return res.status(404).json({ error: "지역 코드 없음" });
//     }

//     // 2️⃣ 가솔린 → 디젤 순차 호출
//     const gasUrl = `https://www.opinet.co.kr/api/lowTop10AvgPrice.do?out=json&code=F250408278&prodcd=B027&area=${regionCode}`;
//     const dieselUrl = `https://www.opinet.co.kr/api/lowTop10AvgPrice.do?out=json&code=F250408278&prodcd=D047&area=${regionCode}`;

//     const gasRes = await axios.get(gasUrl);
//     await new Promise((r) => setTimeout(r, 300)); // 딜레이 추가

//     const dieselRes = await axios.get(dieselUrl);
//     await new Promise((r) => setTimeout(r, 300)); // 딜레이 추가

//     const gasoline = gasRes.data.RESULT.OIL;
//     const diesel = dieselRes.data.RESULT.OIL;

//     // // 3️⃣ 주소 → 좌표 변환 (순차 처리 + 딜레이)
//     // for (let item of [...gasoline, ...diesel]) {
//     //   const coords = await getCoordsFromAddress(item.NEW_ADR);
//     //   item.lat = coords.lat;
//     //   item.lon = coords.lon;
//     //   await new Promise((r) => setTimeout(r, 200)); // 좌표 변환도 천천히
//     // }

//     // 좌표 변환 추가
//     for (const item of gasoline) {
//         const coords = await getCoordsFromAddress(item.NEW_ADR);
//         item.lat = coords.lat;
//         item.lon = coords.lon;
//     }
//     for (const item of diesel) {
//         const coords = await getCoordsFromAddress(item.NEW_ADR);
//         item.lat = coords.lat;
//         item.lon = coords.lon;
//     }
  

//     res.json({ gasoline, diesel });
//   } catch (err) {
//     console.error("🛑 /region 처리 실패:", err.response?.data || err.message);

//         // 📌 실패 시 더미 데이터 반환
//         const dummyPath = path.join(__dirname, "../fakeGasStations.json");
//         if (fs.existsSync(dummyPath)) {
//           const fallback = fs.readFileSync(dummyPath, "utf-8");
//           return res.json(JSON.parse(fallback));
//         }
        
//     res.status(500).json({ error: "주유소 데이터 조회 실패" });
//   }
// });

// module.exports = router;



// const express = require("express");
// const axios = require("axios");
// const router = express.Router();
// const { regionCodes } = require("../utils/regionCodes");
// const getCoordsFromAddress = require("../utils/getCoordsFromAddress");

// const proj4 = require('proj4');

// // 📌 KATEC 정의 추가 (서버에서 최초 한 번만 선언하면 됨)
// proj4.defs("KATEC", "+proj=tmerc +lat_0=38 +lon_0=128 +k=1 +x_0=400000 +y_0=600000 +ellps=GRS80 +units=m +no_defs");


// // ✅ 지역 주소로 위도/경도 요청 → 좌표 변환 후 응답
// router.get("/coords", async (req, res) => {
//     const address = req.query.address;
//     try {
//         const coords = await getCoordsFromAddress(address);
//         res.json(coords);
//     } catch (err) {
//         console.error("좌표 변환 실패:", err);
//         res.status(500).json({ error: "주소 변환 실패" });
//     }
// });

// // 🔹 현재 위치 기반 최저가 주유소 10개 (가솔린+디젤)
// router.get("/region", async (req, res) => {
//     const { lat, lon } = req.query;

//     if (!lat || !lon) {
//         return res.status(400).json({ error: "위도(lat)와 경도(lon)가 필요합니다." });
//     }

//     try {
//         // Open API 호출 - 광역시도 코드 추출
//         const apiUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`;
//         const headers = { "User-Agent": "Mozilla/5.0" };

//         const response = await axios.get(apiUrl, { headers });
//         const regionName = response.data.address.state || response.data.address.city;

//         const regionCode = regionCodes[regionName];
//         if (!regionCode) {
//             return res.status(404).json({ error: "지역 코드 없음" });
//         }

//         // 주유소 리스트 가져오기 (가솔린)
//         const gasUrl = `https://www.opinet.co.kr/api/lowTop10AvgPrice.do?out=json&code=F250408278&prodcd=B027&area=${regionCode}`;
//         const dieselUrl = `https://www.opinet.co.kr/api/lowTop10AvgPrice.do?out=json&code=F250408278&prodcd=D047&area=${regionCode}`;

//         const [gasRes, dieselRes] = await Promise.all([
//             axios.get(gasUrl),
//             axios.get(dieselUrl),
//         ]);

//         const gasoline = gasRes.data.RESULT.OIL;
//         const diesel = dieselRes.data.RESULT.OIL;

//         // 좌표 변환 추가
//         for (let item of [...gasoline, ...diesel]) {
//             const coords = await getCoordsFromAddress(item.NEW_ADR);
//             item.lat = coords.lat;
//             item.lon = coords.lon;
//         }

//         res.json({ gasoline, diesel });
//     } catch (err) {
//         console.error("🛑 /region 처리 실패:", err.response?.data || err.message);
//         res.status(500).json({ error: "주유소 데이터 조회 실패" });
//     }
// });


// module.exports = router;