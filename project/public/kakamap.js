
// -------------------------------ver2. 유류비 계산 추천-------------------------
// kakamap.js

const dummyData = {
  gasoline: [
    { lat: 35.19891304897737, lon: 126.93758660633249, OS_NM: "(유)착한주유소", PRICE: 1559, NEW_ADR: "광주 북구 동문대로 452 (장등동)" },
    { lat: 35.24230023648585, lon: 126.88775002091218, OS_NM: "행복가득주유소", PRICE: 1565, NEW_ADR: "광주 북구 우치로 952(용전동)" },
    { lat: 35.232368908042574, lon: 126.87864323655424, OS_NM: "광주주유소", PRICE: 1565, NEW_ADR: "광주 북구 빛고을대로 825 (지야동)" },
    { lat: 35.23439884313534, lon: 126.87888448003815, OS_NM: "(주)스피드에너지", PRICE: 1565, NEW_ADR: "광주 북구 빛고을대로 849" },
    { lat: 35.21075116921343, lon: 126.79270690652716, OS_NM: "진곡산단주유소", PRICE: 1565, NEW_ADR: "광주 광산구 임곡로 516,  (진곡동)" }
  ],
  diesel: [
    { lat: 35.15992285990457, lon: 126.8214289648916, OS_NM: "남선석유(주) 임방울셀프주유소", PRICE: 1439, NEW_ADR: "광주 광산구 임방울대로 14" },
    { lat: 35.159890173441596, lon: 126.8204246758662, OS_NM: "유한회사 우이리주유소", PRICE: 1439, NEW_ADR: "광주 광산구 임방울대로 13" },
    { lat: 35.19891304897737, lon: 126.93758660633249, OS_NM: "(유)착한주유소", PRICE: 1439, NEW_ADR: "광주 북구 동문대로 452 (장등동)" },
    { lat: 35.15104647025281, lon: 126.83846115443646, OS_NM: "반디석유시청점", PRICE: 1445, NEW_ADR: "광주 서구 천변좌하로 160 (치평동)" },
    { lat: 35.14964845204208, lon: 126.8374165870456, OS_NM: "(주)대원 강변주유소", PRICE: 1445, NEW_ADR: "광주 서구 천변좌하로 142 (치평동)" }
  ]
};

let mapMarkers = [];
let selectedAmount = 50000; // 기본 주유 금액
let fuelEfficiency = 12.3; // 차량 연비
let currentInfoWindow = null;

function getDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

