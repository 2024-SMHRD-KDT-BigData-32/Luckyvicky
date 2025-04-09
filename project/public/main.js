// 통합 main.js (차계부 + 대시보드 기능 통합 스크립트)

let selectedDate = null;
let selectedEvent = null;
let records = [];
let calendar = null;  // 캘린더 전역 선언
let fuelChart, monthlyChart;

// 📅 캘린더 초기화
function initCalendar() {
  const calendarEl = document.getElementById("calendar");
  if (!calendarEl) return;

  calendar = new FullCalendar.Calendar(calendarEl, {
    initialView: "dayGridMonth",
    // height: "100%",
    height: 'auto',
    fixedWeekCount: false,
    timeZone: 'local',

    dateClick(info) {
      // 날짜 객체 → YYYY-MM-DD 포맷으로 변환 (UTC 밀림 방지)
      const date = new Date(info.date);
      const year = date.getFullYear();
      const month = (date.getMonth() + 1).toString().padStart(2, "0");
      const day = date.getDate().toString().padStart(2, "0");
      selectedDate = `${year}-${month}-${day}`;
      selectedEvent = null;
      openModal();
    },
    eventClick(info) {
      selectedEvent = info.event;
      selectedDate = selectedEvent.startStr;
      const { station, price, efficiency } = selectedEvent.extendedProps;
      document.getElementById("station").value = station || "";
      document.getElementById("price").value = price || "";
      document.getElementById("efficiency").value = efficiency || "";
      openModal();
    },
    eventContent: function(arg) {
      const station = arg.event.extendedProps.station;
      const price = arg.event.extendedProps.price;

      const stationEl = document.createElement("div");
      stationEl.textContent = station;
      stationEl.style.fontWeight = "bold";
      stationEl.style.fontSize = "0.7em";
      stationEl.style.fontWeight = "600";
      stationEl.style.color = "#333";

      const priceEl = document.createElement("div");
      priceEl.textContent = `₩${Number(price).toLocaleString()}`;
      priceEl.style.fontSize = "0.5em";
      priceEl.style.color = "#333";

      return { domNodes: [stationEl, priceEl] };
    }
  });

  calendar.render();

  window.saveRecord = function () {
    const station = document.getElementById("station").value.trim();
    const price = +document.getElementById("price").value;
    const efficiency = +document.getElementById("efficiency").value;

    if (!station || !price || !efficiency) return alert("모든 값을 입력해주세요.");

    if (selectedEvent) {
      selectedEvent.setProp("title", `\u20A9${price}`);
      selectedEvent.setExtendedProp("station", station);
      selectedEvent.setExtendedProp("price", price);
      selectedEvent.setExtendedProp("efficiency", efficiency);
    } else {
      calendar.addEvent({
        title: `\u20A9${price}`,
        start: selectedDate,
        allDay: true,
        extendedProps: { station, price, efficiency }
      });
    }

    axios.post("/user/fuel/save", {
      date: selectedDate,
      station,
      price,
      efficiency
    }, {
      withCredentials: true
    }).then(res => {
      if (res.data.success) {
        fetchRecords();
        closeModal();
      } else {
        alert("저장 실패");
      }
    }).catch(err => {
      console.error(err);
      alert("서버 오류 발생");
    });
  };

  window.deleteRecord = function () {
    if (!selectedEvent) return;

    const { station, price } = selectedEvent.extendedProps;
    axios.post("/user/fuel/delete", {
      date: selectedDate,
      station,
      price
    }).then(res => {
      if (res.data.success) {
        selectedEvent.remove();
        fetchRecords();
        closeModal();
      } else {
        alert("삭제 실패");
      }
    }).catch(err => {
      console.error(err);
      alert("서버 오류 발생");
    });
  };

  window.openModal = () => document.getElementById("recordModal").style.display = "block";
  window.closeFuelModal = () => {
    document.getElementById("recordModal").style.display = "none";
    selectedEvent = null;
    ["station", "price", "efficiency"].forEach(id => document.getElementById(id).value = "");
  };
}

