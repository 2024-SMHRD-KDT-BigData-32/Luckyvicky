let map, ps, markers = [], placeOverlay;
let userLocation;
let currentOverlay = null; // ← 전역에 추가
let currentRadius = 3000; // 기본 반경 3km
let currentSort = "distance"; // 리스트 기본 정렬값 지정

// 내 위치 근처 주유소 가격 (휘발유, 경유)
const prices = {
  "자모셀프주유소": { 휘발유: 1624, 경유: 1479 },
  "에코주유소": { 휘발유: 1639, 경유: 1499 },
  "남산석유 서방주유소": { 휘발유: 1617, 경유: 1477 },
  "GS칼텍스 북성주유소": { 휘발유: 1685, 경유: 1579 },
  "아승그린주유소": { 휘발유: 1617, 경유: 1477 },
  "반디석유 산수점": { 휘발유: 1619, 경유: 1479 },
  "지산주유소 산수점": { 휘발유: 1619, 경유: 1479 },
  "대창석유 동명주유소": { 휘발유: 1623, 경유: 1479 },
  "독립로주유소": { 휘발유: 1608, 경유: 1494 },
  "서양새마을금고주유소": { 휘발유: 1608, 경유: 1494 },
  "늘푸른주유소": { 휘발유: 1604, 경유: 1499 },
  "무지개셀프주유소": { 휘발유: 1598, 경유: 1485 },
  "유신산업 대동주유소": { 휘발유: 1598, 경유: 1495 },
};

function initMap(position) {
  const lat = position.coords.latitude;
  const lng = position.coords.longitude;
  userLocation = new kakao.maps.LatLng(lat, lng);

  map = new kakao.maps.Map(document.getElementById('map'), {
    center: userLocation,
    level: 6
  });

  ps = new kakao.maps.services.Places(map);
  new kakao.maps.Marker({ position: userLocation, map });

  placeOverlay = new kakao.maps.CustomOverlay({ zIndex: 1 });

  searchGasStations(userLocation);
}

// 카카오 장소 API로 '주유소' 검색
function searchGasStations(location) {
  ps.categorySearch('OL7', placesSearchCB, {
    location,
    radius: currentRadius
  });
}

// API 응답 받으면 거리 계산 후 필터링
function placesSearchCB(data, status) {
  if (status === kakao.maps.services.Status.OK) {
    const filtered = data.filter(place => {
      const distance = getDistance(userLocation.getLat(), userLocation.getLng(), place.y, place.x);
      return distance <= currentRadius;
    });

    displayPlaces(filtered);
  }
}

// 주유소 마커 & 리스트 출력
function displayPlaces(places) {
  removeMarkers();
  const panel = document.querySelector(".station-panel");
  const listContainer = document.getElementById("stationList");
  listContainer.innerHTML = "";

  // 주유소 마커에 사용할 아이콘 정의
  const markerImage = new kakao.maps.MarkerImage(
    "/icon/gas-station(red).png",
    new kakao.maps.Size(27, 27),
    { offset: new kakao.maps.Point(16, 32) }
  );

  // 모든 주유소에 마커 표시 및 거리 계산
  const placesWithDistance = places.map(place => {
    const distance = getDistance(userLocation.getLat(), userLocation.getLng(), place.y, place.x);

    // 주유소명에 해당하는 가격 정보 가져오기
    const priceInfo = prices[place.place_name] || { 휘발유: 1690, 경유: 1540 };

    // 주유소 마커에 이미지 옵션 추가
    const marker = new kakao.maps.Marker({
      position: new kakao.maps.LatLng(place.y, place.x),
      map,
      image: markerImage // <- 여기에 이미지 적용!
    });
    markers.push(marker);

    kakao.maps.event.addListener(marker, 'click', () => {
      showPlaceInfo(marker, { ...place, priceInfo });
    });

    return { ...place, distance, marker, priceInfo };
  });

  // 가까운 거리 기준 정렬 후 전부 출력
  // const sortedPlaces = placesWithDistance.sort((a, b) => a.distance - b.distance);
  let sortedPlaces = [];

  if (currentSort === "gasoline") {
    sortedPlaces = placesWithDistance.sort((a, b) => {
      const aPrice = a.priceInfo?.휘발유 ?? Infinity;
      const bPrice = b.priceInfo?.휘발유 ?? Infinity;
      return aPrice - bPrice;
    });
  } else if (currentSort === "diesel") {
    sortedPlaces = placesWithDistance.sort((a, b) => {
      const aPrice = a.priceInfo?.경유 ?? Infinity;
      const bPrice = b.priceInfo?.경유 ?? Infinity;
      return aPrice - bPrice;
    });
  } else {
    sortedPlaces = placesWithDistance.sort((a, b) => a.distance - b.distance);
  }


  sortedPlaces.forEach(place => {
    const distanceKm = (place.distance / 1000).toFixed(1);
    const { 휘발유, 경유 } = place.priceInfo;

    const card = document.createElement("div");
    card.className = "station-card";
    card.innerHTML = `
      <h3>${place.place_name}</h3>
      <p>${place.road_address_name || place.address_name}</p>
      <p><strong>전화:</strong> ${place.phone || '정보 없음'}</p>
      <p><strong>거리:</strong> ${distanceKm} km</p>
      <p><strong>휘발유:</strong> ${휘발유.toLocaleString()}원</p>
      <p><strong>경유:</strong> ${경유.toLocaleString()}원</p>
    `;

    // 카드 클릭 시 해당 마커 위치로 지도 이동
    card.addEventListener("click", () => {
      const moveLatLon = new kakao.maps.LatLng(place.y, place.x);
      map.panTo(moveLatLon);
      showPlaceInfo(place.marker, place);
    });

    listContainer.appendChild(card);
  });

  panel.classList.add("show");
}

