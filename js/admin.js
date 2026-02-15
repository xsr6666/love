// 管理后台逻辑
const STORAGE_KEY = 'loveBase_adminPassword';
const BG_KEY = 'loveBase_bgImage';
const BG_INNER_KEY = 'loveBase_bgImageInner';
const BG_VIDEO_KEY = 'loveBase_bgVideo';
const OMDB_KEY = 'loveBase_omdbKey';

const loginBox = document.getElementById('loginBox');
const dashboard = document.getElementById('dashboard');
const passwordInput = document.getElementById('passwordInput');
const loginBtn = document.getElementById('loginBtn');
const bgUrlInput = document.getElementById('bgUrlInput');
const saveUrlBtn = document.getElementById('saveUrlBtn');
const bgInnerUrlInput = document.getElementById('bgInnerUrlInput');
const saveInnerUrlBtn = document.getElementById('saveInnerUrlBtn');
const bgVideoInput = document.getElementById('bgVideoInput');
const saveVideoBtn = document.getElementById('saveVideoBtn');
const clearVideoBtn = document.getElementById('clearVideoBtn');
const clearImageBtn = document.getElementById('clearImageBtn');
const clearInnerImageBtn = document.getElementById('clearInnerImageBtn');
const omdbKeyInput = document.getElementById('omdbKeyInput');
const saveOmdbBtn = document.getElementById('saveOmdbBtn');
const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const uploadInnerArea = document.getElementById('uploadInnerArea');
const fileInnerInput = document.getElementById('fileInnerInput');
const preview = document.getElementById('preview');
const previewInner = document.getElementById('previewInner');
const resetLoveBtn = document.getElementById('resetLoveBtn');

function checkAuth() {
  const savedPwd = localStorage.getItem(STORAGE_KEY);
  const sessionAuth = sessionStorage.getItem('loveBase_authed');
  
  if (savedPwd && sessionAuth === '1') {
    showDashboard();
    return;
  }
  if (savedPwd) {
    loginBox.querySelector('.hint').textContent = '请输入密码进入';
  }
}

function showDashboard() {
  loginBox.classList.add('hidden');
  dashboard.classList.remove('hidden');
  loadCurrent();
}

function setPassword(pwd) {
  if (pwd.length < 4) {
    alert('密码至少需要4位');
    return;
  }
  localStorage.setItem(STORAGE_KEY, pwd);
  sessionStorage.setItem('loveBase_authed', '1');
  showDashboard();
}

function verifyPassword(pwd) {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) {
    setPassword(pwd);
    return;
  }
  if (pwd === saved) {
    sessionStorage.setItem('loveBase_authed', '1');
    showDashboard();
  } else {
    alert('密码错误');
  }
}

loginBtn.addEventListener('click', () => {
  const pwd = passwordInput.value.trim();
  if (!pwd) { alert('请输入密码'); return; }
  verifyPassword(pwd);
});

passwordInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') loginBtn.click();
});

// 获取存储对象（优先使用云端存储）
const _cs = () => window.CloudStorage || localStorage;

// 保存图片
saveUrlBtn.addEventListener('click', async () => {
  const url = bgUrlInput.value.trim();
  if (!url) { alert('请输入图片链接'); return; }
  _cs().setItem(BG_KEY, url);
  if (window.CloudStorage && window.CloudStorage.flush) await window.CloudStorage.flush();
  alert('保存成功');
  loadCurrent();
});

// 保存 OMDB Key
saveOmdbBtn?.addEventListener('click', () => {
  const key = omdbKeyInput?.value?.trim() || '';
  _cs().setItem(OMDB_KEY, key);
  alert(key ? '已保存' : '已清除');
  loadCurrent();
});

// 保存视频
saveVideoBtn.addEventListener('click', async () => {
  const url = bgVideoInput.value.trim();
  if (!url) { alert('请输入视频链接'); return; }
  _cs().setItem(BG_VIDEO_KEY, url);
  if (window.CloudStorage && window.CloudStorage.flush) await window.CloudStorage.flush();
  alert('保存成功，视频将作为动态背景');
  loadCurrent();
});

resetLoveBtn?.addEventListener('click', () => {
  if (!confirm('确定重置恋爱天数为120天吗？将清除今日打卡记录。')) return;
  resetLoveDays();
  alert('已重置为120天');
});

clearVideoBtn.addEventListener('click', async () => {
  _cs().removeItem(BG_VIDEO_KEY);
  if (window.CloudStorage && window.CloudStorage.flush) await window.CloudStorage.flush();
  bgVideoInput.value = '';
  alert('已清除，将使用图片背景');
  loadCurrent();
});

