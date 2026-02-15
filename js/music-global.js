// 全局音乐播放器 - 让所有页面都能播放音乐
(function() {
  // inner.html 已自带音乐弹窗（通过 inner-modules.js），跳过
  if (document.getElementById('musicPopup')) return;

  var METING_API = 'https://api.qijieya.cn/meting/';
  var NCM_APIS = ['https://ncm.zhenxin.me', 'https://zm.i9mr.com', 'https://music.mcseekeri.com'];
  var DEFAULT_PLAYLIST = '2619366284';

  // 注入 APlayer CSS
  if (!document.querySelector('link[href*="APlayer"]')) {
    var link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://cdn.jsdelivr.net/npm/aplayer@1.10/dist/APlayer.min.css';
    document.head.appendChild(link);
  }

  // 注入音乐按钮
  var btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'side-icon side-icon-right';
  btn.id = 'musicIconBtn';
  btn.title = '留声机';
  btn.innerHTML = '<img src="assets/phonograph.svg" alt="留声机" class="side-icon-img" onerror="this.style.display=\'none\';this.nextElementSibling.style.display=\'block\'"><span class="side-icon-emoji" style="display:none">🎵</span>';
  document.body.appendChild(btn);

  // 注入音乐弹窗
  var popup = document.createElement('div');
  popup.className = 'music-popup';
  popup.id = 'musicPopup';
  popup.innerHTML =
    '<div class="music-window">' +
      '<div class="music-header">' +
        '<h3>留声机</h3>' +
        '<a href="music.html" target="_blank" class="music-open-new" title="在新窗口打开，可后台播放">新窗口</a>' +
        '<button type="button" class="music-close" id="musicClose">×</button>' +
      '</div>' +
      '<div class="music-meting-wrap">' +
        '<div class="music-search-row">' +
          '<input type="text" id="musicSearch" placeholder="搜索歌曲或歌单...">' +
          '<button type="button" id="musicSearchBtn">搜索</button>' +
        '</div>' +
        '<div id="musicMetingContainer"></div>' +
      '</div>' +
    '</div>';
  document.body.appendChild(popup);

  // 绑定打开/关闭事件
  btn.addEventListener('click', function() { popup.classList.add('open'); });
  document.getElementById('musicClose').addEventListener('click', function() { popup.classList.remove('open'); });
  popup.addEventListener('click', function(e) { if (e.target === popup) popup.classList.remove('open'); });

  // 动态加载脚本
  function loadScript(src) {
    return new Promise(function(resolve, reject) {
      if (document.querySelector('script[src="' + src + '"]')) { resolve(); return; }
      var s = document.createElement('script');
      s.src = src;
      s.onload = resolve;
      s.onerror = reject;
      document.body.appendChild(s);
    });
  }

  // 初始化音乐播放器
  async function boot() {
    try {
      await (window.StorageReady || Promise.resolve());
    } catch (_) {}
    if (typeof isLoggedIn === 'function' && !isLoggedIn()) return;

    try {
      if (!window.APlayer) {
        await loadScript('https://cdn.jsdelivr.net/npm/aplayer@1.10/dist/APlayer.min.js');
      }
      if (!window.MetingJSElement) {
        await loadScript('https://cdn.jsdelivr.net/npm/meting@2/dist/Meting.min.js');
      }
    } catch (e) {
      console.warn('Music player dependencies load failed:', e);
      return;
    }

    var container = document.getElementById('musicMetingContainer');
    if (!container) return;

    window.meting_api = METING_API;
    var aplayerInstance = null;

    function renderMeting(type, id) {
      container.innerHTML = '<meting-js server="netease" type="' + type + '" id="' + id + '" api="' + METING_API + '" theme="#e85a7a" loop="all" list-folded="true" list-max-height="220px" volume="0.7"></meting-js>';
    }

    renderMeting('playlist', DEFAULT_PLAYLIST);

    var searchInput = document.getElementById('musicSearch');
    var searchBtn = document.getElementById('musicSearchBtn');

    async function doSearch() {
      var q = searchInput.value.trim();
      if (!q) return;
      var statusEl = document.createElement('p');
      statusEl.className = 'music-search-status';
      statusEl.textContent = '搜索中...';
      container.innerHTML = '';
      container.appendChild(statusEl);

      try {
        var searchData = null;
        for (var i = 0; i < NCM_APIS.length; i++) {
          try {
            var r = await fetch(NCM_APIS[i] + '/search?keywords=' + encodeURIComponent(q) + '&limit=15');
            if (r.ok) { searchData = await r.json(); break; }
          } catch (_) {}
        }
        if (!searchData) throw new Error('API 不可用');
        var songs = (searchData.result && searchData.result.songs) || [];
        if (songs.length === 0) { statusEl.textContent = '未找到歌曲'; return; }

        var ids = songs.map(function(s) { return s.id; }).join(',');
        var urlData = null;
        for (var j = 0; j < NCM_APIS.length; j++) {
          try {
            var r2 = await fetch(NCM_APIS[j] + '/song/url/v1?id=' + ids + '&level=standard');
            if (r2.ok) { urlData = await r2.json(); break; }
          } catch (_) {}
        }
        if (!urlData) throw new Error('获取播放链接失败');
        var urlMap = {};
        ((urlData && urlData.data) || []).forEach(function(d) { if (d.url) urlMap[d.id] = d.url; });

        var list = songs.filter(function(s) { return urlMap[s.id]; }).slice(0, 15).map(function(s) {
          return {
            name: s.name,
            artist: (s.artists || []).map(function(a) { return a.name; }).join(' / '),
            url: urlMap[s.id],
            pic: (s.album && s.album.picId) ? 'https://p4.music.126.net/' + s.album.picId + '.jpg' : ''
          };
        });

        if (list.length === 0) { statusEl.textContent = '暂无可播放的歌曲'; return; }

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
    if (searchInput) searchInput.addEventListener('keypress', function(e) { if (e.key === 'Enter') doSearch(); });
  }

  // 等待 DOM 和登录状态就绪后启动
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
