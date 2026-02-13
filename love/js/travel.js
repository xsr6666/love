// 旅行地图 - Leaflet 全球地图，可拖拽缩放、点击标记
// 预设地点（纬度, 经度）
const PLACES = [
  { id: 'beijing', name: '北京', lat: 39.9, lng: 116.4 },
  { id: 'shanghai', name: '上海', lat: 31.2, lng: 121.5 },
  { id: 'chengdu', name: '成都', lat: 30.6, lng: 104.0 },
  { id: 'xiamen', name: '厦门', lat: 24.4, lng: 118.0 },
  { id: 'sanya', name: '三亚', lat: 18.2, lng: 109.5 },
  { id: 'hangzhou', name: '杭州', lat: 30.2, lng: 120.2 },
  { id: 'suzhou', name: '苏州', lat: 31.3, lng: 120.6 },
  { id: 'qingdao', name: '青岛', lat: 36.0, lng: 120.3 },
  { id: 'dali', name: '大理', lat: 25.6, lng: 100.2 },
  { id: 'xian', name: '西安', lat: 34.2, lng: 108.9 },
  { id: 'guilin', name: '桂林', lat: 25.2, lng: 110.3 },
  { id: 'hk', name: '香港', lat: 22.3, lng: 114.2 },
  { id: 'taiwan', name: '台湾', lat: 25.0, lng: 121.5 },
  { id: 'tokyo', name: '东京', lat: 35.6, lng: 139.7 },
  { id: 'paris', name: '巴黎', lat: 48.8, lng: 2.3 },
  { id: 'london', name: '伦敦', lat: 51.5, lng: -0.1 },
  { id: 'nyc', name: '纽约', lat: 40.7, lng: -74.0 },
  { id: 'sydney', name: '悉尼', lat: -33.8, lng: 151.2 },
  { id: 'bangkok', name: '曼谷', lat: 13.7, lng: 100.5 },
  { id: 'singapore', name: '新加坡', lat: 1.3, lng: 103.8 },
];

