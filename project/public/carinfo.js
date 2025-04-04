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
  avante: "/icon/아반떼1.jpg",
  sorento: "/icon/쏘렌토1.jpg",
  grandeur: "/icon/그랜저1.jpg"
};

carHeader.addEventListener("click", () => {
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
});


// 차량아이콘 클릭 시 정보 입력
const carIconBtn = document.getElementById("carIconBtn");
carIconBtn?.addEventListener("click", () => {
  carModal.style.display = "block";
});


window.closeModal = () => {
  carModal.style.display = "none";
};

window.saveCarInfo = () => {
  const car = modalCar.options[modalCar.selectedIndex]?.text;
  const fuel = modalFuel.value;
  const efficiency = modalEfficiency.value;
  const selected = modalCar.value;

  if (car && fuel && efficiency && carImages[selected]) {
    carModel.textContent = car;
    carFuel.textContent = fuel;
    carEfficiency.textContent = `${efficiency}km/L`;
    carImage.src = carImages[selected];
    carModal.style.display = "none";
  } else {
    alert("모든 항목을 입력해 주세요.");
  }
};
})