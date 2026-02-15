// 腾讯云开发 云端存储桥接 - 配置后数据自动同步到云端
(function() {
  const CLOUD_KEYS = [
    'loveBase_users', 'loveBase_posts', 'loveBase_setupDone', 'loveBase_currentUser',
    'loveBase_loveDays', 'loveBase_lastCheckIn', 'loveBase_checkIns',
    'loveBase_messages', 'loveBase_chat', 'loveBase_albums', 'loveBase_movies',
    'loveBase_games', 'loveBase_travelPlaces', 'loveBase_todos', 'loveBase_wishes',
    'loveBase_bgImage', 'loveBase_bgImageInner', 'loveBase_bgVideo'
  ];
  const CLOUD_COLLECTION = 'LoveBase';
  const CHUNK_SIZE = 500000; // 500KB per chunk（留足余量，避免超出 1MB 文档上限）
  const META_KEY = 'loveBase_localMeta';

  let cache = {};
  let saveTimer = null;
  let pendingKeys = new Set();

  function useCloud() {
    return typeof TENCENT_ENV_ID === 'string' && TENCENT_ENV_ID.length > 0;
  }

  // ---- 本地修改时间追踪 ----
  function getLocalMeta() {
    try { return JSON.parse(localStorage.getItem(META_KEY) || '{}'); }
    catch (_) { return {}; }
  }
  function setLocalMeta(meta) {
    try { localStorage.setItem(META_KEY, JSON.stringify(meta)); }
    catch (_) {}
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
      try { localStorage.setItem(k, data[k]); }
      catch (e) { console.warn('[云桥] 本地存储写入失败:', k, e && e.message); }
    });
  }

  // ---- 读取云端时间戳（兼容新旧字段名） ----
  function getDocTs(doc) {
    return doc.updatedAt || doc._updatedAt || 0;
  }

  // ---- 确保匿名登录有效 ----
  async function ensureAuth() {
    const app = window.__cloudbaseApp;
    if (!app) return false;
    try {
      const auth = app.auth();
      const state = await auth.getLoginState();
      if (state) return true;
      // 登录态过期，重新匿名登录
      console.log('[云桥] 登录态已过期，重新匿名登录...');
      await auth.signInAnonymously();
      console.log('[云桥] 重新登录成功');
      return true;
    } catch (e) {
      console.error('[云桥] 认证失败:', e.message);
      return false;
    }
  }

  // ---- 单个文档的 upsert（带重试和降级） ----
  async function upsertDoc(col, docId, data, retries) {
    retries = retries || 0;
    try {
      await col.doc(docId).set(data);
      return;
    } catch (e) {
      console.warn('[云桥] set(' + docId + ') 失败:', e.message);
      // 可能是权限问题（文档属于另一个匿名用户），尝试删除后重建
      if (retries < 1) {
        try { await col.doc(docId).remove(); } catch (_) {}
        return upsertDoc(col, docId, data, retries + 1);
      }
      throw e; // 重试后仍然失败，向上抛出
    }
  }

  // ---- 加载云端数据 ----
  async function loadFromCloud() {
    if (typeof cloudbase === 'undefined') return loadFromLocal();
    try {
      const db = window.__cloudbaseApp.database();
      const col = db.collection(CLOUD_COLLECTION);
      const res = await col.limit(1000).get();
      const docs = res.data || [];
      console.log('[云桥] 从云端加载了', docs.length, '条文档');

      const data = {};
      const byKey = {};
      docs.forEach(doc => {
        const k = doc.key || doc._id;
        if (!k) return;
        const updated = getDocTs(doc);
        if (!byKey[k] || updated > getDocTs(byKey[k])) byKey[k] = doc;
      });

      const cloudTimestamps = {};
      CLOUD_KEYS.forEach(base => {
        const single = byKey[base];
        const partKeys = Object.keys(byKey).filter(x => x.startsWith(base + '_') && /_\d+$/.test(x));
        const singleTs = single ? getDocTs(single) : 0;
        const chunkTs = partKeys.length ? Math.max(...partKeys.map(pk => getDocTs(byKey[pk]) || 0)) : 0;
        cloudTimestamps[base] = Math.max(singleTs, chunkTs);
        if (partKeys.length && chunkTs >= singleTs) {
          partKeys.sort((a, b) => (parseInt(a.split('_').pop(), 10) || 0) - (parseInt(b.split('_').pop(), 10) || 0));
          const parts = partKeys.map(pk => byKey[pk] && byKey[pk].value).filter(Boolean);
          if (parts.length) data[base] = parts.join('');
        } else if (single && single.value !== undefined) {
          data[base] = typeof single.value === 'string' ? single.value : JSON.stringify(single.value);
        }
      });

      // 合并策略：本地有未同步的修改时，保留本地数据
      const meta = getLocalMeta();
      const unsavedKeys = [];
      CLOUD_KEYS.forEach(base => {
        const localModTime = meta[base] || 0;
        const cloudTime = cloudTimestamps[base] || 0;
        if (localModTime && localModTime > cloudTime) {
          const localVal = localStorage.getItem(base);
          if (localVal !== null) {
            data[base] = localVal;
            unsavedKeys.push(base);
            console.log('[云桥] 合并：保留本地版本', base);
          }
        }
      });

      if (Object.keys(data).length > 0) {
        saveToLocal(data);
        // 未同步的本地修改，延迟补推到云端
        if (unsavedKeys.length > 0) {
          setTimeout(() => {
            unsavedKeys.filter(k => CLOUD_KEYS.includes(k)).forEach(k => pendingKeys.add(k));
            saveToCloud();
          }, 2000);
        }
        return data;
      } else {
        console.warn('[云桥] ⚠ 云端有', docs.length, '条文档但解析出 0 条有效数据！可能是 value 字段缺失');
      }
    } catch (e) { console.warn('[云桥] 云端加载失败:', e.message); }
    return loadFromLocal();
  }

  // ---- 保存到云端（逐 key 独立保存，一个失败不影响其他） ----
  async function saveToCloud() {
    if (typeof cloudbase === 'undefined') return;
    const keysToSave = Array.from(pendingKeys).filter(k => CLOUD_KEYS.includes(k));
    pendingKeys.clear();
    if (keysToSave.length === 0) return;

    // 确保登录态有效
    await window.StorageReady;
    const app = window.__cloudbaseApp;
    if (!app) {
      console.error('[云桥] CloudBase 未初始化，无法保存！请检查环境 ID 和网络');
      keysToSave.forEach(k => pendingKeys.add(k));
      return;
    }

    const authOk = await ensureAuth();
    if (!authOk) {
      console.error('[云桥] 认证失败，本次保存跳过');
      keysToSave.forEach(k => pendingKeys.add(k));
      return;
    }

    const db = app.database();
    const col = db.collection(CLOUD_COLLECTION);
    const savedKeys = [];
    const failedKeys = [];

    for (const key of keysToSave) {
      try {
        const val = cache[key] !== undefined ? cache[key] : localStorage.getItem(key);
        if (val === undefined || val === null) continue;
        const strVal = typeof val === 'string' ? val : JSON.stringify(val);
        const docId = key.replace(/[^a-zA-Z0-9_-]/g, '_') || 'k';
        const ts = Date.now();

        if (strVal.length <= CHUNK_SIZE) {
          // 单文档保存
          await upsertDoc(col, docId, { key: key, value: strVal, updatedAt: ts });
          // 如果以前有分块，清理旧分块
          for (let ci = 0; ci < 30; ci++) {
            try { await col.doc(docId + '_' + ci).remove(); } catch (_) { break; }
          }
        } else {
          // 分块保存
          const chunks = [];
          for (let i = 0; i < strVal.length; i += CHUNK_SIZE) {
            chunks.push(strVal.slice(i, i + CHUNK_SIZE));
          }
          // 删除旧的主文档
          try { await col.doc(docId).remove(); } catch (_) {}
          // 保存各块
          for (let i = 0; i < chunks.length; i++) {
            const chunkId = docId + '_' + i;
            await upsertDoc(col, chunkId, { key: key + '_' + i, value: chunks[i], updatedAt: ts });
          }
          // 清理多余的旧分块
          for (let i = chunks.length; i < chunks.length + 20; i++) {
            try { await col.doc(docId + '_' + i).remove(); } catch (_) { break; }
          }
          console.log('[云桥] 大数据已分', chunks.length, '块保存:', key, '(', strVal.length, '字节)');
        }
        savedKeys.push(key);
      } catch (e) {
        console.error('[云桥] 保存失败:', key, '-', e.message);
        failedKeys.push(key);
      }
    }

    // 成功的清除修改标记
    if (savedKeys.length > 0) {
      const meta = getLocalMeta();
      savedKeys.forEach(k => delete meta[k]);
      setLocalMeta(meta);
      console.log('[云桥] ✓ 保存成功:', savedKeys.join(', '));
    }

    // 失败的重新加入队列
    if (failedKeys.length > 0) {
      failedKeys.forEach(k => pendingKeys.add(k));
      console.warn('[云桥] ✗ 保存失败（将重试）:', failedKeys.join(', '));
    }
  }

  function debouncedSave(changedKey) {
    if (changedKey && CLOUD_KEYS.includes(changedKey)) pendingKeys.add(changedKey);
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => { saveToCloud(); saveTimer = null; }, 500);
  }

  // ---- 初始化 ----
  window.StorageReady = (async function() {
    if (!useCloud()) {
      cache = loadFromLocal();
      return;
    }
    if (typeof cloudbase === 'undefined') {
      console.warn('[云桥] 腾讯云 SDK 未加载，使用本地存储');
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
      console.log('[云桥] 匿名登录成功，环境:', TENCENT_ENV_ID);
      cache = await loadFromCloud();
    } catch (e) {
      console.error('[云桥] 初始化失败:', e.message, e);
      cache = loadFromLocal();
    }
  })();

  // 页面隐藏时立即尝试保存（安全兜底）
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden' && pendingKeys.size > 0) {
      if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
      saveToCloud();
    }
  });

  // ---- 调试工具 ----
  window.__cloudbaseVerifyRead = async function() {
    if (!window.__cloudbaseApp) return console.warn('CloudBase 未初始化');
    try {
      const db = window.__cloudbaseApp.database();
      const res = await db.collection('LoveBase').limit(1000).get();
      const docs = res.data || [];
      console.log('LoveBase 集合共', docs.length, '条文档');
      docs.forEach((d, i) => console.log('  [' + i + '] _id:', d._id, 'key:', d.key, 'value长度:', (d.value && d.value.length) || 0));
      return docs;
    } catch (e) {
      console.error('读取失败:', e);
    }
  };

  // 手动测试写入是否可用
  window.__cloudbaseTestWrite = async function() {
    if (!window.__cloudbaseApp) return console.error('CloudBase 未初始化');
    try {
      const authOk = await ensureAuth();
      console.log('认证状态:', authOk ? '正常' : '失败');
      if (!authOk) return;
      const db = window.__cloudbaseApp.database();
      const col = db.collection('LoveBase');
      const testId = '_test_write_' + Date.now();
      const testData = { value: 'hello_test_123', key: testId, updatedAt: Date.now() };
      console.log('写入数据:', JSON.stringify(testData));
      await col.doc(testId).set(testData);
      console.log('✓ 写入成功');
      // 读回验证 - 检查字段是否完整
      const res = await col.doc(testId).get();
      const doc = res.data && res.data[0];
      if (doc) {
        console.log('✓ 读回文档:', JSON.stringify(doc));
        console.log('  doc.value =', JSON.stringify(doc.value), '(期望: "hello_test_123")');
        console.log('  doc.key =', JSON.stringify(doc.key));
        console.log('  doc.updatedAt =', doc.updatedAt);
        if (doc.value === 'hello_test_123') {
          console.log('✓ value 字段完全正确！');
        } else {
          console.error('✗ value 字段不匹配！写入 "hello_test_123" 但读到:', doc.value);
          console.error('  这说明 CloudBase SDK 可能修改了字段。完整文档:', doc);
        }
      } else {
        console.error('✗ 读回失败，文档为空。res.data =', res.data);
      }
      // 清理
      try { await col.doc(testId).remove(); } catch (_) {}
    } catch (e) {
      console.error('✗ 测试失败:', e.message, e);
      console.error('请检查：1) LoveBase 集合安全规则设置为 { "read": true, "write": true }');
    }
  };

  // 全面诊断
  window.__cloudbaseDiagnose = async function() {
    console.log('====== 云桥全面诊断 ======');
    console.log('1. 环境ID:', typeof TENCENT_ENV_ID !== 'undefined' ? TENCENT_ENV_ID : '(未定义)');
    console.log('2. CloudBase app:', window.__cloudbaseApp ? '✓ 已初始化' : '✗ 未初始化');
    console.log('3. cache 有', Object.keys(cache).length, '个 key');
    CLOUD_KEYS.forEach(k => {
      const cv = cache[k];
      const lv = localStorage.getItem(k);
      const cInfo = cv !== undefined ? (typeof cv === 'string' ? cv.length + '字符' : typeof cv) : '(空)';
      const lInfo = lv !== null ? lv.length + '字符' : '(空)';
      if (cInfo !== '(空)' || lInfo !== '(空)') {
        console.log('  ' + k, '→ cache:', cInfo, '| localStorage:', lInfo);
      }
    });
    console.log('4. 本地修改标记:', JSON.stringify(getLocalMeta()));
    console.log('5. pending保存:', pendingKeys.size > 0 ? Array.from(pendingKeys).join(', ') : '(无)');
    if (window.__cloudbaseApp) {
      try {
        const db = window.__cloudbaseApp.database();
        const res = await db.collection('LoveBase').limit(1000).get();
        const docs = res.data || [];
        console.log('6. 云端共', docs.length, '条文档:');
        docs.forEach((d, i) => {
          const v = d.value;
          const vInfo = v === undefined ? 'undefined' : v === null ? 'null' : typeof v === 'string' ? v.length + '字符 → "' + v.substring(0, 60) + (v.length > 60 ? '..."' : '"') : typeof v + ': ' + JSON.stringify(v).substring(0, 60);
          console.log('  [' + i + '] _id=' + d._id, 'key=' + d.key, 'value=' + vInfo);
        });
      } catch (e) {
        console.error('6. 云端读取失败:', e.message);
      }
    }
    console.log('====== 诊断完毕 ======');
  };

  // ---- 对外接口 ----
  window.CloudStorage = {
    getItem: function(key) {
      return cache[key] !== undefined ? cache[key] : localStorage.getItem(key);
    },
    setItem: function(key, val) {
      cache[key] = val;
      try { localStorage.setItem(key, val); }
      catch (e) { console.warn('[云桥] 本地写入失败:', key, e && e.message); }
      if (useCloud() && CLOUD_KEYS.includes(key)) {
        const meta = getLocalMeta();
        meta[key] = Date.now();
        setLocalMeta(meta);
        debouncedSave(key);
      }
    },
    removeItem: function(key) {
      delete cache[key];
      localStorage.removeItem(key);
      if (useCloud() && CLOUD_KEYS.includes(key)) {
        const meta = getLocalMeta();
        meta[key] = Date.now();
        setLocalMeta(meta);
        debouncedSave(key);
      }
    },
    /**
     * 立即将所有待保存数据同步到云端，返回 Promise。
     * 在页面跳转前调用，确保数据不丢失。
     */
    flush: function() {
      if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
      if (pendingKeys.size === 0) return Promise.resolve();
      return saveToCloud();
    }
  };
})();
