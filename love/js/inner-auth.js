// 内页登录检查
document.addEventListener('DOMContentLoaded', async () => {
  await (window.StorageReady || Promise.resolve());
  if (!isSetupDone()) {
    window.location.href = 'login.html';
    return;
  }
  if (!isLoggedIn()) {
    window.location.href = 'login.html?redirect=inner.html';
    return;
  }
  // 已登录，隐藏切换账号或改为退出
  const logoutLink = document.getElementById('logoutLink');
  if (logoutLink) {
    logoutLink.textContent = '切换账号';
    logoutLink.href = 'login.html';
  }
});
