async function initMap() {
  if (!navigator.geolocation) {
    alert('위치 정보를 사용할 수 없습니다.');
    return;
  }

  navigator.geolocation.getCurrentPosition(async (pos) => {
    const lat = pos.coords.latitude;
    const lon = pos.coords.longitude;
    const accuracy = pos.coords.accuracy;

    const userPos = new kakao.maps.LatLng(lat, lon);

    const mapContainer = document.getElementById('map2');
    const mapOption = { center: userPos, level: 8 };
    const map2 = new kakao.maps.Map(mapContainer, mapOption);

    const locMarker = new kakao.maps.Marker({
      position: userPos,
      map: map2,
      title: '현재 위치',
      zIndex: 5
    });

    const accuracyCircle = new kakao.maps.Circle({
      center: userPos,
      radius: accuracy,
      strokeWeight: 1,
      strokeColor: '#007aff',
      strokeOpacity: 0.5,
      fillColor: '#007aff',
      fillOpacity: 0.1,
      map: map2
    });

    map2.panTo(userPos);

    try {
      // 연료 타입 파라미터 없이 모든 데이터 가져오기
      const res = await fetch(`/region?lat=${lat}&lon=${lon}`);
      const data = await res.json();

      const list = document.getElementById('station-list');
      list.innerHTML = '';
      let currentInfoWindow = null;

      const makeMarker = (station, type) => {
        const { lat, lon, OS_NM, PRICE, NEW_ADR } = station;
        const position = new kakao.maps.LatLng(lat, lon);

        function createEmojiMarker(emoji) {
          const canvas = document.createElement('canvas');
          canvas.width = 40;
          canvas.height = 40;
          const ctx = canvas.getContext('2d');
          ctx.font = '28px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(emoji, 20, 20);
          return canvas.toDataURL();
        }

        const emoji = type === 'gasoline' ? '⛽' : '🛢️';
        const imageSrc = createEmojiMarker(emoji);
        const markerImage = new kakao.maps.MarkerImage(imageSrc, new kakao.maps.Size(40, 40));

        const marker = new kakao.maps.Marker({
          map: map2,
          position,
          title: OS_NM,
          image: markerImage
        });

        const infoWindow = new kakao.maps.InfoWindow({
          content: `
            <div style="padding:8px; font-size:13px;">
              <strong>${OS_NM}</strong><br/>
              ${type === 'gasoline' ? '⛽ 가솔린' : '🛢️ 디젤'}<br/>
              💰 ${PRICE}원<br/>
              📍 ${NEW_ADR || '주소 정보 없음'}
            </div>`
        });

        kakao.maps.event.addListener(marker, 'click', () => {
          if (currentInfoWindow === infoWindow) {
            infoWindow.close();
            currentInfoWindow = null;
          } else {
            if (currentInfoWindow) currentInfoWindow.close();
            infoWindow.open(map2, marker);
            currentInfoWindow = infoWindow;
          }
        });

        const item = document.createElement('div');
        item.className = 'station-item';
        item.innerHTML = `
          <strong>${type === 'gasoline' ? '⛽ 가솔린' : '🛢️ 디젤'} - ${OS_NM}</strong><br/>
          💰 ${PRICE}원<br/>
          📍 ${NEW_ADR || '주소 정보 없음'}
        `;
        list.appendChild(item);
      };

      // 🚀 디젤과 가솔린 둘 다 출력
      data.gasoline?.forEach(station => makeMarker(station, 'gasoline'));
      data.diesel?.forEach(station => makeMarker(station, 'diesel'));

    } catch (err) {
      console.error("❌ 서버 호출 실패:", err);
      alert("서버 응답 오류가 발생했습니다.");
    }

  }, (err) => {
    console.error("❌ 위치 정보 에러:", err);
    alert("위치 정보를 가져오지 못했습니다.");
  }, {
    enableHighAccuracy: true,
    timeout: 10000,
    maximumAge: 0
  });
}

window.initMap = initMap;
console.log("initMap 실행됨");
