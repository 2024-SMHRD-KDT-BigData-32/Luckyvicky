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