// 📊 기록 불러오기 + 대시보드 갱신
function fetchRecords() {
  axios.get("/user/fuel/records", {
    withCredentials: true
  })
    .then(res => {
      if (res.data.success) {
        records = res.data.records;

        if (calendar) {
          calendar.getEvents().forEach(event => event.remove());

          records.forEach(r => {
            calendar.addEvent({
              title: `${r.station} \n ₩${Number(r.price).toLocaleString()}`,
              // start: r.date.split('T')[0],
              start: r.date,
              allDay: true,
              extendedProps: {
                station: r.station,
                price: r.price,
                efficiency: r.efficiency
              }
            });
          });
        }

        updateDashboardStats();
        updateCharts();
      }
    })
    .catch(err => console.error("기록 불러오기 실패", err));
}

// 📈 대시보드 정보 계산
function updateDashboardStats() {
  if (!records.length) return;

  const efficiencies = records.map(r => r.efficiency);
  const avgEfficiency = (efficiencies.reduce((a, b) => a + b, 0) / efficiencies.length).toFixed(1);
  document.getElementById("myAvgEfficiencyCard").textContent = `${avgEfficiency} km/L`;

  const dates = records.map(r => new Date(r.date)).sort((a, b) => a - b);
  const intervals = dates.slice(1).map((d, i) => (d - dates[i]) / (1000 * 60 * 60 * 24));
  const avgInterval = intervals.length ? (intervals.reduce((a, b) => a + b, 0) / intervals.length).toFixed(1) : "-";
  document.getElementById("avgIntervalCard").textContent = avgInterval !== "-" ? `${avgInterval}일` : "-";

  const lastRecord = [...records].sort((a, b) => new Date(b.date) - new Date(a.date))[0];
  const lastDate = new Date(lastRecord.date).toLocaleDateString("ko-KR");
  document.getElementById("lastRefuelDateCard").textContent = lastDate;
  document.getElementById("lastRefuelPrice").textContent = `${lastRecord.price.toLocaleString()}원`;
}

// 📈 차계부 차트 계산
function updateCharts() {
  const thisMonth = new Date().toISOString().slice(0, 7);
  const monthlyRecords = records.filter(r => r.date.startsWith(thisMonth));

  const labels = monthlyRecords.map(r => r.date);
  const prices = monthlyRecords.map(r => r.price);
  const efficiencies = monthlyRecords.map(r => r.efficiency);

  fuelChart.data.labels = labels;
  fuelChart.data.datasets[0].data = prices;
  fuelChart.data.datasets[1].data = efficiencies;
  fuelChart.update();

  const total = prices.reduce((a, b) => a + b, 0);
  const avg = efficiencies.length
    ? (efficiencies.reduce((a, b) => a + b, 0) / efficiencies.length).toFixed(1)
    : 0;

  document.getElementById("monthSummary").textContent =
    `이번달 주유금액: ${total.toLocaleString()}원`;
  document.getElementById("avgSummary").textContent =
    `이번달 평균 연비: ${avg}km/L`;

  // ✅ 월별 평균 계산
  const monthMap = {}; // { "04": [50000, 60000], ... }
  records.forEach(r => {
    const m = r.date.slice(0, 7);  // "04", "05" 같은 형식으로
    if (!monthMap[m]) monthMap[m] = [];
    monthMap[m].push(r.price);
  });

  const keys = Object.keys(monthMap).sort().slice(-6); // 최근 6개월
  const values = keys.map(k => {
    const arr = monthMap[k];
    return Math.round(arr.reduce((a, b) => a + b, 0) / arr.length); // 평균
  });

  // fuelChart 업데이트
  monthlyChart.data.labels = keys;
  monthlyChart.data.datasets[0].data = values;
  monthlyChart.update();

  // monthlyFuelLineChart 업데이트
monthlyFuelLineChart.data.labels = labels;
monthlyFuelLineChart.data.datasets[0].data = prices;
monthlyFuelLineChart.data.datasets[1].data = efficiencies;
monthlyFuelLineChart.update();

  const avgMonth = values.length
    ? Math.round(values.reduce((a, b) => a + b, 0) / values.length)
    : 0;

  document.getElementById("monthlyAvgCaption").textContent =
    `2025년 월별 평균 주유금액: ${avgMonth.toLocaleString()}원`;

    // 🔻 이번달 vs 저번달 비교 텍스트
  const now = new Date();
  const currentMonthStr = now.toISOString().slice(0, 7); // e.g., "2025-04"
  const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const previousMonthStr = prevMonthDate.toISOString().slice(0, 7); // e.g., "2025-03"

  const currentValue = monthMap[currentMonthStr]
    ? Math.round(monthMap[currentMonthStr].reduce((a, b) => a + b, 0) / monthMap[currentMonthStr].length)
    : 0;
  const previousValue = monthMap[previousMonthStr]
    ? Math.round(monthMap[previousMonthStr].reduce((a, b) => a + b, 0) / monthMap[previousMonthStr].length)
    : 0;

  const diff = currentValue - previousValue;
  const comparisonEl = document.getElementById("monthlyComparison");

  if (comparisonEl) {
    if (diff > 0) {
      comparisonEl.innerHTML = `🔺 이번달은 저번달보다 <strong>${diff.toLocaleString()}원</strong> 더 썼어요.`;
    } else if (diff < 0) {
      comparisonEl.innerHTML = `🔻 이번달은 저번달보다 <strong>${Math.abs(diff).toLocaleString()}원</strong> 덜 썼어요.`;
    } else if (currentValue !== 0) {
      comparisonEl.innerHTML = `➖ 이번달과 저번달 지출이 같아요.`;
    } else {
      comparisonEl.innerHTML = `ℹ️ 비교할 주유 데이터가 부족해요.`;
    }
  }
}