async function initMap() {
  const lat = 35.15;
  const lon = 126.92;
  const userPos = new kakao.maps.LatLng(lat, lon);
  const mapContainer = document.getElementById('map2');
  const mapOption = { center: userPos, level: 9 };
  const map = new kakao.maps.Map(mapContainer, mapOption);

  new kakao.maps.Marker({ position: userPos, map, title: '현재 위치' });

  const list = document.getElementById('station-list');
  list.innerHTML = '';
  mapMarkers = [];
  currentInfoWindow = null;

  function makeMarker(station, type) {
    const { lat, lon, OS_NM, PRICE, NEW_ADR } = station;
    const position = new kakao.maps.LatLng(lat, lon);
    const emoji = type === 'gasoline' ? '⛽' : '🛢️';

    // // 이모지 마커 이미지 만들기
    // const canvas = document.createElement('canvas');
    // canvas.width = 40;
    // canvas.height = 40;
    // const ctx = canvas.getContext('2d');
    // ctx.font = '28px sans-serif';
    // ctx.textAlign = 'center';
    // ctx.textBaseline = 'middle';
    // ctx.fillText(emoji, 20, 20);
    // const imageSrc = canvas.toDataURL();
    // const markerImage = new kakao.maps.MarkerImage(imageSrc, new kakao.maps.Size(40, 40));
    const markerImage = new kakao.maps.MarkerImage(
      type === 'gasoline' ? '/icon/gas-station(red).png' : '/icon/gas-station(g).png',
      new kakao.maps.Size(27, 27)
    );


    const marker = new kakao.maps.Marker({ map, position, title: OS_NM, image: markerImage });
    mapMarkers.push(marker);

    // 리스트 항목
    const item = document.createElement('div');
    item.className = 'station-item';
    const baseInfo = `
      <strong>${emoji} ${type === 'gasoline' ? '휘발유' : '경유'} - ${OS_NM}</strong><br/>
      💰 ${PRICE}원<br/>
      📍 ${NEW_ADR || '주소 정보 없음'}
    `;
    item.innerHTML = baseInfo;
    list.appendChild(item);

    station.domElement = item;
    station.baseHTML = baseInfo;

    // 인포윈도우 생성 및 클릭 이벤트
    const infoWindow = new kakao.maps.InfoWindow({
      content: `<div style="padding:8px;">${OS_NM}<br/>${PRICE}원</div>`
    });

    kakao.maps.event.addListener(marker, 'click', () => {
      if (currentInfoWindow) currentInfoWindow.close();
      if (currentInfoWindow === infoWindow) {
        currentInfoWindow = null;
      } else {
        infoWindow.open(map, marker);
        currentInfoWindow = infoWindow;
      }
    });

    // 리스트 항목 클릭 시 지도 이동 및 인포윈도우 열기
    item.addEventListener('click', (e) => {
      e.stopPropagation(); // 이벤트 버블링 방지
      if (currentInfoWindow) currentInfoWindow.close();
      infoWindow.open(map, marker);
      currentInfoWindow = infoWindow;
      map.panTo(position); // 부드럽게 지도 이동
    });
  }

  function renderByFuelType(type) {
    list.innerHTML = '';
    mapMarkers.forEach(marker => marker.setMap(null));
    mapMarkers = [];
    dummyData[type].forEach(station => makeMarker(station, type));
    updateCalculations(type);
  }

  function updateCalculations(type) {
    dummyData[type].forEach(station => {
      // 초기화
      station.domElement.innerHTML = station.baseHTML;

      const dist = getDistanceKm(lat, lon, station.lat, station.lon);
      const fuelUsed = dist / fuelEfficiency;
      const drivingCost = fuelUsed * station.PRICE;
      const totalCost = Number(selectedAmount) + drivingCost;
      const realPerLiter = totalCost / (selectedAmount / station.PRICE);

      const extra = `
        <p>📏 거리: ${dist.toFixed(2)} km</p>
        <p>🚗 총비용: ${Math.round(totalCost)} 원</p>
        <p>⚡ 실질 단가: ${realPerLiter.toFixed(1)} 원/L</p>
      `;
      station.domElement.innerHTML += extra;
    });
  }

  // 연료 타입 선택 이벤트
  document.getElementById('sortSelect2').addEventListener('change', (e) => {
    renderByFuelType(e.target.value);
  });

  // 금액 선택 이벤트
  document.getElementById('chargeAmountSelect').addEventListener('change', (e) => {
    const val = e.target.value;
    if (val === 'custom') {
      const input = prompt('직접 입력 (원):');
      const num = Number(input);
      if (!isNaN(num) && num > 0) selectedAmount = num;
    } else {
      selectedAmount = parseInt(val);
    }
    updateCalculations(document.getElementById('sortSelect2').value);
  });

  // 초기 휘발유 렌더링
  renderByFuelType('gasoline');
}

window.initMap = initMap;



// //-------------------------- 04/11 ver.1 주유소랑 리스트만 뜸 -------------------------
// // kakamap.js

// // ✅ 더미 주유소 데이터 (lat, lon 포함된 데이터만 추림)
// // ✅ 더미 주유소 데이터 (lat, lon 포함된 데이터만 추림)
// const dummyData = {
//   gasoline: [
//     { lat: 35.19891304897737, lon: 126.93758660633249, OS_NM: "(유)착한주유소", PRICE: 1559, NEW_ADR: "광주 북구 동문대로 452 (장등동)" },
//     { lat: 35.24230023648585, lon: 126.88775002091218, OS_NM: "행복가득주유소", PRICE: 1565, NEW_ADR: "광주 북구 우치로 952(용전동)" },
//     { lat: 35.232368908042574, lon: 126.87864323655424, OS_NM: "광주주유소", PRICE: 1565, NEW_ADR: "광주 북구 빛고을대로 825 (지야동)" },
//     { lat: 35.23439884313534, lon: 126.87888448003815, OS_NM: "(주)스피드에너지", PRICE: 1565, NEW_ADR: "광주 북구 빛고을대로 849" },
//     { lat: 35.21075116921343, lon: 126.79270690652716, OS_NM: "진곡산단주유소", PRICE: 1565, NEW_ADR: "광주 광산구 임곡로 516,  (진곡동)" }
//   ],
//   diesel: [
//     { lat: 35.15992285990457, lon: 126.8214289648916, OS_NM: "남선석유(주) 임방울셀프주유소", PRICE: 1439, NEW_ADR: "광주 광산구 임방울대로 14" },
//     { lat: 35.159890173441596, lon: 126.8204246758662, OS_NM: "유한회사 우이리주유소", PRICE: 1439, NEW_ADR: "광주 광산구 임방울대로 13" },
//     { lat: 35.19891304897737, lon: 126.93758660633249, OS_NM: "(유)착한주유소", PRICE: 1439, NEW_ADR: "광주 북구 동문대로 452 (장등동)" },
//     { lat: 35.15104647025281, lon: 126.83846115443646, OS_NM: "반디석유시청점", PRICE: 1445, NEW_ADR: "광주 서구 천변좌하로 160 (치평동)" },
//     { lat: 35.14964845204208, lon: 126.8374165870456, OS_NM: "(주)대원 강변주유소", PRICE: 1445, NEW_ADR: "광주 서구 천변좌하로 142 (치평동)" }
//   ]
// };

