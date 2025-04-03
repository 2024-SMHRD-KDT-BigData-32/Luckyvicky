const express = require("express");
const router = express.Router();
const conn = require("../config/db")


// 로그인 로직
router.post("/login", (req, res) => {
    let { id, pw } = req.body;
    let sql = "select * from tb_user where user_id = ? and user_pw = ?"

    conn.query(sql, [id, pw], (err, rows) => {

        if (err) {
            console.error("쿼리 에러:", err);
            return res.status(500).send("서버 오류");
        }

        if(rows.length > 0) {
            console.log("로그인성공");
            req.session.nick = rows[0].user_name;
            req.session.email = rows[0].user_email;
            res.redirect("/")
        } else {
            console.log("로그인 실패");
            res.send("<script>alert('로그인 실패'); location.href='/login';</script>");
        }
    })
})


// 회원가입 로직
router.post("/join", (req, res) => {
    let { user_id, user_pw, user_name, user_email, user_phone, user_car_info, user_role } = req.body;
    let joined_at = new Date(); // 또는 NOW()
  
    let sql = `
      INSERT INTO tb_user (user_id, user_pw, user_name, user_email, user_phone, user_car_info, user_role, joined_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
  
    conn.query(sql, [user_id, user_pw, user_name, user_email, user_phone, user_car_info, user_role, joined_at], (err, result) => {
      if (err) {
        console.error("회원가입 실패:", err);
        return res.status(500).send("서버 오류");
      }
      res.send("<script>alert('회원가입 완료!'); location.href='/login';</script>");
    });
  });
  

module.exports = router;