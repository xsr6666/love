// 腾讯云开发 云端存储桥接 - 配置后数据自动同步到云端
(function() {
  const CLOUD_KEYS = [
    'loveBase_users', 'loveBase_posts', 'loveBase_setupDone', 'loveBase_currentUser',
    'loveBase_loveDays', 'loveBase_lastCheckIn', 'loveBase_checkIns',
    'loveBase_messages', 'loveBase_chat', 'loveBase_albums', 'loveBase_movies',
    'loveBase_games', 'loveBase_travelPlaces', 'loveBase_todos', 'loveBase_wishes',
    'loveBase_bgImage', 'loveBase_bgImageInner', 'loveBase_bgVideo', 'loveBase_omdbKey'
  ];
  const CLOUD_COLLECTION = 'LoveBase';

  let cache = {};
  let saveTimer = null;
  /** 超出 localStorage 配额的数据，仅存内存，避免写入失败 */
  let overflowKeys = {};

  function useCloud() {
    return typeof TENCENT_ENV_ID === 'string' && TENCENT_ENV_ID.length > 0;
  }

  function loadFromLocal() {
    const data = {};
    CLOUD_KEYS.forEach(k => {
      const v = overflowKeys[k] !== undefined ? overflowKeys[k] : localStorage.getItem(k);
      if (v !== null && v !== undefined) data[k] = v;
    });
    return data;
  }

  function saveToLocal(data) {
    Object.keys(data).forEach(k => {
      try {
        localStorage.setItem(k, data[k]);
        delete overflowKeys[k];
      } catch (e) {
        overflowKeys[k] = data[k];
        console.warn('本地存储超限，已暂存内存:', k, '(约', Math.round((data[k].length || 0) / 1024), 'KB)');
      }
    });
  }

  async function loadFromCloud() {
    if (typeof cloudbase === 'undefined') return loadFromLocal();
    try {
      const db = window.__cloudbaseApp.database();
      const col = db.collection(CLOUD_COLLECTION);
      const res = await col.limit(100).get();
      const data = {};
      (res.data || []).forEach(doc => {
        const k = doc.key || doc._id;
        const v = doc.value;
        if (k && v !== undefined) data[k] = typeof v === 'string' ? v : JSON.stringify(v);
      });
      if (Object.keys(data).length > 0) {
        saveToLocal(data);
        return data;
      }
    } catch (e) { console.warn('腾讯云 加载失败:', e.message); }
    return loadFromLocal();
  }

  async function saveToCloud() {
    if (typeof cloudbase === 'undefined') return;
    try {
      await window.StorageReady; // 等待匿名登录完成后再写入
      const app = window.__cloudbaseApp;
      if (!app) return;
      const data = loadFromLocal();
      const db = app.database();
      const col = db.collection(CLOUD_COLLECTION);
      for (const key of Object.keys(data)) {
        if (!CLOUD_KEYS.includes(key)) continue;
        const docId = key.replace(/[^a-zA-Z0-9_-]/g, '_') || 'k';
        await col.doc(docId).set({ key: key, value: data[key] });
      }
      console.log('腾讯云 保存成功');
    } catch (e) {
      console.warn('腾讯云 保存失败:', e.message, e);
    }
  }

  function debouncedSave() {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => { saveToCloud(); saveTimer = null; }, 500);
  }

  window.StorageReady = (async function() {
    if (!useCloud()) {
      cache = loadFromLocal();
      return;
    }
    if (typeof cloudbase === 'undefined') {
      console.warn('腾讯云 SDK 未加载，使用本地存储');
      cache = loadFromLocal();
      return;
    }
    try {
      const app = cloudbase.init({
        env: TENCENT_ENV_ID,
        region: 'ap-shanghai'
      });
      window.__cloudbaseApp = app;
      await app.auth().signInAnonymously();
      cache = await loadFromCloud();
    } catch (e) {
      console.warn('腾讯云 初始化失败:', e.message, e);
      cache = loadFromLocal();
    }
  })();

  window.CloudStorage = {
    getItem: function(key) {
      const v = cache[key] !== undefined ? cache[key] : (overflowKeys[key] !== undefined ? overflowKeys[key] : localStorage.getItem(key));
      return v;
    },
    setItem: function(key, val) {
      cache[key] = val;
      try {
        localStorage.setItem(key, val);
        delete overflowKeys[key];
      } catch (e) {
        overflowKeys[key] = val;
      }
      if (useCloud() && CLOUD_KEYS.includes(key)) debouncedSave();
    },
    removeItem: function(key) {
      delete cache[key];
      delete overflowKeys[key];
      localStorage.removeItem(key);
      if (useCloud() && CLOUD_KEYS.includes(key)) debouncedSave();
    }
  };
})();
