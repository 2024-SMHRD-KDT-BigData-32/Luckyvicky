// public/map.js
let map, ps, markers = [], placeOverlay;

function initMap(position) {
  const lat = position.coords.latitude;
  const lng = position.coords.longitude;
  const userLocation = new kakao.maps.LatLng(lat, lng);

  map = new kakao.maps.Map(document.getElementById('map'), {
    center: userLocation,
    level: 6
  });

  ps = new kakao.maps.services.Places(map);

  new kakao.maps.Marker({
    position: userLocation,
    map: map
  });

  placeOverlay = new kakao.maps.CustomOverlay({ zIndex: 1 });

  searchGasStations(userLocation);
}

function searchGasStations(location) {
  ps.categorySearch('OL7', placesSearchCB, {
    location: location,
    radius: 3000
  });
}

function placesSearchCB(data, status) {
  if (status === kakao.maps.services.Status.OK) {
    displayPlaces(data);
  }
}

function displayPlaces(places) {
  removeMarkers();
  
     // 주유소 마커에 사용할 아이콘 정의
     const markerImage = new kakao.maps.MarkerImage(
      "/icon/gas-station(red).png",         // public/icon 폴더에 저장한 아이콘 경로
      new kakao.maps.Size(27, 27),          // 아이콘 크기
      { offset: new kakao.maps.Point(16, 32) } // 기준점 (가운데 아래)
    );
  
    for (let i = 0; i < places.length; i++) {
      const position = new kakao.maps.LatLng(places[i].y, places[i].x);
      // 주유소 마커에 이미지 옵션 추가
      const marker = new kakao.maps.Marker({
          position,
          map,
          image: markerImage  // ← 여기에 이미지 적용!
        }); 
    markers.push(marker);

    kakao.maps.event.addListener(marker, 'click', () => {
      showPlaceInfo(marker, places[i]);
    });
  }
}

function showPlaceInfo(marker, place) {
  const content = `
    <div class="info-window">
      <strong>${place.place_name}</strong><br>
      주소: ${place.road_address_name || place.address_name}
    </div>`;

  placeOverlay.setContent(content);
  placeOverlay.setPosition(marker.getPosition());
  placeOverlay.setMap(map);
}

function removeMarkers() {
  markers.forEach(marker => marker.setMap(null));
  markers = [];
}

window.onload = function () {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(initMap, () => {
      alert("위치 정보를 가져올 수 없습니다.");
    });
  } else {
    alert("이 브라우저에서는 위치 정보를 지원하지 않습니다.");
  }
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