// let mapMarkers = []; // 🔹 마커를 저장할 전역 배열

// // ✅ 맵 로드 함수
// async function initMap() {
//   const lat = 35.15;
//   const lon = 126.92;
//   const userPos = new kakao.maps.LatLng(lat, lon);

//   const mapContainer = document.getElementById('map2');
//   const mapOption = { center: userPos, level: 9 };
//   const map = new kakao.maps.Map(mapContainer, mapOption);

//   // 현재 위치 마커
//   new kakao.maps.Marker({
//     position: userPos,
//     map,
//     title: '현재 위치'
//   });

//   // 주유소 리스트 영역
//   const list = document.getElementById('station-list');
//   list.innerHTML = '';
//   let currentInfoWindow = null;

//   const makeMarker = (station, type) => {
//     const { lat, lon, OS_NM, PRICE, NEW_ADR } = station;
//     const position = new kakao.maps.LatLng(lat, lon);

//     const emoji = type === 'gasoline' ? '⛽' : '🛢️';
//     const canvas = document.createElement('canvas');
//     canvas.width = 40;
//     canvas.height = 40;
//     const ctx = canvas.getContext('2d');
//     ctx.font = '28px sans-serif';
//     ctx.textAlign = 'center';
//     ctx.textBaseline = 'middle';
//     ctx.fillText(emoji, 20, 20);
//     const imageSrc = canvas.toDataURL();
//     const markerImage = new kakao.maps.MarkerImage(imageSrc, new kakao.maps.Size(40, 40));

//     const marker = new kakao.maps.Marker({
//       map,
//       position,
//       title: OS_NM,
//       image: markerImage
//     });

//     mapMarkers.push(marker); // 🔹 생성된 마커 저장

//     const infoWindow = new kakao.maps.InfoWindow({
//       content: `
//         <div style="padding:8px; font-size:13px;">
//           <strong>${OS_NM}</strong><br/>
//           ${emoji} ${type === 'gasoline' ? '휘발유' : '경유'}<br/>
//           💰 ${PRICE}원<br/>
//           📍 ${NEW_ADR || '주소 정보 없음'}
//         </div>`
//     });

//     kakao.maps.event.addListener(marker, 'click', () => {
//       if (currentInfoWindow === infoWindow) {
//         infoWindow.close();
//         currentInfoWindow = null;
//       } else {
//         if (currentInfoWindow) currentInfoWindow.close();
//         infoWindow.open(map, marker);
//         currentInfoWindow = infoWindow;
//       }
//     });

//     const item = document.createElement('div');
//     item.className = 'station-item';
//     item.innerHTML = `
//       <strong>${emoji} ${type === 'gasoline' ? '휘발유' : '경유'} - ${OS_NM}</strong><br/>
//       💰 ${PRICE}원<br/>
//       📍 ${NEW_ADR || '주소 정보 없음'}
//     `;
//     list.appendChild(item);
//   };

//   // 🔽 정렬된 주유소 마커/리스트 렌더링 함수
//   function renderByFuelType(type) {
//     list.innerHTML = '';

//     // 기존 마커 제거
//     mapMarkers.forEach(marker => marker.setMap(null));
//     mapMarkers = [];

//     // 가격 오름차순 정렬 후 마커/리스트 생성
//     const sorted = dummyData[type].slice().sort((a, b) => a.PRICE - b.PRICE);
//     sorted.forEach(station => makeMarker(station, type));
//   }

