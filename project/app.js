const express = require("express");
const path = require("path");
const session = require("express-session");
const fileStore = require("session-file-store")(session);
const bp = require("body-parser");
const nunjucks = require("nunjucks");
const mainRouter = require("./routes/mainRouter");
const userRouter = require("./routes/userRouter");
const gasRouter = require("./routes/gasRouter");
const mapRouter = require("./routes/mapRouter");
require("dotenv").config();

const app = express();

// 정적 파일 제공
app.use(express.static(path.join(__dirname, "public")));

// body-parser 설정
app.use(bp.urlencoded({ extended: true }));
app.use(express.json());

// 세션 설정
app.use(
  session({
    httpOnly: true,
    resave: false,
    secret: "secret",
    store: new fileStore(),
    saveUninitialized: false,
  })
);

// 템플릿 엔진 nunjucks 설정
app.set("view engine", "html");
nunjucks.configure("views", {
  express: app,
  watch: true,
});

// 라우터 등록
app.use("/", mainRouter);
app.use("/user", userRouter);
app.use("/api", gasRouter); // 유가 API
app.use("/map", mapRouter); // 지도 관련 API 통합

// 서버 실행
app.listen(3000, () => {
  console.log("✅ 서버 실행 중: http://localhost:3000");
});