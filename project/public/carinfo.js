// 토스트 메시지 함수 (전역에 위치)
function showToast(message) {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.classList.add("show");
  setTimeout(() => {
    toast.classList.remove("show");
  }, 2000); // 2초 후 사라짐
}

// isLoggedIn 변수 선언 (main.html에서 렌더링된 값이 삽입됨)
const isLoggedIn = window.__IS_LOGGED_IN__;  // HTML에서 선언한 값 사용

document.addEventListener('DOMContentLoaded', () => {
  const simplifyList = (list) => {
    list.querySelectorAll('li').forEach(item => {
      item.addEventListener('click', () => {
        const clone = item.cloneNode(true);
        list.innerHTML = '';
        list.appendChild(clone);
      });
    });
  };


  // 차량 정보 모달 연동
  const carModal = document.getElementById("carModal");
  const modalCar = document.getElementById("modalCar");
  const modalFuel = document.getElementById("modalFuel");
  const modalEfficiency = document.getElementById("modalEfficiency");
  const modalCarImage = document.getElementById("modalCarImage");

  const carHeader = document.getElementById("carHeader");
  const carImage = document.getElementById("carImage");
  const carModel = document.getElementById("carModel");
  const carFuel = document.getElementById("carFuel");
  const carEfficiency = document.getElementById("carEfficiency");

  const carImages = {
    Avante: "/car/Avante.png",
    Sorento: "/car/sorento.png",
    Grandeur: "/car/grandeur.png",
    Sonata : "/car/Sonata.png",
    SantaFe : "/car/SantaFe.png",
    Tucson : "/car/Tucson.png",
    Carnival : "/car/Carnival.png",
    Palisade : "/car/Palisade.png",
    K3 : "/car/K3.png",
    K5 : "/car/K5.png",
    K7 : "/car/K7.png",
    K8 : "/car/K8.png",
    Sportage : "/car/Sportage.png",
    G70 : "/car/G70.png",
    G80 : "/car/G80.png",
    G90 : "/car/G90.png",
    GV70 : "/car/GV70.png",
    GV80 : "/car/GV80.png",
    Morning : "/car/Morning.png",
    Ray : "/car/Ray.png"
  };

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

  // carHeader.addEventListener("click", () => {
  //   carModal.style.display = "block";
  // });
  carHeader.addEventListener("click", (event) => {
    if (isLoggedIn !== "true") {
      showToast("로그인이 필요합니다.");
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    
    
    carModal.style.display = "block";
    modalCar.value = "";
    modalFuel.value = "";
    modalEfficiency.value = "";
    modalEfficiency.disabled = true;
    modalCarImage.src = "/car/default_car1.png";
    modalCarImage.style.display = "block";

    // ✅ 차량 선택 안 되어있을 때만 default 이미지 표시
    // (모달창 닫아도 마지막 선택차량이 뜸)
    // const selected = modalCar.value;
    // if (!selected || !carImages[selected]) {
    //   modalCarImage.src = "/car/default_car.png";
    //   modalCarImage.style.display = "block";
    // }

    carModal.style.display = "block";
  });
  
  
  modalCar.addEventListener("change", () => {
    const selected = modalCar.value;
    if (carImages[selected]) {
      modalCarImage.src = carImages[selected];
      modalCarImage.style.display = "block";
    } else {
      modalCarImage.style.display = "none";
    }

      // ✅ 차량 선택 시 고정 연비 자동 세팅
    if (carEfficiencies[selected]) {
      modalEfficiency.value = carEfficiencies[selected];
      modalEfficiency.disabled = true;
    } else {
      modalEfficiency.value = "";
      modalEfficiency.disabled = false;
    }
  });


  // 차량아이콘 클릭 시 정보 입력
  const carIconBtn = document.getElementById("carIconBtn");

  carIconBtn?.addEventListener("click", (event) => {
    if (isLoggedIn !== "true") {
      showToast("로그인이 필요합니다.");
      event.preventDefault();      // 기본 동작 차단
      event.stopPropagation();     // 이벤트 전파 차단
      return;
    }

    // ✅ 차량 이미지 초기화
    modalCarImage.src = "/car/default_car1.png";
    modalCarImage.style.display = "block";

    carModal.style.display = "block";
  });
  



  window.closeModal = () => {
    carModal.style.display = "none";
  };


  window.saveCarInfo = () => {
    const car = modalCar.value;  // DB 저장용 (영문: avante 등)
    const fuel = modalFuel.value;
    const efficiency = modalEfficiency.value;

    const carSummaryText = document.getElementById("carSummaryText");
    const userName = window.__USER_NAME__;

    if (car && fuel && efficiency && carImages[car]) {
      // 1. 화면에 즉시 반영
      carModel.textContent = `${car}`;  // 'car'는 영문이므로 필요시 변환 로직 추가 가능
      carFuel.textContent = fuel;
      carEfficiency.textContent = `${efficiency}km/L`;
      carImage.src = carImages[car];
      if (carSummaryText) {
        carSummaryText.textContent = `${userName}님의 차량`;
      }
      

      // 2. 모달 닫기
      carModal.style.display = "none";

      // 3. form 제출 → DB 저장
      // showToast("차량 정보가 저장되었습니다");
      // 를 axios로 바꿈
      axios.post("/user/carinfo", {
        car_model: car,
        fuel_type: fuel,
        fuel_efficiency: efficiency
      }, {
        withCredentials: true  // 세션 유지!
      })
      .then((res) => {
        if (res.data.success) {
          console.log("📦 응답:", res.data);
          showToast("차량 정보가 저장되었습니다");
        } else {
          alert("저장 실패");
        }
      })
      .catch((err) => {
        console.error(err);
        alert("서버 오류 발생");
      });

    } else {
      alert("모든 항목을 입력해 주세요.");
    }
  };

})