//   // 🔽 셀렉트박스 이벤트 연결
//   document.getElementById('sortSelect2').addEventListener('change', (e) => {
//     renderByFuelType(e.target.value);
//   });

//   // 🔽 처음에는 휘발유 기준 정렬로 표시
//   renderByFuelType('gasoline');
// }

// window.initMap = initMap;

//---------------------------------------------------

// async function initMap() {
//   if (!navigator.geolocation) {
//     alert('위치 정보를 사용할 수 없습니다.');
//     return;
//   }

//   navigator.geolocation.getCurrentPosition(async (pos) => {
//     const lat = pos.coords.latitude;
//     const lon = pos.coords.longitude;
//     const accuracy = pos.coords.accuracy;

//     const userPos = new kakao.maps.LatLng(lat, lon);
//     const mapContainer = document.getElementById('map2');
//     const mapOption = { center: userPos, level: 8 };
//     const map2 = new kakao.maps.Map(mapContainer, mapOption);

//     const locMarker = new kakao.maps.Marker({
//       position: userPos,
//       map: map2,
//       title: '현재 위치',
//       zIndex: 5
//     });

//     const accuracyCircle = new kakao.maps.Circle({
//       center: userPos,
//       radius: accuracy,
//       strokeWeight: 1,
//       strokeColor: '#007aff',
//       strokeOpacity: 0.5,
//       fillColor: '#007aff',
//       fillOpacity: 0.1,
//       map: map2
//     });

//     map2.panTo(userPos);

//     try {
//       const res = await fetch(`/map/region?lat=${lat}&lon=${lon}`);
//       const data = await res.json();

//       const list = document.getElementById('station-list');
//       list.innerHTML = '';
//       let currentInfoWindow = null;

//       // ✅ 여기 makeMarker 함수 정의
//       const makeMarker = (station, type) => {
//         const { lat, lon, OS_NM, PRICE, NEW_ADR } = station;
//         const position = new kakao.maps.LatLng(lat, lon);

//         const emoji = type === 'gasoline' ? '⛽' : '🛢️';
//         const canvas = document.createElement('canvas');
//         canvas.width = 40;
//         canvas.height = 40;
//         const ctx = canvas.getContext('2d');
//         ctx.font = '28px sans-serif';
//         ctx.textAlign = 'center';
//         ctx.textBaseline = 'middle';
//         ctx.fillText(emoji, 20, 20);
//         const imageSrc = canvas.toDataURL();
//         const markerImage = new kakao.maps.MarkerImage(imageSrc, new kakao.maps.Size(40, 40));

//         const marker = new kakao.maps.Marker({
//           map: map2,
//           position,
//           title: OS_NM,
//           image: markerImage
//         });

//         const infoWindow = new kakao.maps.InfoWindow({
//           content: `
//             <div style="padding:8px; font-size:13px;">
//               <strong>${OS_NM}</strong><br/>
//               ${emoji} ${type === 'gasoline' ? '가솔린' : '디젤'}<br/>
//               💰 ${PRICE}원<br/>
//               📍 ${NEW_ADR || '주소 정보 없음'}
//             </div>`
//         });

//         kakao.maps.event.addListener(marker, 'click', () => {
//           if (currentInfoWindow === infoWindow) {
//             infoWindow.close();
//             currentInfoWindow = null;
//           } else {
//             if (currentInfoWindow) currentInfoWindow.close();
//             infoWindow.open(map2, marker);
//             currentInfoWindow = infoWindow;
//           }
//         });

//         const item = document.createElement('div');
//         item.className = 'station-item';
//         item.innerHTML = `
//           <strong>${emoji} ${type === 'gasoline' ? '가솔린' : '디젤'} - ${OS_NM}</strong><br/>
//           💰 ${PRICE}원<br/>
//           📍 ${NEW_ADR || '주소 정보 없음'}
//         `;
//         list.appendChild(item);
//       };

//       // ✅ 데이터 루프 돌면서 마커 생성
//       data.gasoline?.forEach(station => makeMarker(station, 'gasoline'));
//       data.diesel?.forEach(station => makeMarker(station, 'diesel'));

//     } catch (err) {
//       console.error("❌ 서버 호출 실패:", err);
//       alert("서버 응답 오류가 발생했습니다.");
//     }

//   }, (err) => {
//     console.error("❌ 위치 정보 에러:", err);
//     alert("위치 정보를 가져오지 못했습니다.");
//   }, {
//     enableHighAccuracy: true,
//     timeout: 10000,
//     maximumAge: 0
//   });
// }