function removeMarkers() {
  markers.forEach(marker => marker.setMap(null));
  markers = [];
}


function showPlaceInfo(marker, place) {
  // 말풍선이 이미 열려 있으면 닫기
  if (currentOverlay && currentOverlay.getMap()) {
    currentOverlay.setMap(null);
    // 같은 마커를 다시 클릭한 경우 → 닫기만 하고 return
    if (currentOverlay.__marker === marker) {
      currentOverlay = null;
      return;
    }
  }

  const priceInfo = place.priceInfo || {};
  const gasolinePrice = priceInfo.휘발유?.toLocaleString() || '정보 없음';
  const dieselPrice = priceInfo.경유?.toLocaleString() || '정보 없음';

  const content = `
  <div class="custom-overlay-box">
    <div class="info-window">
      <strong>${place.place_name}</strong><br>
      주소: ${place.road_address_name || place.address_name}<br>
      <strong>휘발유:</strong> ${gasolinePrice}원<br>
      <strong>경유:</strong> ${dieselPrice}원<br>
    </div>
    <div class="overlay-tail"></div>
  </div>
`;
placeOverlay.setContent(content);

const overlay = new kakao.maps.CustomOverlay({
  content,
  position: marker.getPosition(),
  yAnchor: 1.5, 
  xAnchor: 0.5, // ✅ 마커 중심과 텍스트 박스 중앙 일치
  zIndex: 3
});


  overlay.setMap(map);
  overlay.__marker = marker; // ← 다시 클릭했는지 확인용
  currentOverlay = overlay;
}


function getDistance(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = deg2rad(lat2 - lat1);
  const dLng = deg2rad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + 
  Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c * 1000;
}

function deg2rad(deg) {
  return deg * (Math.PI / 180);
}

// Geolocation API로 현재 위치를 받아옴
window.onload = function () {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(initMap, () => {
      alert("위치 정보를 가져올 수 없습니다.");
    });
  } else {
    alert("이 브라우저에서는 위치 정보를 지원하지 않습니다.");
  }

  applyPanelBehavior("stationPanel", "handle");
  applyPanelBehavior("stationPanel2", "handle");
  
  //  최저가 주유소 휘발유/경유 가격 정렬 필터
  const sortSelect2 = document.getElementById("sortSelect2");
  if (sortSelect2) {
    sortSelect2.addEventListener("change", (e) => {
     currentSort = e.target.value;

      if (!userLocation) {
       alert("위치 정보를 아직 불러오지 못했습니다.");
       return;
    }

    searchGasStations(userLocation);
  });
}
};

  //  근처 주유소 휘발유/경유 가격 정렬 필터
const sortSelect = document.getElementById("sortSelect");
if (sortSelect) {
  sortSelect.addEventListener("change", (e) => {
    currentSort = e.target.value;
    if (!userLocation) {
      alert("위치 정보를 아직 불러오지 못했습니다.");
      return;
    }
    searchGasStations(userLocation);
  });
}

  // 거리 필터 셀렉트 박스 이벤트
const distanceSelect = document.getElementById("distanceSelect");
if (distanceSelect) {
  distanceSelect.addEventListener("change", (e) => {
    currentRadius = parseInt(e.target.value);
    if (!userLocation) {
      alert("위치 정보를 아직 불러오지 못했습니다.");
      return;
    }
    searchGasStations(userLocation);
  });
}

