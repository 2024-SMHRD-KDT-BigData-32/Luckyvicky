// 통합 main.js (차계부 + 대시보드 기능 통합 스크립트)

let selectedDate = null;
let selectedEvent = null;
let records = [];
let calendar = null;  // 캘린더 전역 선언
let fuelChart, monthlyChart;

//로그아웃 토스트
const urlParams = new URLSearchParams(window.location.search);
if (urlParams.get('logout') === '1') {
  showToast('로그아웃되었습니다.');
  // 주소에서 ?logout=1 제거 (히스토리만 조작)
  history.replaceState({}, null, location.pathname);
}

// 숫자 카운트업 애니메이션 함수
function countUp(element, start, end, duration) {
  let startTime = null;
  const step = (timestamp) => {
    if (!startTime) startTime = timestamp;
    const progress = Math.min((timestamp - startTime) / duration, 1);
    const value = Math.floor(progress * (end - start) + start);
    element.textContent = value;
    if (progress < 1) {
      requestAnimationFrame(step);
    }
  };
  requestAnimationFrame(step);
}

// 📅 캘린더 초기화
function initCalendar() {
  const calendarEl = document.getElementById("calendar");
  if (!calendarEl) return;

  calendar = new FullCalendar.Calendar(calendarEl, {
    initialView: "dayGridMonth",
    height: 'auto',
    fixedWeekCount: false,
    timeZone: 'local',

    dateClick(info) {
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
      stationEl.style.backgroundColor = "transparent";
      stationEl.style.color = "#000";
      stationEl.style.fontWeight = "bold";
      stationEl.style.fontSize = "1.1em";

      const priceEl = document.createElement("div");
      priceEl.textContent = `₩${Number(price).toLocaleString()}`;
      priceEl.style.backgroundColor = "transparent";
      priceEl.style.color = "#000";
      priceEl.style.fontWeight = "bold";
      priceEl.style.fontSize = "1.1em";

      return { domNodes: [stationEl, priceEl] };
    }
  });

  calendar.render();

  window.saveRecord = async function () {
    // ✅ 로그인 상태 확인
    const isLoggedIn = await checkLoginStatus();
    console.log("isLoggedIn", isLoggedIn);
    if (!isLoggedIn) {
      showToast("로그인을 해주세요");
      return;
    }

    const station = document.getElementById("station").value.trim();
    const price = +document.getElementById("price").value;
    const efficiency = +document.getElementById("efficiency").value;

    if (!station || !price || !efficiency) {
      showToast("모든 값을 입력해주세요.");
      return;
    }

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
        evaluateFuelEfficiencyWithGrok();
        closeModal();
      } else {
        showToast("저장 실패");
      }
    }).catch(err => {
      console.error(err);
      showToast("저장에 실패했습니다");
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
        evaluateFuelEfficiencyWithGrok();
        closeModal();
      } else {
        showToast("삭제 실패");
      }
    }).catch(err => {
      console.error(err);
      showToast("삭제에 실패했습니다");
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
        evaluateFuelEfficiencyWithGrok();
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

// 로그인 상태 확인 함수
async function checkLoginStatus() {
  try {
    const response = await axios.get("/user/check", { withCredentials: true });
    console.log(response);
    return response.data.isLoggedIn; // 서버에서 { isLoggedIn: true/false } 반환 가정
  } catch (error) {
    console.error("로그인 상태 확인 실패:", error);
    return false; // 에러 발생 시 로그인되지 않은 것으로 간주
  }
}

function showToast(message) {
  const toast = document.getElementById("toast") || document.createElement("div");
  if (!toast.id) {
    toast.id = "toast";
    toast.className = "toast";
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.classList.add("show");
  setTimeout(() => {
    toast.classList.remove("show");
  }, 3000);
}

// 📈 차계부 차트 계산
function updateCharts() {
  const thisMonth = new Date().toISOString().slice(0, 7); // 이번 달 (예: "2025-04")
  const monthlyRecords = records
    .filter(r => {
      const recordMonth = r.date.slice(0, 7);
      return recordMonth === thisMonth;
    })
    .sort((a, b) => a.date.localeCompare(b.date));
  // const labels = monthlyRecords.map(r => r.date.slice(0, 10));
  const labels = monthlyRecords.map(r => {
    const date = new Date(r.date);
    date.setDate(date.getDate()); // 하루 보정
    const month = (date.getMonth()+1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${month}/${day}`;
  });
  
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

  // ✅ 월별 평균 계산 (이번 달 제외)
  const monthMap = {};   // "2025-04": [50000, 60000, ...]
  const sumMap = {};     // 총액
  const avgMap = {};     // 평균

  records.forEach(r => {
    const m = r.date.slice(0, 7);
    if (m === thisMonth) return; // 이번 달은 제외
    if (!monthMap[m]) monthMap[m] = [];
    monthMap[m].push(r.price);
  });

  const keys = Object.keys(monthMap).sort().slice(-6); // 최근 6개월 (이번 달 제외)
  const totalValues = keys.map(k => {
    const sum = monthMap[k].reduce((a, b) => a + b, 0);
    const avg = Math.round(sum / monthMap[k].length);
    sumMap[k] = sum;
    avgMap[k] = avg;
    return sum; // ✅ 막대그래프는 총합
  });

  // ⛳ 그래프 반영
  monthlyChart.data.labels = keys;
  monthlyChart.data.datasets[0].data = totalValues;

  // ✅ 평균을 툴팁으로 보여줌
  monthlyChart.options.plugins.tooltip = {
    callbacks: {
      label: function (context) {
        const key = context.label; // e.g., "2025-04"
        const total = sumMap[key] || 0;
        const avg = avgMap[key] || 0;
        return [
          `총 주유 금액: ${total.toLocaleString()}원`,
          `평균 주유 금액: ${avg.toLocaleString()}원`
        ];
      }
    }
  };

  monthlyChart.update();

  // ✅ 선형 차트도 반영
 monthlyFuelLineChart.data.labels = labels;
  monthlyFuelLineChart.data.datasets[0].data = prices;
  monthlyFuelLineChart.data.datasets[1].data = efficiencies;
  monthlyFuelLineChart.update();

  // ✅ 월별 평균 표시 텍스트 (이번 달 제외)
  const avgMonth = totalValues.length
    ? Math.round(totalValues.reduce((a, b) => a + b, 0) / totalValues.length)
    : 0;

  document.getElementById("monthlyAvgCaption").textContent =
    `2025년 월별 평균 주유금액 (이번 달 제외): ${avgMonth.toLocaleString()}원`;

  // ✅ 이번달 vs 저번달 비교 문구
  const now = new Date();
  const year = now.getFullYear();
  const month = (now.getMonth() + 1).toString().padStart(2, "0");
  const currentMonthStr = `${year}-${month}`;

  const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevYear = prevDate.getFullYear();
  const prevMonth = (prevDate.getMonth() + 1).toString().padStart(2, "0");
  const previousMonthStr = `${prevYear}-${prevMonth}`;

  const currentMonthRecords = records.filter(r => r.date.slice(0, 7) === thisMonth);
  const currentValue = currentMonthRecords.length
    ? currentMonthRecords.reduce((a, b) => a + b.price, 0)
    : 0;

  const previousValue = sumMap[previousMonthStr] || 0;
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

  // const now = new Date();
  // const currentMonthStr = now.toISOString().slice(0, 7);
  // const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  // const previousMonthStr = prevMonthDate.toISOString().slice(0, 7);

  // const currentValue = sumMap[currentMonthStr] || 0;
  // const previousValue = sumMap[previousMonthStr] || 0;
  // const diff = currentValue - previousValue;

  // const comparisonEl = document.getElementById("monthlyComparison");

  // if (comparisonEl) {
  //   if (diff > 0) {
  //     comparisonEl.innerHTML = `🔺 이번달은 저번달보다 <strong>${diff.toLocaleString()}원</strong> 더 썼어요.`;
  //   } else if (diff < 0) {
  //     comparisonEl.innerHTML = `🔻 이번달은 저번달보다 <strong>${Math.abs(diff).toLocaleString()}원</strong> 덜 썼어요.`;
  //   } else if (currentValue !== 0) {
  //     comparisonEl.innerHTML = `➖ 이번달과 저번달 지출이 같아요.`;
  //   } else {
  //     comparisonEl.innerHTML = `ℹ️ 비교할 주유 데이터가 부족해요.`;
  //   }
  // }

  // ✅ 월별 평균 계산
  // const monthMap = {}; // { "04": [50000, 60000], ... }

  // records.forEach(r => {
  //   const m = r.date.slice(0, 7);  // "04", "05" 같은 형식으로
  //   if (!monthMap[m]) monthMap[m] = [];
  //   monthMap[m].push(r.price);
  // });

  // const keys = Object.keys(monthMap).sort().slice(-6); // 최근 6개월
  // const values = keys.map(k => {
  //   const arr = monthMap[k];
  //   return Math.round(arr.reduce((a, b) => a + b, 0) / arr.length); // 평균
  // });

  // // fuelChart 업데이트
  // monthlyChart.data.labels = keys;
  // monthlyChart.data.datasets[0].data = values;
  // monthlyChart.update();

  // // monthlyFuelLineChart 업데이트
  // monthlyFuelLineChart.data.labels = labels;
  // monthlyFuelLineChart.data.datasets[0].data = prices;
  // monthlyFuelLineChart.data.datasets[1].data = efficiencies;
  // monthlyFuelLineChart.update();

  // const avgMonth = values.length
  //   ? Math.round(values.reduce((a, b) => a + b, 0) / values.length)
  //   : 0;

  // document.getElementById("monthlyAvgCaption").textContent =
  //   `2025년 월별 평균 주유금액: ${avgMonth.toLocaleString()}원`;

  //   // 🔻 이번달 vs 저번달 비교 텍스트
  // const now = new Date();
  // const currentMonthStr = now.toISOString().slice(0, 7); // e.g., "2025-04"
  // const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  // const previousMonthStr = prevMonthDate.toISOString().slice(0, 7); // e.g., "2025-03"

  // const currentValue = monthMap[currentMonthStr]
  //   ? Math.round(monthMap[currentMonthStr].reduce((a, b) => a + b, 0) / monthMap[currentMonthStr].length)
  //   : 0;
  // const previousValue = monthMap[previousMonthStr]
  //   ? Math.round(monthMap[previousMonthStr].reduce((a, b) => a + b, 0) / monthMap[previousMonthStr].length)
  //   : 0;

  // const diff = currentValue - previousValue;
  // const comparisonEl = document.getElementById("monthlyComparison");

  // if (comparisonEl) {
  //   if (diff > 0) {
  //     comparisonEl.innerHTML = `🔺 이번달은 저번달보다 <strong>${diff.toLocaleString()}원</strong> 더 썼어요.`;
  //   } else if (diff < 0) {
  //     comparisonEl.innerHTML = `🔻 이번달은 저번달보다 <strong>${Math.abs(diff).toLocaleString()}원</strong> 덜 썼어요.`;
  //   } else if (currentValue !== 0) {
  //     comparisonEl.innerHTML = `➖ 이번달과 저번달 지출이 같아요.`;
  //   } else {
  //     comparisonEl.innerHTML = `ℹ️ 비교할 주유 데이터가 부족해요.`;
  //   }
  // }
}

function generateDataHash(data) {
  const str = JSON.stringify({
    carModel: data.carModel,
    avgEfficiency: data.avgEfficiency,
    avgInterval: data.avgInterval,
    monthlyAvg: data.monthlyAvg,
    records: data.records
  });
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return hash;
}

async function evaluateFuelEfficiencyWithGrok() {
  const carModel = document.getElementById("carModel").textContent.trim();
  const avgEfficiency = parseFloat(document.getElementById("myAvgEfficiencyCard").textContent) || 0;
  const avgInterval = parseFloat(document.getElementById("avgIntervalCard").textContent) || 0;
  const monthlyAvgText = document.getElementById("monthlyAvgCaption").textContent;
  const monthlyAvgMatch = monthlyAvgText.match(/(\d{1,3}(?:,\d{3})*)\원/);
  const monthlyAvg = monthlyAvgMatch ? parseFloat(monthlyAvgMatch[1].replace(/,/g, "")) : 0;

  const userData = {
    carModel,
    avgEfficiency,
    avgInterval,
    monthlyAvg,
    records: records.map(r => ({
      date: r.date,
      price: r.price,
      efficiency: r.efficiency,
      station: r.station
    }))
  };

  try {
    const grokResponse = await simulateGrokEvaluation(userData);
    const { score, comments } = grokResponse;

    // 점수 카운트업 애니메이션
    const scoreElement = document.getElementById("fuelScore");
    countUp(scoreElement, 0, score, 2000); // 2초 동안 카운트업

    document.getElementById("commentCarModel").textContent = comments.carModel;
    document.getElementById("commentAvgEfficiency").textContent = comments.avgEfficiency;
    document.getElementById("commentAvgInterval").textContent = comments.avgInterval;
    document.getElementById("commentMonthlyAvg").textContent = comments.monthlyAvg;
    document.getElementById("commentImprovement").textContent = comments.improvement;
  } catch (error) {
    console.error("Grok API 호출 실패:", error);
    document.getElementById("fuelScore").textContent = "-";
    ["commentCarModel", "commentAvgEfficiency", "commentAvgInterval", "commentMonthlyAvg", "commentImprovement"].forEach(id => {
      document.getElementById(id).textContent = "평가 오류가 발생했습니다.";
    });
  }
}

async function simulateGrokEvaluation(data) {
  return new Promise((resolve) => {
    setTimeout(() => {
      const hash = generateDataHash(data);
      const baseScore = Math.abs(hash % 50);

      const realEfficiency = {
        "Sorento": 10.8,
        "Avante": 13.2,
        "Grandeur": 9.5
      }[data.carModel] || 10.0;

      let score = baseScore;
      const comments = {};

      // 차종 평가
      comments.carModel = `차종: ${data.carModel} (실연비 기준: ${realEfficiency}km/L)`;
      if (data.carModel === "Sorento") {
        comments.carModel += " - 넓은 실내 공간을 가진 SUV로, 연비 관리가 중요합니다.";
      } else if (data.carModel === "Avante") {
        comments.carModel += " - 경제적인 세단으로, 연비 효율이 뛰어난 차종입니다.";
      } else if (data.carModel === "Grandeur") {
        comments.carModel += " - 고급 세단으로, 연비와 럭셔리함의 밸런스가 핵심입니다.";
      } else {
        comments.carModel += " - 다양한 주행 환경에서 연비를 체크해보세요.";
      }

      // 평균 연비 평가
      const efficiencyRatio = data.avgEfficiency / realEfficiency;
      if (efficiencyRatio >= 1.2) {
        score += 25;
        comments.avgEfficiency = `평균 연비: ${data.avgEfficiency}km/L - 실연비 대비 약 ${(efficiencyRatio * 100 - 100).toFixed(1)}% 높은 탁월한 연비를 보여줍니다! 연비 챔피언이군요!`;
      } else if (efficiencyRatio >= 1.1) {
        score += 20;
        comments.avgEfficiency = `평균 연비: ${data.avgEfficiency}km/L - 실연비 대비 약 ${(efficiencyRatio * 100 - 100).toFixed(1)}% 높은 우수한 연비를 기록하고 있습니다. 정말 잘하고 있어요!`;
      } else if (efficiencyRatio >= 0.9) {
        score += 10;
        comments.avgEfficiency = `평균 연비: ${data.avgEfficiency}km/L - 실연비와 비슷한 평균 수준의 연비입니다. 무난하게 잘 관리되고 있네요.`;
      } else if (efficiencyRatio >= 0.7) {
        score += 5;
        comments.avgEfficiency = `평균 연비: ${data.avgEfficiency}km/L - 실연비 대비 약 ${(100 - efficiencyRatio * 100).toFixed(1)}% 낮습니다. 조금 더 효율적인 운전 습관이 필요할 것 같아요.`;
      } else {
        score += 2;
        comments.avgEfficiency = `평균 연비: ${data.avgEfficiency}km/L - 실연비 대비 약 ${(100 - efficiencyRatio * 100).toFixed(1)}% 낮아 아쉬운 연비입니다. 운전 패턴을 점검해보세요!`;
      }

      // 평균 주유 주기 평가
      if (data.avgInterval >= 25) {
        score += 20;
        comments.avgInterval = `평균 주유 주기: ${data.avgInterval}일 - 주유 주기가 매우 길어 연료 효율이 뛰어납니다! 에코 드라이버로 인증합니다!`;
      } else if (data.avgInterval >= 20) {
        score += 15;
        comments.avgInterval = `평균 주유 주기: ${data.avgInterval}일 - 주유 주기가 길어 효율적인 운행을 하고 계십니다. 잘하고 계세요!`;
      } else if (data.avgInterval >= 15) {
        score += 10;
        comments.avgInterval = `평균 주유 주기: ${data.avgInterval}일 - 적당한 주유 주기를 유지하고 있습니다. 안정적인 운행 패턴이네요.`;
      } else if (data.avgInterval >= 10) {
        score += 5;
        comments.avgInterval = `평균 주유 주기: ${data.avgInterval}일 - 주유 주기가 조금 짧습니다. 불필요한 주행이 있는지 확인해보세요.`;
      } else {
        score += 2;
        comments.avgInterval = `평균 주유 주기: ${data.avgInterval}일 - 주유 주기가 매우 짧아 연료 소모가 빠릅니다. 효율적인 운행을 고민해보세요!`;
      }

      // 월평균 주유비 평가
      const referenceMonthlyCost = {
        "Sorento": 120000,
        "Avante": 90000,
        "Grandeur": 150000
      }[data.carModel] || 130000;
      const costRatio = referenceMonthlyCost / data.monthlyAvg;
      if (costRatio >= 1.5) {
        score += 20;
        comments.monthlyAvg = `월평균 주유비: ${data.monthlyAvg.toLocaleString()}원 - 기준 대비 매우 경제적인 주유비를 유지하고 있습니다. 절약의 달인이시군요!`;
      } else if (costRatio >= 1.2) {
        score += 15;
        comments.monthlyAvg = `월평균 주유비: ${data.monthlyAvg.toLocaleString()}원 - 기준 대비 경제적인 주유비를 유지하고 있습니다. 효율적인 지출이네요!`;
      } else if (costRatio >= 0.9) {
        score += 10;
        comments.monthlyAvg = `월평균 주유비: ${data.monthlyAvg.toLocaleString()}원 - 평균적인 수준의 주유비를 사용 중입니다. 무난한 소비 패턴입니다.`;
      } else if (costRatio >= 0.6) {
        score += 5;
        comments.monthlyAvg = `월평균 주유비: ${data.monthlyAvg.toLocaleString()}원 - 기준 대비 높은 주유비입니다. 지출을 줄일 방법을 찾아보세요.`;
      } else {
        score += 2;
        comments.monthlyAvg = `월평균 주유비: ${data.monthlyAvg.toLocaleString()}원 - 기준 대비 상당히 높은 주유비를 사용 중입니다. 절약 전략이 필요해 보입니다!`;
      }

      // 개선 팁
      comments.improvement = "개선 팁: ";
      if (data.avgEfficiency < realEfficiency * 0.7) {
        comments.improvement += "급가속과 급제동을 줄이고, 에코 모드를 활용해보세요. 연비가 크게 개선될 수 있습니다.";
      } else if (data.avgEfficiency < realEfficiency * 0.9) {
        comments.improvement += "정속 주행을 유지하고, 에어컨 사용을 최소화해보세요. 연비 향상에 도움이 됩니다.";
      } else if (data.avgInterval < 10) {
        comments.improvement += "짧은 거리 주행을 줄이고, 한 번에 긴 거리를 운행하는 습관을 들여보세요.";
      } else if (data.avgInterval < 15) {
        comments.improvement += "불필요한 아이들링 시간을 줄이고, 경로를 최적화해보세요. 주유 주기가 길어질 거예요.";
      } else if (data.monthlyAvg > referenceMonthlyCost * 1.2) {
        comments.improvement += "저렴한 주유소를 찾아보고, 주유 타이밍을 최적화해보세요. 지출이 줄어들 수 있습니다.";
      } else if (data.monthlyAvg > referenceMonthlyCost) {
        comments.improvement += "주행 경로를 최적화하거나 대중교통을 활용해보세요. 주유비를 아낄 수 있어요.";
      } else {
        comments.improvement += "현재 운행 패턴이 매우 훌륭합니다. 이 상태를 유지하세요!";
      }

      resolve({ score: Math.min(score, 100), comments });
    }, 1000);
  });
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
          label: '연비 (km/L)',
          data: [],
          type: 'line',
          borderColor: '#ff9933',
          backgroundColor: '#ff9933', // ✅ 배경 제거
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
            callback: v => v.toLocaleString()
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
            callback: v => v.toLocaleString()
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
          backgroundColor: '#ff9933',
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
      layout: {
        padding: { bottom: 10 } // 하단여백
      },
      scales: {
        x: {
          ticks: {
            font: {
              size: 11  // 👉 기본보다 작게 (기본은 12~13)
            },
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
            callback: v => v.toLocaleString()
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
  // carModel 요소의 변화를 감지하여 평가 수행
  const carModelElement = document.getElementById("carModel");
  if (carModelElement) {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList' || mutation.type === 'characterData') {
          evaluateFuelEfficiencyWithGrok(); // carModel 텍스트가 변경되면 평가 수행
        }
      });
    });
    observer.observe(carModelElement, {
      childList: true,
      characterData: true,
      subtree: true
    });
  }
});


// 🛢️ [1] 위치 기반 유가 추이 데이터 시각화
async function loadFuelTrend() {
  try {
    const pos = await new Promise((resolve, reject) =>
      navigator.geolocation.getCurrentPosition(resolve, reject)
    );
    const lat = pos.coords.latitude;
    const lon = pos.coords.longitude;

    // const res = await fetch(`/api/data?lat=${lat}&lon=${lon}`);
    const res = await fetch(`/api/data`); // lat, lon 없이 고정 요청
    const data = await res.json();
    console.log(data);

    const national = data.national;
    const local = data.local;
    const region = data.region;

    const dates = [...new Set(national.map(item => item.DATE[0]))];
    const nationalPrices = dates.map(date =>
      national.find(item => item.DATE[0] === date)?.PRICE[0] || null
    );
    const localPrices = dates.map(date =>
      local.find(item => item.DATE[0] === date)?.PRICE[0] || null
    );

    const ctx = document.getElementById('nearbyPriceBarChart').getContext('2d');
    new Chart(ctx, {
      type: 'line',
      data: {
        labels: dates,
        datasets: [
          {
            label: `${region} 평균`,
            data: nationalPrices,
            borderColor: '#ff6384',
            backgroundColor: '#ff6384',
            tension: 0.3
          },
          {
            label: '전국 평균',
            data: localPrices,
            borderColor: '#36a2eb',
            backgroundColor: '#36a2eb',
            tension: 0.3
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        layout: {
          padding: { bottom: 10 } // 하단여백
        },
        plugins: {
          legend: {
            position: 'top'
          }
        },
        scales: {
          x: {
            ticks: {
              callback: function(value, index, values) {
                // ✅ 날짜를 MM/DD 형식으로 표시
                const raw = this.getLabelForValue(value); // eg: 20250409
                if (raw.length === 8) {
                  return raw.slice(4, 6) + '/' + raw.slice(6); // "04/09"
                }
                return raw;
              },
              maxRotation: 0, // ✅ 라벨 회전 없음
              minRotation: 0,
              autoSkip: true,
              maxTicksLimit: 7 // 최대 7개까지만 보이게
            }
          }
        }
      }
    });

  } catch (err) {
    console.error('유가 추이 데이터 로딩 실패', err);
  }
}

// 주요 도시별 유가
async function loadCityPrices() {
  try {
    const res = await fetch('/api/cities');
    const data = await res.json();

    const labels = data.map(item => item.name);
    const prices = data.map(item => parseFloat(item.price));

    const ctx = document.getElementById('majorCityDonutChart').getContext('2d');

    new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: labels.map(name => name.replace('특별시', '').replace('광역시', '').replace('도', '').replace('특별자치시', '')),
        datasets: [{
          data: prices,
          backgroundColor: [
            '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0',
            '#9966FF', '#FF9F40', '#C9CBCF', '#8E44AD', '#2ECC71'
          ],
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        layout: {
          // padding: { top: 5 } // 하단여백
        },
        plugins: {
          legend: {
            position: 'right',
            // align: 'start',
            labels: {
              usePointStyle: true, // ✅ ● 점 스타일
              pointStyle: 'rectRounded', // 혹은 'rectRounded' 등
              padding: 5,
              font: { size: 10 }
            }
          },
          title: {
            display: true,
            text: '주요 도시 평균 유가 지표 (단위: 원)'
          }
        }
      }
    });

  } catch (err) {
    console.error('도시 유가 데이터 로딩 실패', err);
  }
}

// ✅ main.js 마지막에 추가
// window.addEventListener("DOMContentLoaded", () => {
//   loadFuelTrend();       // 유가 추이 차트 로딩
//   loadCityPrices();      // 주요 도시별 가격 차트 로딩
// });
window.addEventListener("DOMContentLoaded", async () => {
  try {
    await loadFuelTrend();     // 유가추이 1번 실행 후
    await loadCityPrices();    // 도시별 평균 유가 2번 실행
    // await initMap();           //최저가 주유소 지도
  } catch (e) {
    console.error("차트 로딩 실패", e);
  }
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

