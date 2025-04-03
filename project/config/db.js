// DB 연동 파일
const mysql = require("mysql2")

const conn = mysql.createConnection({
     host : "project-db-campus.smhrd.com",
     port : 3307,
     user : "campus_24K_BigData32_p2_4",
     password : "smhrd4",
     database : "campus_24K_BigData32_p2_4"
 })

// 연결 진행
 conn.connect();
 console.log("DB 연결 완료")
 module.exports = conn;