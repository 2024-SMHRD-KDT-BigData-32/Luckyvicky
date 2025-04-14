const axios = require("axios");
require("dotenv").config();

const kakaoKey = process.env.KAKAO_REST_API_KEY;

async function getCoordsFromAddress(address) {
  const url = `https://dapi.kakao.com/v2/local/search/address.json?query=${encodeURIComponent(
    address
  )}`;

  const res = await axios.get(url, {
    headers: {
      Authorization: `KakaoAK ${kakaoKey}`,
    },
  });

  if (res.data.documents.length === 0) {
    throw new Error("주소 검색 실패");
  }

  const { x, y } = res.data.documents[0].address;
  return { lat: y, lon: x };
}

module.exports = getCoordsFromAddress;