// window.initMap = initMap;




// async function initMap() {
//   if (!navigator.geolocation) {
//     alert('위치 정보를 사용할 수 없습니다.');
//     return;
//   }

//   navigator.geolocation.getCurrentPosition(async (pos) => {
//     const lat = pos.coords.latitude;
//     const lon = pos.coords.longitude;
//     const accuracy = pos.coords.accuracy;

//     const userPos = new kakao.maps.LatLng(lat, lon);

//     const mapContainer = document.getElementById('map2');
//     const mapOption = { center: userPos, level: 8 };
//     const map2 = new kakao.maps.Map(mapContainer, mapOption);

//     const locMarker = new kakao.maps.Marker({
//       position: userPos,
//       map: map2,
//       title: '현재 위치',
//       zIndex: 5
//     });

//     const accuracyCircle = new kakao.maps.Circle({
//       center: userPos,
//       radius: accuracy,
//       strokeWeight: 1,
//       strokeColor: '#007aff',
//       strokeOpacity: 0.5,
//       fillColor: '#007aff',
//       fillOpacity: 0.1,
//       map: map2
//     });

//     map2.panTo(userPos);

//     try {
//       // 연료 타입 파라미터 없이 모든 데이터 가져오기
//       const res = await fetch(`/map/region?lat=${lat}&lon=${lon}`);
//       const data = await res.json();

//       const list = document.getElementById('station-list');
//       list.innerHTML = '';
//       let currentInfoWindow = null;

//       const makeMarker = (station, type) => {
//         const { lat, lon, OS_NM, PRICE, NEW_ADR } = station;
//         const position = new kakao.maps.LatLng(lat, lon);

//         function createEmojiMarker(emoji) {
//           const canvas = document.createElement('canvas');
//           canvas.width = 40;
//           canvas.height = 40;
//           const ctx = canvas.getContext('2d');
//           ctx.font = '28px sans-serif';
//           ctx.textAlign = 'center';
//           ctx.textBaseline = 'middle';
//           ctx.fillText(emoji, 20, 20);
//           return canvas.toDataURL();
//         }

//         const emoji = type === 'gasoline' ? '⛽' : '🛢️';
//         const imageSrc = createEmojiMarker(emoji);
//         const markerImage = new kakao.maps.MarkerImage(imageSrc, new kakao.maps.Size(40, 40));

//         const marker = new kakao.maps.Marker({
//           map: map2,
//           position,
//           title: OS_NM,
//           image: markerImage
//         });

//         const infoWindow = new kakao.maps.InfoWindow({
//           content: `
//             <div style="padding:8px; font-size:13px;">
//               <strong>${OS_NM}</strong><br/>
//               ${type === 'gasoline' ? '⛽ 가솔린' : '🛢️ 디젤'}<br/>
//               💰 ${PRICE}원<br/>
//               📍 ${NEW_ADR || '주소 정보 없음'}
//             </div>`
//         });

//         kakao.maps.event.addListener(marker, 'click', () => {
//           if (currentInfoWindow === infoWindow) {
//             infoWindow.close();
//             currentInfoWindow = null;
//           } else {
//             if (currentInfoWindow) currentInfoWindow.close();
//             infoWindow.open(map2, marker);
//             currentInfoWindow = infoWindow;
//           }
//         });

//         const item = document.createElement('div');
//         item.className = 'station-item';
//         item.innerHTML = `
//           <strong>${type === 'gasoline' ? '⛽ 가솔린' : '🛢️ 디젤'} - ${OS_NM}</strong><br/>
//           💰 ${PRICE}원<br/>
//           📍 ${NEW_ADR || '주소 정보 없음'}
//         `;
//         list.appendChild(item);
//       };

//       // 🚀 디젤과 가솔린 둘 다 출력
//       data.gasoline?.forEach(station => makeMarker(station, 'gasoline'));
//       data.diesel?.forEach(station => makeMarker(station, 'diesel'));

//     } catch (err) {
//       console.error("❌ 서버 호출 실패:", err);
//       alert("서버 응답 오류가 발생했습니다.");
//     }

//   }, (err) => {
//     console.error("❌ 위치 정보 에러:", err);
//     alert("위치 정보를 가져오지 못했습니다.");
//   }, {
//     enableHighAccuracy: true,
//     timeout: 10000,
//     maximumAge: 0
//   });
// }