// 🔁 초기화
window.addEventListener("DOMContentLoaded", () => {
  initCalendar();

  fuelChart = new Chart(document.getElementById('fuelChart'), {
    type: 'bar',
    data: {
      labels: [], // 날짜 문자열
      datasets: [
        {
          label: '주유 금액',
          data: [],
          backgroundColor: '#4ea9ff',
          yAxisID: 'y',
          order: 2
        },
        {
          // label: '연비 (km/L)',
          // data: [],
          // type: 'line',
          // borderColor: '#ff9933',
          // backgroundColor: 'rgba(255,153,51,0.2)',
          // yAxisID: 'y1',
          // order: 1  // ✅ 꺾은선 그래프 위에
          label: '연비 (km/L)',
          data: [],
          type: 'line',
          borderColor: '#ff9933',
          backgroundColor: 'transparent', // ✅ 배경 제거
          pointBackgroundColor: '#ff9933',
          tension: 0.3,
          yAxisID: 'y1',
          order: 1,
          fill: false, // ✅ 채우기 없음
          borderWidth: 2 // ✅ 선 두께 조절
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          ticks: {
            callback: function(value, index, ticks) {
              const rawLabel = this.getLabelForValue(value);
              const date = new Date(rawLabel);
              const month = (date.getMonth() + 1).toString().padStart(2, '0');
              const day = date.getDate().toString().padStart(2, '0');
              return `${month}/${day}`;
            }
          }
        },
        y: {
          beginAtZero: true,
          ticks: {
            callback: v => '₩' + v
          }
        },
        y1: {
          position: 'right',
          beginAtZero: true,
          grid: { drawOnChartArea: false },
          ticks: { callback: v => v + 'km/L' }
        }
      }
    }
  });
  

  monthlyChart = new Chart(document.getElementById('monthlyChart'), {
    type: 'bar',
    data: {
      labels: [],
      datasets: [{
        label: '월별 평균 주유 금액',
        data: [],
        backgroundColor: '#6190e8'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false // 범례 제거
        }
      },
      scales: {
        x: {
          ticks: {
            callback: function(value) {
              const raw = this.getLabelForValue(value);  // "2025-04"
              const [year, month] = raw.split("-");
              return `${parseInt(month)}월`;  // → "4월"
            }
          }
        },
        y: {
          beginAtZero: true,
          ticks: {
            callback: v => '₩' + v.toLocaleString()
          }
        }
      }
    }
  });

  // 대시보드 그래프
  monthlyFuelLineChart = new Chart(document.getElementById('monthlyFuelLineChart'), {
    type: 'bar',
    data: {
      labels: [],
      datasets: [
        {
          label: '주유 금액',
          data: [],
          backgroundColor: '#4ea9ff',
          yAxisID: 'y',
          order: 2
        },
        {
          label: '연비 (km/L)',
          data: [],
          type: 'line',
          borderColor: '#ff9933',
          backgroundColor: 'transparent',
          pointBackgroundColor: '#ff9933',
          tension: 0.3,
          yAxisID: 'y1',
          order: 1,
          fill: false,
          borderWidth: 2
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          ticks: {
            callback: function(value) {
              const rawLabel = this.getLabelForValue(value);
              const date = new Date(rawLabel);
              const month = (date.getMonth() + 1).toString().padStart(2, '0');
              const day = date.getDate().toString().padStart(2, '0');
              return `${month}/${day}`;
            }
          }
        },
        y: {
          beginAtZero: true,
          ticks: {
            callback: v => '₩' + v
          }
        },
        y1: {
          position: 'right',
          beginAtZero: true,
          grid: { drawOnChartArea: false },
          ticks: {
            callback: v => v + 'km/L'
          }
        }
      }
    }
  });
  

  fetchRecords();
});






