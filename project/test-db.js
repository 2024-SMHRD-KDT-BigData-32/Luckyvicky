const conn = require('./config/db');

conn.query('SELECT NOW()', (err, results) => {
  if (err) {
    console.error('쿼리 오류:', err);
  } else {
    console.log('현재 시간:', results[0]);
  }
  conn.end(); // 연결 종료
});
