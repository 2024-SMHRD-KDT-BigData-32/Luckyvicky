const express = require("express");
const router = express.Router();
const conn = require("../config/db");

// 메인 페이지
router.get("/", (req, res) => {
    const isLoggedIn = !!req.session.user_id;
    const car_model = req.session.car_model;
    const hasCarInfo = !!car_model;
  
    res.render("main", {
      user_name: req.session.user_name || "사용자",
      car_model: car_model || "차량 등록하기",  // 기본 이미지용
      fuel_type: req.session.fuel_type || "",
      fuel_efficiency: req.session.fuel_efficiency || "",
      isLoggedIn,
      hasCarInfo
    });
  });
  

// 사용자가 로그인을 요청했을 때
router.get("/login", (req,res)=>{
    res.render("login")
})

// 사용자가 차량 등록을 요청했을 때
router.get("/carinfo", (req,res)=>{
    res.render("carInfo")
})

  

module.exports = router;