const express = require("express");
const router = express.Router();
const conn = require("../config/db");

// 메인 페이지 테스트용
router.get("/", (req, res) => {
    res.render("main");
});

// 사용자가 로그인을 요청했을 때
router.get("/login", (req,res)=>{
    res.render("login")
})


module.exports = router;