document.addEventListener('DOMContentLoaded', async () => {
  await (window.StorageReady || Promise.resolve());
  if (!isLoggedIn()) {
    window.location.href = 'login.html?redirect=travel.html';
    return;
  }

  const savedBg = (localStorage.getItem('loveBase_bgImageInner') || '') || localStorage.getItem('loveBase_bgImage') || DEFAULT_BG;
  const bg = document.getElementById('travelBg');
  if (bg) bg.style.backgroundImage = `url('${savedBg}')`;

  const mapContainer = document.getElementById('travelMap');
  const modal = document.getElementById('placeModal');
  const backdrop = document.getElementById('placeModalBackdrop');
  const content = document.getElementById('placeModalContent');
  const addPlaceBtn = document.getElementById('addPlaceBtn');
  const fitWorldBtn = document.getElementById('fitWorldBtn');

  const users = getUsers();
  const me = getCurrentUser();
  let travelData = getTravelPlaces();
  let map = null;
  let markersLayer = null;
  let addPlaceMode = false;

  // 获取所有地点（预设 + 用户添加）
  function getAllPlaces() {
    const custom = Object.entries(travelData)
      .filter(([id, d]) => id.startsWith('custom_') && d.lat != null && d.lng != null)
      .map(([id, d]) => ({ id, name: d.name || '未命名', lat: d.lat, lng: d.lng }));
    return [...PLACES, ...custom];
  }

  function isPlaceVisited(placeId) {
    const data = travelData[placeId];
    if (!data || !data.albumId) return false;
    const posts = getVisiblePosts(me.id).filter(p => p.albumId === data.albumId);
    const hasPhotos = posts.some(p => getPostImages(p).length > 0);
    const hasCheckIn = data.checkIns && Object.keys(data.checkIns).length > 0;
    return hasPhotos || hasCheckIn;
  }

  function ensurePlaceAlbum(placeId, placeName) {
    if (travelData[placeId]?.albumId) return travelData[placeId].albumId;
    const albumId = 'place_' + placeId;
    const albums = getAlbums();
    if (!albums.find(a => a.id === albumId)) {
      albums.push({ id: albumId, name: placeName });
      saveAlbums(albums);
    }
    travelData[placeId] = travelData[placeId] || {};
    travelData[placeId].albumId = albumId;
    travelData[placeId].name = placeName;
    saveTravelPlaces(travelData);
    return albumId;
  }

  function travelCheckIn(placeId) {
    const today = new Date().toDateString();
    travelData[placeId] = travelData[placeId] || {};
    travelData[placeId].checkIns = travelData[placeId].checkIns || {};
    travelData[placeId].checkIns[me.id] = today;
    saveTravelPlaces(travelData);
  }

  function hasTravelCheckedIn(placeId) {
    const today = new Date().toDateString();
    return travelData[placeId]?.checkIns?.[me.id] === today;
  }

  function createMarkerIcon(visited) {
    return L.divIcon({
      className: 'travel-marker',
      html: `<span class="marker-pin ${visited ? 'visited' : ''}">📍</span>`,
      iconSize: [36, 36],
      iconAnchor: [18, 36],
    });
  }

  function renderMap() {
    if (!map) return;
    if (markersLayer) map.removeLayer(markersLayer);
    markersLayer = L.layerGroup();

    const places = getAllPlaces();
    places.forEach(p => {
      const visited = isPlaceVisited(p.id);
      const marker = L.marker([p.lat, p.lng], { icon: createMarkerIcon(visited) });
      marker.placeId = p.id;
      marker.placeName = p.name;
      marker.on('click', () => {
        if (addPlaceMode) return;
        openPlaceModal(p.id, p.name);
      });
      marker.bindTooltip(p.name, {
        permanent: false,
        direction: 'top',
        offset: [0, -8],
        className: 'travel-tooltip',
      });
      markersLayer.addLayer(marker);
    });

    map.addLayer(markersLayer);
  }

  function openPlaceModal(placeId, placeName) {
    ensurePlaceAlbum(placeId, placeName);
    const albumId = travelData[placeId].albumId;
    const posts = getVisiblePosts(me.id).filter(p => p.albumId === albumId);
    const photos = [];
    posts.forEach(p => {
      getPostImages(p).forEach(img => photos.push({ img, postId: p.id, userId: p.userId }));
    });
    const checkedToday = hasTravelCheckedIn(placeId);

    content.innerHTML = `
      <h3>${placeName}</h3>
      <button type="button" class="place-checkin-btn ${checkedToday ? 'done' : ''}" id="placeCheckinBtn" data-id="${placeId}">
        ${checkedToday ? '✓ 今日已打卡' : '📍 今日打卡'}
      </button>
      <div class="place-photos-wrap">
        <p style="font-size:0.9rem;color:#666;margin-bottom:0.6rem">相册</p>
        <div class="place-photos" id="placePhotos">
          ${photos.slice(0, 9).map(ph => `
            <div class="place-photo"><img src="${ph.img}" alt=""></div>
          `).join('')}
        </div>
        ${photos.length === 0 ? '<p class="place-empty">暂无照片</p>' : ''}
      </div>
      <p style="text-align:center;margin-top:1rem">
        <a href="post.html?album=${encodeURIComponent(albumId)}" class="place-publish-link">📷 去发布到 ${placeName}</a>
      </p>
      ${placeId.startsWith('custom_') ? `<button type="button" class="place-del-btn" id="placeDelBtn" data-id="${placeId}">删除此地</button>` : ''}
    `;
    modal.classList.remove('hidden');

    if (!checkedToday) {
      content.querySelector('#placeCheckinBtn').addEventListener('click', () => {
        travelCheckIn(placeId);
        content.querySelector('#placeCheckinBtn').className = 'place-checkin-btn done';
        content.querySelector('#placeCheckinBtn').textContent = '✓ 今日已打卡';
        renderMap();
      });
    }

    const delBtn = content.querySelector('#placeDelBtn');
    if (delBtn) {
      delBtn.addEventListener('click', () => {
        if (!confirm('确定删除此地？')) return;
        delete travelData[placeId];
        saveTravelPlaces(travelData);
        modal.classList.add('hidden');
        renderMap();
      });
    }
  }

  function initLeafletMap() {
    map = L.map('travelMap', {
      center: [25, 105],
      zoom: 3,
      zoomControl: false,
      attributionControl: false,
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
    }).addTo(map);

    map.addControl(L.control.zoom({ position: 'topright' }));

    map.on('click', (e) => {
      if (!addPlaceMode) return;
      const name = prompt('输入地点名称：');
      if (!name || !name.trim()) return;
      const placeId = 'custom_' + Date.now();
      travelData[placeId] = {
        lat: e.latlng.lat,
        lng: e.latlng.lng,
        name: name.trim(),
      };
      ensurePlaceAlbum(placeId, name.trim());
      saveTravelPlaces(travelData);
      addPlaceMode = false;
      addPlaceBtn.classList.remove('active');
      map.dragging.enable();
      if (map.scrollWheelZoom) map.scrollWheelZoom.enable();
      if (map.doubleClickZoom) map.doubleClickZoom.enable();
      renderMap();
      openPlaceModal(placeId, name.trim());
    });
  }

  addPlaceBtn.addEventListener('click', () => {
    addPlaceMode = !addPlaceMode;
    addPlaceBtn.classList.toggle('active', addPlaceMode);
    if (addPlaceMode) {
      map.dragging.disable();
      if (map.scrollWheelZoom) map.scrollWheelZoom.disable();
      if (map.doubleClickZoom) map.doubleClickZoom.disable();
    } else {
      map.dragging.enable();
      if (map.scrollWheelZoom) map.scrollWheelZoom.enable();
      if (map.doubleClickZoom) map.doubleClickZoom.enable();
    }
  });

  fitWorldBtn.addEventListener('click', () => {
    map.setView([25, 105], 3);
  });

  backdrop.addEventListener('click', () => modal.classList.add('hidden'));

  initLeafletMap();
  renderMap();
});
