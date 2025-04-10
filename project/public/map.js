window.addEventListener("DOMContentLoaded", function () {
let map, ps, markers = [], placeOverlay;
let userLocation;
let currentRadius = 3000; // 기본 반경 3km

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
    "/icon/gas-station(red).png", // public/icon 폴더에 저장한 아이콘 경로
    new kakao.maps.Size(27, 27),   // 아이콘 크기
    { offset: new kakao.maps.Point(16, 32) } // 기준점 (가운데 아래)
  );

  // 모든 주유소에 마커 표시 및 거리 계산
  const placesWithDistance = places.map(place => {
    const distance = getDistance(userLocation.getLat(), userLocation.getLng(), place.y, place.x);

    // 주유소 마커에 이미지 옵션 추가
    const marker = new kakao.maps.Marker({
      position: new kakao.maps.LatLng(place.y, place.x),
      map,
      image: markerImage // <- 여기에 이미지 적용!
    });
    markers.push(marker);

    kakao.maps.event.addListener(marker, 'click', () => {
      showPlaceInfo(marker, place);
    });

    return { ...place, distance, marker };
  });

  // 가까운 거리 기준 정렬 후 전부 출력
  const sortedPlaces = placesWithDistance.sort((a, b) => a.distance - b.distance);

  sortedPlaces.forEach(place => {
    const distanceKm = (place.distance / 1000).toFixed(1);

    const card = document.createElement("div");
    card.className = "station-card";
    card.innerHTML = `
      <h3>${place.place_name}</h3>
      <p>${place.road_address_name || place.address_name}</p>
      <p><strong>전화:</strong> ${place.phone || '정보 없음'}</p>
      <p><strong>거리:</strong> ${distanceKm} km</p>
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
  const content = `
    <div class="info-window">
      <strong>${place.place_name}</strong><br>
      주소: ${place.road_address_name || place.address_name}
    </div>`;
  placeOverlay.setContent(content);
  const markerPos = marker.getPosition();
  const adjustedPos = new kakao.maps.LatLng(
    markerPos.getLat() - 0.0003,  // 지도 주유소 정보 박스 약간 위로 이동
    markerPos.getLng()
  );
  placeOverlay.setPosition(adjustedPos); // <-- 변경된 위치로 설정
  placeOverlay.setMap(map);
}

function getDistance(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = deg2rad(lat2 - lat1);
  const dLng = deg2rad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c * 1000;
}

function deg2rad(deg) {
  return deg * (Math.PI / 180);
}

// Geolocation API로 현재 위치를 받아옴
window.onload = function () {
  const mapEl = document.getElementById("map");
  if (!mapEl) return; // map이 없으면 실행 안 함

  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(initMap, () => {
      alert("위치 정보를 가져올 수 없습니다.");
    });
  } else {
    alert("이 브라우저에서는 위치 정보를 지원하지 않습니다.");
  }
};

  // 리스트 패널 슬라이드
  const panel = document.querySelector(".station-panel");
  let startY, currentY, isDragging = false;
  const handle = document.querySelector(".handle");

  
  // 거리 필터 셀렉트 박스 이벤트
  const distanceSelect = document.getElementById("distanceSelect");
  if (distanceSelect) {
    distanceSelect.addEventListener("change", (e) => {
      currentRadius = parseInt(e.target.value);
      
      if(!userLocation){
        alert("위치 정보를 아직 불러오지 못했습니다.");
        return;
      }
      searchGasStations(userLocation);
  });

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
});
