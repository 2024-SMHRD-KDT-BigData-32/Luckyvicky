const express = require("express");
const router = express.Router();
const conn = require("../config/db");

// 메인 페이지 테스트용
router.get("/", (req, res) => {
    let userName = req.session.user_name || "사용자";
    res.render("main", { user_name: userName });
});

// 사용자가 로그인을 요청했을 때
router.get("/login", (req,res)=>{
    res.render("login")
})

// 마이페이지 이동
router.get("/mypage", (req,res)=>{
    res.render("mypage")
})


module.exports = router;