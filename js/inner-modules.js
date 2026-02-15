// 动态分享、聊天、音乐模块
document.addEventListener('DOMContentLoaded', async () => {
  // 先显示加载状态
  const feedListEl = document.getElementById('feedListMini');
  if (feedListEl) feedListEl.innerHTML = '<p class="feed-loading-mini">加载中...</p>';

  try {
    await (window.StorageReady || Promise.resolve());
  } catch (_) {}

  // 不再因 isLoggedIn 静默跳过，让各模块自行处理
  try { initFeed(); } catch (e) { console.warn('[模块] 动态初始化失败:', e.message); }
  try { initChat(); } catch (e) { console.warn('[模块] 聊天初始化失败:', e.message); }
  try { initMusic(); } catch (e) { console.warn('[模块] 音乐初始化失败:', e.message); }

  const musicIconBtn = document.getElementById('musicIconBtn');
  const musicPopup = document.getElementById('musicPopup');
  const musicClose = document.getElementById('musicClose');
  // 点击音乐图标：在新标签页打开，实现后台播放（切换页面不中断）
  if (musicIconBtn) musicIconBtn.addEventListener('click', () => window.open('music.html', '_blank', 'noopener'));
  if (musicClose) musicClose.addEventListener('click', () => musicPopup.classList.remove('open'));
  if (musicPopup) musicPopup.addEventListener('click', (e) => e.target === musicPopup && musicPopup.classList.remove('open'));
});

function initFeed() {
  const feedList = document.getElementById('feedListMini');
  if (!feedList) return;

  function render() {
    const me = getCurrentUser();
    if (!me) {
      feedList.innerHTML = '<p class="feed-empty-mini">请先<a href="login.html">登录</a></p>';
      return;
    }
    const posts = getVisiblePosts(me.id);
    const users = getUsers();
    if (posts.length === 0) {
      feedList.innerHTML = '<p class="feed-empty-mini">暂无动态，<a href="feed.html">去发布第一条</a></p>';
      return;
    }
    const showPosts = posts.slice(0, 6);
    const hasMore = posts.length > 6;
    feedList.innerHTML = showPosts.map(p => {
      const user = users.find(u => u.id === p.userId) || { name: '?', avatar: '' };
      const time = formatTime(p.timestamp);
      const avatarHtml = user.avatar
        ? `<span class="post-avatar has-avatar" style="background-image:url('${user.avatar}')"></span>`
        : `<span class="post-avatar">${user.name[0] || '?'}</span>`;
      const imgs = getPostImages(p);
      const imgHtml = imgs.length ? `<div class="post-imgs-mini">${imgs.slice(0, 3).map(src => `<div class="post-img-mini"><img src="${src}" alt=""></div>`).join('')}${imgs.length > 3 ? `<span class="img-more">+${imgs.length - 3}</span>` : ''}</div>` : '';
      return `
        <a href="feed.html" class="feed-item-mini">
          <div class="feed-item-main">
            <div class="feed-item-header">
              ${avatarHtml}
              <span class="feed-item-name">${escapeHtml(user.name)}</span>
              <span class="feed-item-time">${time}</span>
            </div>
            ${p.content ? `<p class="feed-item-content">${escapeHtml(p.content)}</p>` : ''}
          </div>
          ${imgHtml}
        </a>
      `;
    }).join('') + (hasMore ? `<a href="feed.html" class="feed-more-link">查看详情 · 共${posts.length}条</a>` : '');
  }

  function formatTime(ts) {
    const d = new Date(ts);
    const n = new Date();
    const diff = n - d;
    if (diff < 3600000) return Math.floor(diff / 60000) + '分钟前';
    if (diff < 86400000) return Math.floor(diff / 3600000) + '小时前';
    return (d.getMonth() + 1) + '/' + d.getDate();
  }

  function escapeHtml(t) {
    const d = document.createElement('div');
    d.textContent = t;
    return d.innerHTML.replace(/\n/g, '<br>');
  }

  render();
}