// window.initMap = initMap;
// console.log("initMap 실행됨");



// async function initMap() {
//   if (!navigator.geolocation) {
//     alert('위치 정보를 사용할 수 없습니다.');
//     return;
//   }

//   navigator.geolocation.getCurrentPosition(async (pos) => {
//     const lat = pos.coords.latitude;
//     const lon = pos.coords.longitude;
//     const accuracy = pos.coords.accuracy;

//     const userPos = new kakao.maps.LatLng(lat, lon);

//     const mapContainer = document.getElementById('map2');
//     const mapOption = { center: userPos, level: 8 };
//     const map2 = new kakao.maps.Map(mapContainer, mapOption);

//     const locMarker = new kakao.maps.Marker({
//       position: userPos,
//       map: map2,
//       title: '현재 위치',
//       zIndex: 5
//     });

//     const accuracyCircle = new kakao.maps.Circle({
//       center: userPos,
//       radius: accuracy,
//       strokeWeight: 1,
//       strokeColor: '#007aff',
//       strokeOpacity: 0.5,
//       fillColor: '#007aff',
//       fillOpacity: 0.1,
//       map: map2
//     });

//     map2.panTo(userPos);

//     try {
//       // 연료 타입 파라미터 없이 모든 데이터 가져오기
//       const res = await fetch(`/map/region?lat=${lat}&lon=${lon}`);
//       const data = await res.json();

//       const list = document.getElementById('station-list');
//       list.innerHTML = '';
//       let currentInfoWindow = null;

//       const makeMarker = (station, type) => {
//         const { lat, lon, OS_NM, PRICE, NEW_ADR } = station;
//         const position = new kakao.maps.LatLng(lat, lon);

//         function createEmojiMarker(emoji) {
//           const canvas = document.createElement('canvas');
//           canvas.width = 40;
//           canvas.height = 40;
//           const ctx = canvas.getContext('2d');
//           ctx.font = '28px sans-serif';
//           ctx.textAlign = 'center';
//           ctx.textBaseline = 'middle';
//           ctx.fillText(emoji, 20, 20);
//           return canvas.toDataURL();
//         }

//         const emoji = type === 'gasoline' ? '⛽' : '🛢️';
//         const imageSrc = createEmojiMarker(emoji);
//         const markerImage = new kakao.maps.MarkerImage(imageSrc, new kakao.maps.Size(40, 40));

//         const marker = new kakao.maps.Marker({
//           map: map2,
//           position,
//           title: OS_NM,
//           image: markerImage
//         });

//         const infoWindow = new kakao.maps.InfoWindow({
//           content: `
//             <div style="padding:8px; font-size:13px;">
//               <strong>${OS_NM}</strong><br/>
//               ${type === 'gasoline' ? '⛽ 가솔린' : '🛢️ 디젤'}<br/>
//               💰 ${PRICE}원<br/>
//               📍 ${NEW_ADR || '주소 정보 없음'}
//             </div>`
//         });

//         kakao.maps.event.addListener(marker, 'click', () => {
//           if (currentInfoWindow === infoWindow) {
//             infoWindow.close();
//             currentInfoWindow = null;
//           } else {
//             if (currentInfoWindow) currentInfoWindow.close();
//             infoWindow.open(map2, marker);
//             currentInfoWindow = infoWindow;
//           }
//         });

//         const item = document.createElement('div');
//         item.className = 'station-item';
//         item.innerHTML = `
//           <strong>${type === 'gasoline' ? '⛽ 가솔린' : '🛢️ 디젤'} - ${OS_NM}</strong><br/>
//           💰 ${PRICE}원<br/>
//           📍 ${NEW_ADR || '주소 정보 없음'}
//         `;
//         list.appendChild(item);
//       };

//       // 🚀 디젤과 가솔린 둘 다 출력
//       data.gasoline?.forEach(station => makeMarker(station, 'gasoline'));
//       data.diesel?.forEach(station => makeMarker(station, 'diesel'));

//     } catch (err) {
//       console.error("❌ 서버 호출 실패:", err);
//       alert("서버 응답 오류가 발생했습니다.");
//     }

//   }, (err) => {
//     console.error("❌ 위치 정보 에러:", err);
//     alert("위치 정보를 가져오지 못했습니다.");
//   }, {
//     enableHighAccuracy: true,
//     timeout: 10000,
//     maximumAge: 0
//   });
// }

// window.initMap = initMap;
// console.log("initMap 실행됨");