// // 기존 main.js (차계부 + 대시보드 기능 통합 스크립트) 

// let selectedDate = null;
// let selectedEvent = null;
// let records = [];
// let calendar = null;  // 캘린더 전역 선언


// // 📅 캘린더 초기화
// function initCalendar() {
//   const calendarEl = document.getElementById("calendar");
//   if (!calendarEl) return;

//   calendar = new FullCalendar.Calendar(calendarEl, {
//     initialView: "dayGridMonth",
//     height: "100%",
//     dateClick(info) {
//       selectedDate = info.dateStr;
//       selectedEvent = null;
//       openModal();
//     },
//     eventClick(info) {
//       selectedEvent = info.event;
//       selectedDate = selectedEvent.startStr;
//       const { station, price, efficiency } = selectedEvent.extendedProps;
//       document.getElementById("station").value = station || "";
//       document.getElementById("price").value = price || "";
//       document.getElementById("efficiency").value = efficiency || "";
//       openModal();
//     },
//     eventContent: function(arg) {
//       const station = arg.event.extendedProps.station;
//       const price = arg.event.extendedProps.price;

//       // const wrapper = document.createElement("div");
//       // wrapper.style.backgroundColor = "#f2f2f2";       // 배경색 변경
//       // wrapper.style.padding = "2px 4px";               // 내부 여백
//       // wrapper.style.borderRadius = "5px";              // 둥근 테두리
//       // wrapper.style.boxShadow = "0 0 2px rgba(0,0,0,0.1)";
//       // wrapper.style.border = "1px solid #ccc";         // 경계선
//       // wrapper.style.fontSize = "12px";                 // 전체 폰트 크기
//       // wrapper.style.color = "#333";                    // 글자색
  
//       const stationEl = document.createElement("div");
//       stationEl.textContent = station;
//       stationEl.style.fontWeight = "bold";
//       stationEl.style.fontSize = "0.7em";  // 💡 작게
//       stationEl.style.fontWeight = "600";
//       stationEl.style.color = "#333";  // 글자색 조절
  
//       const priceEl = document.createElement("div");
//       priceEl.textContent = `₩${Number(price).toLocaleString()}`;
//       priceEl.style.fontSize = "0.5em";
//       priceEl.style.color = "#333";
  
//       return { domNodes: [stationEl, priceEl] };
//     }
//   });
  

//   calendar.render();

//   window.saveRecord = function () {
//     const station = document.getElementById("station").value.trim();
//     const price = +document.getElementById("price").value;
//     const efficiency = +document.getElementById("efficiency").value;

//     if (!station || !price || !efficiency) return alert("모든 값을 입력해주세요.");

