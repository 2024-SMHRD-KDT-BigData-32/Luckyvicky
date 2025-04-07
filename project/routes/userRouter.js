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
            req.session.user_id = rows[0].user_id;
            res.redirect("/")
        } else {
            console.log("로그인 실패");
            res.send("<script>alert('로그인 실패'); location.href='/login';</script>");
        }
    })
})


// 회원가입 로직
router.post("/join", (req, res) => {
  let { user_id, user_pw, user_name, user_email, user_phone } = req.body;
  let joined_at = new Date(); // 또는 NOW()

  let sql = `
      INSERT INTO tb_user (user_id, user_pw, user_name, user_email, user_phone, user_role, joined_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

  conn.query(sql, [user_id, user_pw, user_name, user_email, user_phone, "USER", joined_at], (err, result) => {
    if (err) {
      console.error("회원가입 실패:", err);
      return res.status(500).send("서버 오류");
    }
    res.send("<script>alert('회원가입 완료!'); location.href='/login';</script>");
  });
});

  // 로그아웃 로직
  router.post("/logout", (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error("세션 삭제 중 에러:", err);
            return res.status(500).send("로그아웃 중 오류 발생");
        }
        res.send("<script>alert('로그아웃되었습니다.'); location.href='/';</script>");
    });
  });
  
  // 마이페이지 (로그인된 사용자 정보 불러오기)
  router.get("/mypage", (req, res) => {
    console.log("현재 세션 user_id:", req.session.user_id);
    const userId = req.session.user_id;
    if (!userId) return res.redirect("/login");
  
    const sql = "SELECT user_id, user_name, user_email, user_phone FROM tb_user WHERE user_id = ?";
    conn.query(sql, [userId], (err, rows) => {
        if (err) {
            console.error("마이페이지 쿼리 실패:", err);
            return res.status(500).send("서버 오류");
        }
  
        if (rows.length > 0) {
            res.render("mypage", { user: rows[0] });
        } else {
            res.redirect("/login");
        }
    });
  });
  
  // 마이페이지 회원 정보 수정
  router.post("/update", (req, res) => {
    const { user_id, user_pw, user_pw_confirm, user_name, user_email, user_phone } = req.body;
  
    // 비밀번호 확인 검사
    if (user_pw && user_pw !== user_pw_confirm) {
      return res.send("<script>alert('비밀번호가 일치하지 않습니다.'); history.back();</script>");
    }
  
    const updateFields = [];
    const values = [];
  
    if (user_pw) {
      updateFields.push("user_pw = ?");
      values.push(user_pw);
    }
  
    updateFields.push("user_name = ?", "user_email = ?", "user_phone = ?");
    values.push(user_name, user_email, user_phone);
  
    const sql = `UPDATE tb_user SET ${updateFields.join(", ")} WHERE user_id = ?`;
    values.push(user_id);
  
    conn.query(sql, values, (err, result) => {
      if (err) {
        console.error("회원 정보 수정 실패:", err);
        return res.status(500).send("서버 오류");
      }
      res.send("<script>alert('회원 정보가 수정되었습니다.'); location.href='/user/mypage';</script>");
    });
  });
  
  
module.exports = router;