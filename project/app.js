// 📦 필수 모듈 불러오기
require("dotenv").config();
const express = require("express");
const nunjucks = require("nunjucks");
const path = require("path");
const bp = require("body-parser");
const session = require("express-session");
const fileStore = require("session-file-store")(session);
const cors = require("cors");

// 📂 라우터 및 API 유틸 불러오기
const mainRouter = require("./routes/mainRouter");
const userRouter = require("./routes/userRouter");
const { getRegionCode, getGasStations } = require("./app2"); // 📌 API 함수

// 🚀 Express 앱 생성
const app = express();
const PORT = 3000;
app.use(express.static(path.join(__dirname, "public")));
// 📂 정적 파일 서비스 (HTML, JS, CSS)


// 🌍 CORS 허용
app.use(cors());

// 📩 POST 데이터 처리
app.use(bp.urlencoded({ extended: true }));

// 🔐 세션 설정
app.use(session({
  httpOnly: true,
  resave: false,
  secret: "secret",
  store: new fileStore(),
  saveUninitialized: false,
}));

// 🧭 뷰 엔진 설정 (Nunjucks + HTML)
app.set("view engine", "html");
nunjucks.configure("views", {
  express: app,
  watch: true,
});

// 📌 라우터 등록
app.use("/", mainRouter);
app.use("/user", userRouter);

// 🛰️ [GET] /region 엔드포인트 - 현재 위치(lat, lon) 기반 지역 코드 및 주유소 데이터 반환
app.get('/region', async (req, res) => {
  const { lat, lon } = req.query;

  try {
    console.log("📍 받은 좌표:", lat, lon);

    const regionCode = await getRegionCode(lat, lon);
    console.log("📦 지역 코드:", regionCode);

    const stations = await getGasStations(regionCode);
    console.log("⛽ 주유소 데이터:", stations);

    res.json(stations);
  } catch (err) {
    console.error('❌ /region 오류 발생:', err);
    res.status(500).send('Server Error');
  }
});

// 🏁 서버 시작
app.listen(PORT, () => {
  console.log(`🚀 서버 실행 중: http://localhost:${PORT}`);
});