function initChat() {
  const pandaBtn = document.getElementById('pandaBtn');
  const chatPopup = document.getElementById('chatPopup');
  const chatClose = document.getElementById('chatClose');
  const chatMessages = document.getElementById('chatMessages');
  const chatInput = document.getElementById('chatInput');
  const chatSendBtn = document.getElementById('chatSendBtn');
  if (!chatMessages || !chatInput) return;

  if (pandaBtn) pandaBtn.addEventListener('click', () => chatPopup.classList.add('open'));
  if (chatClose) chatClose.addEventListener('click', () => chatPopup.classList.remove('open'));
  if (chatPopup) chatPopup.addEventListener('click', (e) => e.target === chatPopup && chatPopup.classList.remove('open'));

  const me = getCurrentUser();
  if (!me) {
    chatMessages.innerHTML = '<p class="chat-empty">请先<a href="login.html">登录</a>后使用聊天</p>';
    return;
  }
  const users = getUsers();
  const other = users.find(u => u.id !== me.id);
  const otherName = other ? other.name : 'TA';

  function render() {
    const msgs = getChatMessages();
    if (msgs.length === 0) {
      chatMessages.innerHTML = '<p class="chat-empty">暂无消息，开始聊天吧</p>';
      chatMessages.scrollTop = 0;
      return;
    }
    chatMessages.innerHTML = msgs.map(m => {
      const isMe = m.fromUserId === me.id;
      const sender = users.find(u => u.id === m.fromUserId);
      const name = sender ? sender.name : '?';
      const time = new Date(m.timestamp);
      const timeStr = (time.getMonth() + 1) + '/' + time.getDate() + ' ' + (time.getHours() + '').padStart(2, '0') + ':' + (time.getMinutes() + '').padStart(2, '0');
      return `
        <div class="chat-msg ${isMe ? 'chat-msg-me' : ''}">
          <span class="chat-msg-meta">${name} · ${timeStr}</span>
          <p class="chat-msg-content">${escapeHtml(m.content)}</p>
        </div>
      `;
    }).join('');
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  render();

  function escapeHtml(t) {
    const d = document.createElement('div');
    d.textContent = t;
    return d.innerHTML.replace(/\n/g, '<br>');
  }

  function send() {
    const content = chatInput.value.trim();
    if (!content) return;
    addChatMessage({ fromUserId: me.id, content });
    chatInput.value = '';
    render();
  }

  chatSendBtn.addEventListener('click', send);
  chatInput.addEventListener('keypress', (e) => e.key === 'Enter' && (e.preventDefault(), send()));
}

const METING_API = 'https://api.qijieya.cn/meting/';
const NCM_APIS = ['https://ncm.zhenxin.me', 'https://zm.i9mr.com', 'https://music.mcseekeri.com'];
const DEFAULT_PLAYLIST = '2619366284';

function initMusic() {
  const container = document.getElementById('musicMetingContainer');
  const searchInput = document.getElementById('musicSearch');
  const searchBtn = document.getElementById('musicSearchBtn');
  if (!container) return;

  window.meting_api = METING_API;
  let aplayerInstance = null;

  function renderMeting(type, id) {
    container.innerHTML = `<meting-js server="netease" type="${type}" id="${id}" api="${METING_API}" theme="#e85a7a" loop="all" list-folded="true" list-max-height="220px" volume="0.7"></meting-js>`;
  }

  renderMeting('playlist', DEFAULT_PLAYLIST);

  async function doSearch() {
    const q = searchInput.value.trim();
    if (!q) return;
    const statusEl = document.createElement('p');
    statusEl.className = 'music-search-status';
    statusEl.textContent = '搜索中...';
    container.innerHTML = '';
    container.appendChild(statusEl);

    try {
      let searchData = null;
      for (const api of NCM_APIS) {
        try {
          const r = await fetch(`${api}/search?keywords=${encodeURIComponent(q)}&limit=15`);
          if (r.ok) { searchData = await r.json(); break; }
        } catch (_) {}
      }
      if (!searchData) throw new Error('API 不可用');
      const songs = searchData?.result?.songs || [];
      if (songs.length === 0) {
        statusEl.textContent = '未找到歌曲';
        return;
      }

      const ids = songs.map(s => s.id).join(',');
      let urlData = null;
      for (const api of NCM_APIS) {
        try {
          const r = await fetch(`${api}/song/url/v1?id=${ids}&level=standard`);
          if (r.ok) { urlData = await r.json(); break; }
        } catch (_) {}
      }
      if (!urlData) throw new Error('获取播放链接失败');
      const urlMap = {};
      (urlData?.data || []).forEach(d => { if (d.url) urlMap[d.id] = d.url; });

      const list = songs.filter(s => urlMap[s.id]).slice(0, 15).map(s => ({
        name: s.name,
        artist: (s.artists || []).map(a => a.name).join(' / '),
        url: urlMap[s.id],
        pic: s.album?.picId ? `https://p4.music.126.net/${s.album.picId}.jpg` : ''
      }));

      if (list.length === 0) {
        statusEl.textContent = '暂无可播放的歌曲';
        return;
      }

      container.innerHTML = '<div id="aplayerSearch"></div>';
      if (aplayerInstance) aplayerInstance.destroy();
      aplayerInstance = new APlayer({
        container: document.getElementById('aplayerSearch'),
        listFolded: true,
        listMaxHeight: '220px',
        theme: '#e85a7a',
        loop: 'all',
        volume: 0.7,
        audio: list
      });
    } catch (e) {
      statusEl.textContent = '搜索失败，请重试';
    }
  }

  if (searchBtn) searchBtn.addEventListener('click', doSearch);
  if (searchInput) searchInput.addEventListener('keypress', (e) => e.key === 'Enter' && doSearch());
}
