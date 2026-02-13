// 影视推荐 - 想看/已看/搜索 三栏，豆瓣数据
const CORS_PROXIES = [
  (url) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
  (url) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
  (url) => `https://corsproxy.org/?${encodeURIComponent(url)}`,
];

const IMG_PROXY = (url) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;

async function fetchViaProxy(url) {
  let lastErr;
  for (const proxy of CORS_PROXIES) {
    try {
      const res = await fetch(proxy(url));
      if (!res.ok) throw new Error(res.status);
      return await res.text();
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr || new Error('请求失败');
}

function posterUrl(url) {
  if (!url || !url.startsWith('http')) return '';
  return IMG_PROXY(url);
}

let searchInput, searchBtn, searchResult, searchResultWrap, searchHint;
let moviesListWant, moviesListWatched, moviesEmptyWant, moviesEmptyWatched;
let movieModal, modalBackdrop, modalContent;
let currentTab = 'want';

function placeholderPoster() {
  return 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="100" height="140"><rect fill="#333" width="100" height="140"/><text x="50" y="70" fill="#666" text-anchor="middle" dy=".3em" font-size="12">无封面</text></svg>');
}

function escapeHtml(s) {
  if (!s) return '';
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

function getList() {
  return typeof getMovies === 'function' ? getMovies() : [];
}

function renderMovieCard(m) {
  const douban = m.doubanRating ? `<span class="rating-badge douban">豆瓣 ${m.doubanRating}</span>` : '';
  const ours = m.ourScore ? `<span class="rating-badge ours">我们 ${m.ourScore}</span>` : '';
  const ph = placeholderPoster();
  const posterSrc = m.poster ? posterUrl(m.poster) : ph;
  return `
    <div class="movie-card" data-id="${m.id}">
      <img class="movie-card-poster" src="${posterSrc}" alt="${escapeHtml(m.title)}" referrerpolicy="no-referrer" data-fallback="${ph.replace(/"/g, '&quot;')}" onerror="this.src=this.dataset.fallback||''">
      <div class="movie-card-body">
        <h3 class="movie-card-title">${escapeHtml(m.title)}</h3>
        <p class="movie-card-meta">${m.year || ''} ${m.runtime ? '· ' + m.runtime : ''}</p>
        <div class="rating-row">${douban}${ours}</div>
      </div>
    </div>
  `;
}

function hasAnyWatched(m) {
  const us = m.userStatus || {};
  return Object.values(us).some(s => s && s.watched);
}

function hasAnyWant(m) {
  const us = m.userStatus || {};
  return Object.values(us).some(s => s && s.wantToWatch);
}

function hasAnyStatus(m) {
  return hasAnyWatched(m) || hasAnyWant(m);
}

function renderMovies() {
  const list = getList();
  const wantList = list.filter(m => !hasAnyWatched(m) && (hasAnyWant(m) || !hasAnyStatus(m)));
  const watchedList = list.filter(m => hasAnyWatched(m));

  if (!moviesListWant || !moviesEmptyWant) return;

  if (wantList.length === 0) {
    moviesListWant.classList.add('hidden');
    moviesEmptyWant.classList.remove('hidden');
  } else {
    moviesListWant.classList.remove('hidden');
    moviesEmptyWant.classList.add('hidden');
    moviesListWant.innerHTML = wantList.map(renderMovieCard).join('');
  }

  if (moviesListWatched && moviesEmptyWatched) {
    if (watchedList.length === 0) {
      moviesListWatched.classList.add('hidden');
      moviesEmptyWatched.classList.remove('hidden');
    } else {
      moviesListWatched.classList.remove('hidden');
      moviesEmptyWatched.classList.add('hidden');
      moviesListWatched.innerHTML = watchedList.map(renderMovieCard).join('');
    }
  }
}

async function doSearch() {
  if (!searchInput || !searchBtn) return;
  const q = searchInput.value.trim();
  if (!q) {
    alert('请输入电影或剧集名称');
    return;
  }
  searchBtn.disabled = true;
  searchBtn.textContent = '搜索中...';
  if (searchHint) searchHint.classList.add('hidden');
  if (searchResult) { searchResult.classList.add('hidden'); searchResult.innerHTML = ''; }
  try {
    const url = `https://movie.douban.com/j/subject_suggest?q=${encodeURIComponent(q)}`;
    const text = await fetchViaProxy(url);
    const items = JSON.parse(text);
    if (!Array.isArray(items) || items.length === 0) {
      if (searchResult) { searchResult.innerHTML = '<p class="search-empty">未找到结果，换个关键词试试</p>'; searchResult.classList.remove('hidden'); }
      if (searchHint) searchHint.classList.add('hidden');
      return;
    }
    const filtered = items.filter(x => x.type === 'movie' || x.type === 'tv').slice(0, 8);
    if (filtered.length === 0) {
      if (searchResult) { searchResult.innerHTML = '<p class="search-empty">未找到影视结果</p>'; searchResult.classList.remove('hidden'); }
      if (searchHint) searchHint.classList.add('hidden');
      return;
    }
    const ph = placeholderPoster();
    if (searchResult) {
      searchResult.innerHTML = filtered.map(item => {
        const imgUrl = item.img ? posterUrl(item.img) : ph;
        const typeLabel = item.type === 'tv' ? '剧集' : '电影';
        return `
          <div class="search-result-card" data-douban-id="${item.id}">
            <img class="search-result-poster" src="${imgUrl}" alt="" referrerpolicy="no-referrer" data-fallback="${ph.replace(/"/g, '&quot;')}" onerror="this.src=this.dataset.fallback||''">
            <div class="search-result-info">
              <h4 class="search-result-title">${escapeHtml(item.title)}</h4>
              <p class="search-result-meta">${item.year || ''} · ${typeLabel}</p>
              <button type="button" class="search-add-btn" data-douban-id="${item.id}">添加</button>
            </div>
          </div>
        `;
      }).join('');
      searchResult.classList.remove('hidden');
    }
    if (searchHint) searchHint.classList.add('hidden');
  } catch (e) {
    if (searchResult) { searchResult.innerHTML = '<p class="search-empty">搜索失败，请检查网络后重试</p>'; searchResult.classList.remove('hidden'); }
    if (searchHint) searchHint.classList.add('hidden');
  }
  searchBtn.disabled = false;
  searchBtn.textContent = '搜索';
}

async function fetchDoubanDetail(doubanId) {
  const url = `https://movie.douban.com/j/subject_abstract?subject_id=${doubanId}`;
  const text = await fetchViaProxy(url);
  const data = JSON.parse(text);
  if (data.r !== 0 || !data.subject) return null;
  const s = data.subject;
  const shortComment = s.short_comment?.content || '';
  return {
    id: Date.now().toString(),
    doubanId: String(s.id),
    title: (s.title || '').replace(/\s*\([\d\s\-–—]+\)\s*$/, '').trim() || s.title,
    year: s.release_year || '',
    poster: s.cover || s.img || '',
    plot: shortComment,
    runtime: s.duration || '',
    doubanRating: s.rate || '',
    playUrl: '',
    ourScore: '',
    userStatus: {},
    directors: Array.isArray(s.directors) ? s.directors.join('、') : '',
    actors: Array.isArray(s.actors) ? s.actors.slice(0, 5).join('、') : '',
    types: Array.isArray(s.types) ? s.types.join('、') : '',
    region: s.region || '',
  };
}

function openModal(movie, isNew) {
  if (!modalContent || !movieModal) return;
  const users = typeof getUsers === 'function' ? getUsers() : [];
  const posterSrc = movie.poster ? posterUrl(movie.poster) : placeholderPoster();
  let html = `
    <img class="modal-poster" src="${posterSrc}" alt="" referrerpolicy="no-referrer" onerror="this.src='${placeholderPoster().replace(/'/g, "\\'")}'">
    <h3 class="modal-title">${escapeHtml(movie.title)}</h3>
    <p class="modal-meta">${movie.year || ''} ${movie.runtime ? '· ' + movie.runtime : ''}</p>
    ${movie.directors ? `<p class="modal-crew">导演：${escapeHtml(movie.directors)}</p>` : ''}
    ${movie.actors ? `<p class="modal-crew">主演：${escapeHtml(movie.actors)}</p>` : ''}
    ${movie.types ? `<p class="modal-crew">类型：${escapeHtml(movie.types)}</p>` : ''}
    <p class="modal-plot">${escapeHtml(movie.plot) || '暂无简介'}</p>
    <div class="modal-ratings">
      ${movie.doubanRating ? `<span class="rating-badge douban">豆瓣 ${movie.doubanRating}</span>` : ''}
      <span class="rating-badge ours">我们 <input type="number" id="modalOurScore" min="0" max="10" step="0.5" value="${movie.ourScore || ''}" placeholder="0-10" style="width:50px;background:transparent;border:none;color:inherit;font:inherit"></span>
    </div>
    <div class="play-link-wrap">
      <label>播放链接</label>
      <input type="url" id="modalPlayUrl" placeholder="粘贴播放地址" value="${escapeHtml(movie.playUrl || '')}">
    </div>
    <div class="user-status-wrap">
      <h4>观影状态</h4>
      ${users.map(u => {
        const s = movie.userStatus && movie.userStatus[u.id] || { watched: false, wantToWatch: false };
        return `
          <div class="user-status-item">
            <span>${escapeHtml(u.name || u.nickname || '用户')}</span>
            <label><input type="checkbox" data-user="${u.id}" data-type="watched" ${s.watched ? 'checked' : ''}> 看过</label>
            <label><input type="checkbox" data-user="${u.id}" data-type="wantToWatch" ${s.wantToWatch ? 'checked' : ''}> 想看</label>
          </div>
        `;
      }).join('')}
    </div>
    <div class="modal-actions">
      <button type="button" class="modal-save" id="modalSave">保存</button>
      ${isNew ? '' : '<button type="button" class="modal-delete" id="modalDelete">删除</button>'}
    </div>
  `;
  modalContent.innerHTML = html;
  movieModal.classList.remove('hidden');

  document.getElementById('modalSave').onclick = () => {
    const ourScore = document.getElementById('modalOurScore').value.trim();
    const playUrl = document.getElementById('modalPlayUrl').value.trim();
    const userStatus = {};
    modalContent.querySelectorAll('input[data-user]').forEach(inp => {
      const uid = inp.dataset.user;
      const type = inp.dataset.type;
      if (!userStatus[uid]) userStatus[uid] = { watched: false, wantToWatch: false };
      userStatus[uid][type] = inp.checked;
    });
    const updated = { ...movie, ourScore: ourScore || '', playUrl, userStatus };
    if (isNew) {
      const list = getList();
      list.unshift(updated);
      saveMovies(list);
    } else {
      const list = getList().map(m => m.id === movie.id ? updated : m);
      saveMovies(list);
    }
    closeModal();
    renderMovies();
  };

  if (!isNew) {
    document.getElementById('modalDelete').onclick = () => {
      if (!confirm('确定删除这部影视吗？')) return;
      const list = getList().filter(m => m.id !== movie.id);
      saveMovies(list);
      closeModal();
      renderMovies();
    };
  }
}

function closeModal() {
  if (movieModal) movieModal.classList.add('hidden');
}

function switchTab(tab) {
  currentTab = tab;
  document.querySelectorAll('.movies-tab').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  document.querySelectorAll('.movies-panel').forEach(p => p.classList.add('hidden'));
  const panel = document.getElementById('panel' + (tab === 'want' ? 'Want' : tab === 'watched' ? 'Watched' : 'Search'));
  if (panel) panel.classList.remove('hidden');
}

function initMovies() {
  if (!isLoggedIn()) {
    window.location.href = 'login.html?redirect=movies.html';
    return;
  }
  searchInput = document.getElementById('movieSearch');
  searchBtn = document.getElementById('movieSearchBtn');
  searchResult = document.getElementById('searchResult');
  searchResultWrap = document.getElementById('searchResultWrap');
  searchHint = document.getElementById('searchHint');
  moviesListWant = document.getElementById('moviesListWant');
  moviesListWatched = document.getElementById('moviesListWatched');
  moviesEmptyWant = document.getElementById('moviesEmptyWant');
  moviesEmptyWatched = document.getElementById('moviesEmptyWatched');
  movieModal = document.getElementById('movieModal');
  modalBackdrop = document.getElementById('modalBackdrop');
  modalContent = document.getElementById('modalContent');

  if (!searchInput || !moviesListWant) return;

  if (modalBackdrop) modalBackdrop.onclick = closeModal;

  document.querySelectorAll('.movies-tab').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  if (searchBtn) searchBtn.addEventListener('click', doSearch);
  if (searchInput) searchInput.addEventListener('keypress', e => { if (e.key === 'Enter') doSearch(); });

  if (searchResult) searchResult.addEventListener('click', async (e) => {
    const btn = e.target.closest('.search-add-btn');
    if (!btn) return;
    const doubanId = btn.dataset.doubanId;
    if (!doubanId) return;
    btn.disabled = true;
    btn.textContent = '加载中...';
    try {
      const movie = await fetchDoubanDetail(doubanId);
      if (movie) openModal(movie, true);
    } catch (err) {
      alert('获取详情失败，请重试');
    }
    btn.disabled = false;
    btn.textContent = '添加';
  });

  const bindListClick = (listEl) => {
    if (!listEl) return;
    listEl.addEventListener('click', (e) => {
      const card = e.target.closest('.movie-card');
      if (!card) return;
      const id = card.dataset.id;
      const movie = getList().find(m => m.id === id);
      if (movie) openModal(movie, false);
    });
  };
  bindListClick(moviesListWant);
  bindListClick(moviesListWatched);

  renderMovies();
}

document.addEventListener('DOMContentLoaded', async () => {
  await (window.StorageReady || Promise.resolve());
  initMovies();
});