//     if (selectedEvent) {
//       selectedEvent.setProp("title", `\u20A9${price}`);
//       selectedEvent.setExtendedProp("station", station);
//       selectedEvent.setExtendedProp("price", price);
//       selectedEvent.setExtendedProp("efficiency", efficiency);
//     } else {
//       calendar.addEvent({
//         title: `\u20A9${price}`,
//         start: selectedDate,
//         extendedProps: { station, price, efficiency }
//       });
//     }

//     // 👉 서버로 저장 요청
//     axios.post("/user/fuel/save", {
//       date: selectedDate,
//       station,
//       price,
//       efficiency
//     }, {
//       withCredentials: true  // 👈 세션 쿠키 전달!
//     }).then(res => {
//       if (res.data.success) {
//         fetchRecords();
//         closeModal();
//       } else {
//         alert("저장 실패");
//       }
//     }).catch(err => {
//       console.error(err);
//       alert("서버 오류 발생");
//     });
//   };

//   window.deleteRecord = function () {
//     if (!selectedEvent) return;

//     const { station, price } = selectedEvent.extendedProps;
//     axios.post("/user/fuel/delete", {
//       date: selectedDate,
//       station,
//       price
//     }).then(res => {
//       if (res.data.success) {
//         selectedEvent.remove();
//         fetchRecords();
//         closeModal();
//       } else {
//         alert("삭제 실패");
//       }
//     }).catch(err => {
//       console.error(err);
//       alert("서버 오류 발생");
//     });
//   };

//   window.openModal = () => document.getElementById("recordModal").style.display = "block";
//   window.closeFuelModal = () => {
//     document.getElementById("recordModal").style.display = "none";
//     selectedEvent = null;
//     ["station", "price", "efficiency"].forEach(id => document.getElementById(id).value = "");
//   };
// }

// // 📊 기록 불러오기 + 대시보드 갱신
// function fetchRecords() {
//   axios.get("/user/fuel/records", {
//     withCredentials: true
//   })
//     .then(res => {
//       if (res.data.success) {
//         records = res.data.records;

//         if (calendar) {
//           // 1. 기존 이벤트 제거
//           calendar.getEvents().forEach(event => event.remove());

//           // 2. 새 이벤트 등록
//           records.forEach(r => {
//             calendar.addEvent({
//               title: `${r.station} \n ₩${Number(r.price).toLocaleString()}`,
//               start: r.date.split('T')[0],
//               extendedProps: {
//                 station: r.station,
//                 price: r.price,
//                 efficiency: r.efficiency
//               }
//             });
//           });
//         }

//         updateDashboardStats();
//       }
//     })
//     .catch(err => console.error("기록 불러오기 실패", err));
// }



// // 📈 대시보드 정보 계산
// function updateDashboardStats() {
//   if (!records.length) return;

//   const efficiencies = records.map(r => r.efficiency);
//   const avgEfficiency = (efficiencies.reduce((a, b) => a + b, 0) / efficiencies.length).toFixed(1);
//   document.getElementById("myAvgEfficiencyCard").textContent = `${avgEfficiency} km/L`;

//   const dates = records.map(r => new Date(r.date)).sort((a, b) => a - b);
//   const intervals = dates.slice(1).map((d, i) => (d - dates[i]) / (1000 * 60 * 60 * 24));
//   const avgInterval = intervals.length ? (intervals.reduce((a, b) => a + b, 0) / intervals.length).toFixed(1) : "-";
//   document.getElementById("avgIntervalCard").textContent = avgInterval !== "-" ? `${avgInterval}일` : "-";

//   const lastRecord = [...records].sort((a, b) => new Date(b.date) - new Date(a.date))[0];
//   const lastDate = new Date(lastRecord.date).toLocaleDateString("ko-KR");
//   document.getElementById("lastRefuelDateCard").textContent = lastDate;
//   document.getElementById("lastRefuelPrice").textContent = `\u20A9${lastRecord.price.toLocaleString()}`;
// }

// // 🔁 초기화
// window.addEventListener("DOMContentLoaded", () => {
//   initCalendar();
//   fetchRecords();
// });