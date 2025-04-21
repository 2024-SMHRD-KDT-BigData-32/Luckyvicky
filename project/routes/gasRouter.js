// 대시보드 유가추이, 주요도시별 평균유가
// routes/gasRouter.js
const express = require('express');
const fetch = require('node-fetch');
// 🔁 안전하게 불러오기
// const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

const { parseStringPromise } = require('xml2js');

const router = express.Router();

const regionCodes = {
  "서울특별시": "01", "부산광역시": "02", "대구광역시": "03", "인천광역시": "04", "광주광역시": "05",
  "대전광역시": "06", "울산광역시": "07", "세종특별자치시": "08", "경기도": "09", "강원특별자치도": "10",
  "충청북도": "11", "충청남도": "12", "전라북도": "13", "전라남도": "14", "경상북도": "15", "경상남도": "16", "제주특별자치도": "17"
};

const apiKey = 'F250321198';
const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' // ⚠️ 필수!
  };

  

// 🔸 /api/data
router.get('/data', async (req, res) => {
//   const { lat, lon } = req.query;
  const areaName = "광주광역시";
  const areaCode = "05"; // 광주 코드

  try {
    const natRes = await fetch(`https://www.opinet.co.kr/api/pollAvgRecentPrice.do?out=xml&code=${apiKey}&prodcd=B027`);
    const natXml = await natRes.text();
    console.log('[전국 XML]', natXml);
    const natJson = await parseStringPromise(natXml);
    const national = natJson.RESULT.OIL;
    console.log('[national 원본]', natJson);
    
    const locRes = await fetch(`https://www.opinet.co.kr/api/areaAvgRecentPrice.do?out=xml&code=${apiKey}&area=${areaCode}`);
    const locXml = await locRes.text();
    const locJson = await parseStringPromise(locXml);
    const local = locJson.RESULT.OIL;
    console.log('[local 원본]', locJson);


    res.json({ national, local, region: areaName });
  } catch (err) {
    console.error('API /data 오류:', err);
    res.status(500).json({ error: '데이터 불러오기 실패' });
  }
});


// 🔸 /api/cities
router.get('/cities', async (req, res) => {
    const majorCities = {
      "서울특별시": "01", "부산광역시": "02", "대구광역시": "03", "인천광역시": "04", "광주광역시": "05",
      "대전광역시": "06", "울산광역시": "07", "세종특별자치시": "08", "경기도": "09"
    };
  
    const results = [];
  
    for (const [name, code] of Object.entries(majorCities)) {
      try {
        await new Promise(resolve => setTimeout(resolve, 200)); // 🔸 딜레이
        const url = `https://www.opinet.co.kr/api/avgSigunPrice.do?out=xml&sido=${code}&code=${apiKey}`;
        const xmlRes = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
          }
        });
        const xml = await xmlRes.text();
  
        const json = await parseStringPromise(xml);
        const oils = json?.RESULT?.OIL;
  
        const prices = (oils || [])
          .map(o => parseFloat(o.PRICE?.[0]))
          .filter(p => !isNaN(p));
        const avg = prices.reduce((a, b) => a + b, 0) / prices.length;
  
        results.push({ name, price: avg.toFixed(2) });
      } catch (err) {
        console.error(`[도시 API 오류] ${name}`, err);
      }
    }
  
    res.json(results);
  });
  

module.exports = router;