// 清除图片，恢复默认
clearImageBtn.addEventListener('click', async () => {
  _cs().removeItem(BG_KEY);
  if (window.CloudStorage && window.CloudStorage.flush) await window.CloudStorage.flush();
  bgUrlInput.value = DEFAULT_BG;
  alert('已清除，已恢复默认背景');
  loadCurrent();
});

// 保存内页背景
saveInnerUrlBtn.addEventListener('click', async () => {
  const url = bgInnerUrlInput.value.trim();
  if (!url) { alert('请输入图片链接'); return; }
  _cs().setItem(BG_INNER_KEY, url);
  if (window.CloudStorage && window.CloudStorage.flush) await window.CloudStorage.flush();
  alert('保存成功');
  loadCurrent();
});

clearInnerImageBtn.addEventListener('click', async () => {
  _cs().removeItem(BG_INNER_KEY);
  if (window.CloudStorage && window.CloudStorage.flush) await window.CloudStorage.flush();
  bgInnerUrlInput.value = '';
  alert('已清除，内页将使用首页背景');
  loadCurrent();
});

uploadInnerArea.addEventListener('dragover', (e) => {
  e.preventDefault();
  uploadInnerArea.classList.add('dragover');
});
uploadInnerArea.addEventListener('dragleave', () => uploadInnerArea.classList.remove('dragover'));
uploadInnerArea.addEventListener('drop', (e) => {
  e.preventDefault();
  uploadInnerArea.classList.remove('dragover');
  const file = e.dataTransfer.files[0];
  if (file && file.type.startsWith('image/')) handleInnerFile(file);
  else alert('请上传图片');
});
fileInnerInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (file) handleInnerFile(file);
});
function handleInnerFile(file) {
  const reader = new FileReader();
  reader.onload = async (e) => {
    _cs().setItem(BG_INNER_KEY, e.target.result);
    if (window.CloudStorage && window.CloudStorage.flush) await window.CloudStorage.flush();
    alert('上传成功');
    loadCurrent();
  };
  reader.readAsDataURL(file);
}

function loadCurrent() {
  const url = _cs().getItem(BG_KEY) || DEFAULT_BG;
  const urlInner = _cs().getItem(BG_INNER_KEY) || '';
  const video = _cs().getItem(BG_VIDEO_KEY) || '';
  const omdb = _cs().getItem(OMDB_KEY) || '';
  bgUrlInput.value = url;
  bgInnerUrlInput.value = urlInner;
  bgVideoInput.value = video;
  if (omdbKeyInput) omdbKeyInput.value = omdb;
  if (url && !url.startsWith('data:')) {
    preview.innerHTML = `<img src="${url}" alt="预览" onerror="this.style.display='none'">`;
  } else if (url && url.startsWith('data:')) {
    preview.innerHTML = `<img src="${url}" alt="预览">`;
  } else {
    preview.innerHTML = '';
  }
  if (urlInner && !urlInner.startsWith('data:')) {
    previewInner.innerHTML = `<p class="desc">内页预览</p><img src="${urlInner}" alt="内页预览" onerror="this.style.display='none'">`;
  } else if (urlInner && urlInner.startsWith('data:')) {
    previewInner.innerHTML = `<p class="desc">内页预览</p><img src="${urlInner}" alt="内页预览">`;
  } else {
    previewInner.innerHTML = urlInner ? '' : '<p class="desc">内页使用首页背景</p>';
  }
}

// 拖拽上传（label 的点击已原生支持）
uploadArea.addEventListener('dragover', (e) => {
  e.preventDefault();
  uploadArea.classList.add('dragover');
});

uploadArea.addEventListener('dragleave', () => uploadArea.classList.remove('dragover'));

uploadArea.addEventListener('drop', (e) => {
  e.preventDefault();
  uploadArea.classList.remove('dragover');
  const file = e.dataTransfer.files[0];
  if (file && file.type.startsWith('image/')) handleFile(file);
  else alert('请上传图片');
});

fileInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (file) handleFile(file);
});

function handleFile(file) {
  const reader = new FileReader();
  reader.onload = async (e) => {
    _cs().setItem(BG_KEY, e.target.result);
    if (window.CloudStorage && window.CloudStorage.flush) await window.CloudStorage.flush();
    alert('上传成功');
    loadCurrent();
  };
  reader.readAsDataURL(file);
}

checkAuth();
