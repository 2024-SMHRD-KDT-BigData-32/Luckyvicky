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

    if (rows.length > 0) {
      console.log("로그인성공");
      req.session.user_id = rows[0].user_id;
      req.session.email = rows[0].user_email;
      req.session.user_name = rows[0].user_name;

      // 차량 정보도 함께 조회해서 세션에 저장
      const carSql = `
        SELECT * FROM tb_car 
        WHERE user_id = ? 
        ORDER BY car_id DESC 
        LIMIT 1
      `;
      conn.query(carSql, [rows[0].user_id], (err2, carRows) => {
        if (err2) {
          console.error("❌ 차량 정보 조회 실패:", err2);
          return res.redirect("/"); // 차량 정보 없이도 메인 진입
        }

        if (carRows.length > 0) {
          req.session.car_model = carRows[0].car_model;
          req.session.fuel_type = carRows[0].fuel_type;
          req.session.fuel_efficiency = carRows[0].fuel_efficiency;
          
          // // ✅ 확장자 구분 안 되면 jpg로 default 처리하거나, DB에 저장된 형식 그대로
          // const imageName = car_model.includes(".") ? car_model : `${car_model}.png`;  // 또는 .jpg
          // req.session.car_image = imageName;
          // console.log("✅ 차량 정보 세션 저장됨:");
          // console.log("모델명:", car_model);
          // console.log("이미지명:", imageName);
        }


        return res.redirect("/");
      });

    } else {
      console.log("로그인 실패");
      res.redirect("/login?error=login"); // 로그인 실패 시 에러 메세지 출력
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
    // res.send("<script>alert('회원가입 완료!'); location.href='/login';</script>");

    // 팝업을 띄우기 위한 쿼리 파라미터 전달
    res.redirect("/login?joined=true");
  });
});


// 로그아웃 로직
router.post("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error("세션 삭제 중 에러:", err);
      return res.status(500).send("로그아웃 중 오류 발생");
    }
    // 쿼리 파라미터로 메시지 전달
    res.redirect('/?logout=1');
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

    // 로그인 시, 마이페이지 이동
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




// 차량 정보 등록 라우터
router.post("/carinfo", (req, res) => {

  console.log("💬 차량 등록 요청 시 user_id:", req.session.user_id);
  console.log("💬 요청 바디:", req.body);
  // 1. 로그인 안 되어 있으면 차단
  // if (!req.session.user_id) {
  //   return res.send("<script>alert('로그인이 필요합니다'); location.href='/login';</script>");
  // }

  // 2. 세션에서 user_id 추출
  const user_id = req.session.user_id;
  // const { car_model, fuel_type, fuel_efficiency } = req.body;
  const { car_model, fuel_type } = req.body;

  const carEfficiencies = {
    Avante: 14.9,
    Sorento: 11.8,
    Grandeur: 9.8,
    Sonata: 10.5,
    SantaFe: 12.3,
    Tucson: 12.5,
    Carnival: 11.0,
    Palisade: 12.2,
    K3: 14.7,
    K5: 13.4,
    K7: 11.8,
    K8: 11.7,
    Sportage: 12.2,
    G70: 10.0,
    G80: 9.4,
    G90: 8.7,
    GV70: 9.4,
    GV80: 8.5,
    Morning: 15.1,
    Ray: 12.8
  };

  const fuel_efficiency = carEfficiencies[car_model] || 10.0; 

  const sql = `
      INSERT INTO tb_car (user_id, car_model, fuel_type, fuel_efficiency)
      VALUES (?, ?, ?, ?)
    `;

  conn.query(sql, [user_id, car_model, fuel_type, fuel_efficiency], (err, result) => {
    if (err) {
      console.error("차량 정보 저장 실패:", err);
      return res.status(500).send("DB 오류");
    }


    // 💡 세션 갱신 (자동 반영)
    req.session.car_model = car_model;
    req.session.fuel_type = fuel_type;
    req.session.fuel_efficiency = fuel_efficiency;

    // res.send("<script>alert('차량 정보 등록 완료!'); location.href='/';</script>");
    console.log("✅ 차량 정보 저장 완료");
    return res.json({ success: true });

  });
});


// 📦 주유 기록 전체 조회
router.get('/fuel/records', async (req, res) => {
  const userId = req.session.user_id;
  if (!userId) return res.status(401).json({ success: false, message: '로그인 필요' });

  try {
    const [records] = await conn.promise().query(
      'SELECT date, station, price, efficiency FROM fuel_records WHERE user_id = ? ORDER BY date ASC',
      [userId]
    );
    res.json({ success: true, records });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'DB 조회 오류' });
  }
});

// 📥 주유 기록 저장
router.post('/fuel/save', async (req, res) => {
  const userId = req.session.user_id;
  const { date, station, price, efficiency } = req.body;
  if (!userId) return res.status(401).json({ success: false, message: '로그인 필요' });

  try {
    await conn.promise().query(
      'INSERT INTO fuel_records (user_id, date, station, price, efficiency) VALUES (?, ?, ?, ?, ?)',
      [userId, date, station, price, efficiency]
    );
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'DB 저장 오류' });
  }
});

// 🗑️ 주유 기록 삭제
router.post('/fuel/delete', async (req, res) => {
  const userId = req.session.user_id;
  const { date, station, price } = req.body;
  if (!userId) return res.status(401).json({ success: false, message: '로그인 필요' });

  try {
    await conn.promise().query(
      'DELETE FROM fuel_records WHERE user_id = ? AND date = ? AND station = ? AND price = ?',
      [userId, date, station, price]
    );
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'DB 삭제 오류' });
  }
});


// 세션 테스트용

// 로그인 체크
router.get("/check", (req, res) => {
  // res.send(`현재 세션 user_id: ${req.session.user_id}`);

  // 로그인이 되어 있는지를 확인하는 영역

  // 최종적으로 결과값을 반환해주는 영역
  return res.status(200).json({
    user_id : req.session.user_id,
    isLoggedIn : true
  });
});


module.exports = router;