// 리스트 패널 슬라이드
function applyPanelBehavior(panelId, handleClass) {
  const panel = document.getElementById(panelId);
  const handle = panel?.querySelector(`.${handleClass}`);
  let startY, currentY, isDragging = false;

  if (handle) {
    // 드래그
    handle.addEventListener("mousedown", (e) => {
      startY = e.clientY;
      isDragging = true;
    });

  window.addEventListener("mousemove", (e) => {
    if (!isDragging) return;
    currentY = e.clientY;
    const diff = currentY - startY;
    if (diff < -30) panel.classList.add("show");
    if (diff > 30) panel.classList.remove("show");
  });

  window.addEventListener("mouseup", () => {
    isDragging = false;
  });

  // 터치 
  handle.addEventListener("touchstart", (e) => {
    startY = e.touches[0].clientY;
    isDragging = true;
  });

  window.addEventListener("touchmove", (e) => {
    if (!isDragging) return;
    currentY = e.touches[0].clientY;
    const diff = currentY - startY;
    if (diff < -30) panel.classList.add("show");
    if (diff > 30) panel.classList.remove("show");
  });

  window.addEventListener("touchend", () => {
    isDragging = false;
  });

  // 클릭
  handle.addEventListener("click", () => {
    panel.classList.toggle("show");
  });
}

//  내 위치 근처 최저가 목록 리스트 / 페이지 스크롤 분리
  // 지도 / 페이지 스크롤 분리
  window.addEventListener("DOMContentLoaded", () => {
    const panel = document.querySelector(".station-panel");
    const stationList = document.getElementById("stationList");
    const mapContainer = document.getElementById('map');
  
  
    if (panel && stationList) {
      panel.addEventListener("mouseenter", () => {
        if (window.fullpage_api) fullpage_api.setAutoScrolling(false);
      });
  
      panel.addEventListener("mouseleave", () => {
        if (window.fullpage_api) fullpage_api.setAutoScrolling(true);
      });
  
      // 마우스 휠 스크롤 되게 설정
      stationList.addEventListener("wheel", (e) => {
        e.stopPropagation();  // 페이지로 전달 막기
      }, { passive: false });
    }
  
     // 지도에 마우스 진입 시 fullPage.js 스크롤 해제
     if (mapContainer) {
      mapContainer.addEventListener("mouseenter", () => {
        fullpage_api.setAutoScrolling(false);
      });
  
      mapContainer.addEventListener("mouseleave", () => {
        fullpage_api.setAutoScrolling(true);
      });
    }
  });

};

  // 지도 띄워보기 테스트(내위치)
// var mapContainer = document.getElementById('map'), // 지도를 표시할 div 
//     mapOption = { 
//         center: new kakao.maps.LatLng(33.450701, 126.570667), // 지도의 중심좌표
//         level: 3 // 지도의 확대 레벨 
//     }; 

// var map = new kakao.maps.Map(mapContainer, mapOption); // 지도를 생성합니다

// // HTML5의 geolocation으로 사용할 수 있는지 확인합니다 
// if (navigator.geolocation) {
    
//     // GeoLocation을 이용해서 접속 위치를 얻어옵니다
//     navigator.geolocation.getCurrentPosition(function(position) {
        
//         var lat = position.coords.latitude, // 위도
//             lon = position.coords.longitude; // 경도
        
//         var locPosition = new kakao.maps.LatLng(lat, lon), // 마커가 표시될 위치를 geolocation으로 얻어온 좌표로 생성합니다
//             message = '<div style="padding:5px;">여기에 계신가요?!</div>'; // 인포윈도우에 표시될 내용입니다
        
//         // 마커와 인포윈도우를 표시합니다
//         displayMarker(locPosition, message);
            
//       });
    
// } else { // HTML5의 GeoLocation을 사용할 수 없을때 마커 표시 위치와 인포윈도우 내용을 설정합니다
    
//     var locPosition = new kakao.maps.LatLng(33.450701, 126.570667),    
//         message = 'geolocation을 사용할수 없어요..'
        
//     displayMarker(locPosition, message);
// }

// // 지도에 마커와 인포윈도우를 표시하는 함수입니다
// function displayMarker(locPosition, message) {

//     // 마커를 생성합니다
//     var marker = new kakao.maps.Marker({  
//         map: map, 
//         position: locPosition
//     }); 
    
//     var iwContent = message, // 인포윈도우에 표시할 내용
//         iwRemoveable = true;

//     // 인포윈도우를 생성합니다
//     var infowindow = new kakao.maps.InfoWindow({
//         content : iwContent,
//         removable : iwRemoveable
//     });
    
//     // 인포윈도우를 마커위에 표시합니다 
//     infowindow.open(map, marker);
    
//     // 지도 중심좌표를 접속위치로 변경합니다
//     map.setCenter(locPosition);      
// }    
  
