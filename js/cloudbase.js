// 腾讯云开发 云端存储桥接 - 配置后数据自动同步到云端
(function() {
  const CLOUD_KEYS = [
    'loveBase_users', 'loveBase_posts', 'loveBase_setupDone', 'loveBase_currentUser',
    'loveBase_loveDays', 'loveBase_lastCheckIn', 'loveBase_checkIns',
    'loveBase_messages', 'loveBase_chat', 'loveBase_albums', 'loveBase_movies',
    'loveBase_games', 'loveBase_travelPlaces', 'loveBase_todos', 'loveBase_wishes'
  ];
  const CLOUD_COLLECTION = 'LoveBase';
  const CHUNK_SIZE = 800000; // 单条文档约 1MB 限制，分块 800KB 留余量

  let cache = {};
  let saveTimer = null;
  let pendingKeys = new Set();

  function useCloud() {
    return typeof TENCENT_ENV_ID === 'string' && TENCENT_ENV_ID.length > 0;
  }

  function loadFromLocal() {
    const data = {};
    CLOUD_KEYS.forEach(k => {
      const v = localStorage.getItem(k);
      if (v !== null) data[k] = v;
    });
    return data;
  }

  function saveToLocal(data) {
    Object.keys(data).forEach(k => {
      try {
        localStorage.setItem(k, data[k]);
      } catch (e) {
        console.warn('本地存储空间不足，跳过本地回写:', k, e && e.message);
      }
    });
  }

  async function loadFromCloud() {
    if (typeof cloudbase === 'undefined') return loadFromLocal();
    try {
      const db = window.__cloudbaseApp.database();
      const col = db.collection(CLOUD_COLLECTION);
      const res = await col.limit(200).get();
      const docs = res.data || [];
      const data = {};
      const byKey = {};
      docs.forEach(doc => {
        const k = doc.key || doc._id;
        if (!k) return;
        const updated = doc._updatedAt || 0;
        if (!byKey[k] || updated > (byKey[k]._updatedAt || 0)) byKey[k] = doc;
      });
      CLOUD_KEYS.forEach(base => {
        const single = byKey[base];
        const partKeys = Object.keys(byKey).filter(x => x.startsWith(base + '_') && /_\d+$/.test(x));
        const singleTs = single && single._updatedAt ? single._updatedAt : 0;
        const chunkTs = partKeys.length ? Math.max(...partKeys.map(pk => (byKey[pk] && byKey[pk]._updatedAt) || 0)) : 0;
        if (partKeys.length && chunkTs >= singleTs) {
          partKeys.sort((a, b) => (parseInt(a.split('_').pop(), 10) || 0) - (parseInt(b.split('_').pop(), 10) || 0));
          const parts = partKeys.map(pk => byKey[pk] && byKey[pk].value).filter(Boolean);
          if (parts.length) data[base] = parts.join('');
        } else if (single && single.value !== undefined) {
          data[base] = typeof single.value === 'string' ? single.value : JSON.stringify(single.value);
        }
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
    const keysToSave = Array.from(pendingKeys).filter(k => CLOUD_KEYS.includes(k));
    pendingKeys.clear();
    if (keysToSave.length === 0) return;
    try {
      await window.StorageReady;
      const app = window.__cloudbaseApp;
      if (!app) return;
      const db = app.database();
      const col = db.collection(CLOUD_COLLECTION);
      for (const key of keysToSave) {
        const val = cache[key] !== undefined ? cache[key] : localStorage.getItem(key);
        if (val === undefined) continue;
        const strVal = typeof val === 'string' ? val : JSON.stringify(val);
        const docId = key.replace(/[^a-zA-Z0-9_-]/g, '_') || 'k';
        const ts = Date.now();
        if (strVal.length <= CHUNK_SIZE) {
          await col.doc(docId).set({ key: key, value: strVal, _updatedAt: ts });
        } else {
          const chunks = [];
          for (let i = 0; i < strVal.length; i += CHUNK_SIZE) {
            chunks.push(strVal.slice(i, i + CHUNK_SIZE));
          }
          try { await col.doc(docId).remove(); } catch (_) {}
          for (let i = 0; i < chunks.length; i++) {
            const chunkId = docId + '_' + i;
            await col.doc(chunkId).set({ key: chunkId, value: chunks[i], _updatedAt: ts });
          }
          console.log('腾讯云 大文档已分', chunks.length, '块保存:', key);
        }
      }
      console.log('腾讯云 保存成功，共', keysToSave.length, '条:', keysToSave.join(', '));
      // 保存后立即读回验证
      try {
        const verify = await col.limit(50).get();
        const docs = verify.data || [];
        console.log('腾讯云 验证读取：LoveBase 集合当前共', docs.length, '条文档，_id 示例:', docs.slice(0, 5).map(d => d._id || d.key));
        if (docs.length === 0) {
          console.warn('腾讯云 读取为空！请确认：1) 控制台进入「数据库」→「集合」→ LoveBase（不是 MySQL）2) 环境 ID 是否一致');
        }
      } catch (e) {
        console.warn('腾讯云 验证读取失败:', e.message);
      }
    } catch (e) {
      keysToSave.forEach(k => pendingKeys.add(k));
      console.warn('腾讯云 保存失败:', e.message, e);
    }
  }

  function debouncedSave(changedKey) {
    if (changedKey && CLOUD_KEYS.includes(changedKey)) pendingKeys.add(changedKey);
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

  window.__cloudbaseVerifyRead = async function() {
    if (!window.__cloudbaseApp) return console.warn('CloudBase 未初始化');
    try {
      const db = window.__cloudbaseApp.database();
      const res = await db.collection('LoveBase').limit(100).get();
      const docs = res.data || [];
      console.log('LoveBase 集合共', docs.length, '条文档');
      docs.forEach((d, i) => console.log('  [' + i + '] _id:', d._id, 'key:', d.key, 'value 长度:', (d.value && d.value.length) || 0));
      return docs;
    } catch (e) {
      console.error('读取失败:', e);
    }
  };

  window.CloudStorage = {
    getItem: function(key) {
      const v = cache[key] !== undefined ? cache[key] : localStorage.getItem(key);
      return v;
    },
    setItem: function(key, val) {
      cache[key] = val;
      try {
        localStorage.setItem(key, val);
      } catch (e) {
        console.warn('本地存储空间不足，已跳过本地写入，继续尝试云端同步:', key, e && e.message);
      }
      if (useCloud() && CLOUD_KEYS.includes(key)) debouncedSave(key);
    },
    removeItem: function(key) {
      delete cache[key];
      localStorage.removeItem(key);
      if (useCloud() && CLOUD_KEYS.includes(key)) debouncedSave(key);
    }
  };
})();
