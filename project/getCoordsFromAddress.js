import axios from 'axios';

export async function getCoordsFromAddress(address) {
  const kakaoKey = process.env.KAKAO_REST_API_KEY;

  try {
    const res = await axios.get(
      `https://dapi.kakao.com/v2/local/search/address.json?query=${encodeURIComponent(address)}`,
      {
        headers: { Authorization: kakaoKey }
      }
    );

    const doc = res.data.documents[0];
    if (doc) {
      return {
        lat: parseFloat(doc.y),
        lon: parseFloat(doc.x)
      };
    }
  } catch (error) {
    console.error("📛 주소 좌표 변환 실패:", error.message);
  }

  return null;
}
