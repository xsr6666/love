// 登录与设置逻辑
document.addEventListener('DOMContentLoaded', async () => {
  await (window.StorageReady || Promise.resolve());
  const setupBox = document.getElementById('setupBox');
  const loginBox = document.getElementById('loginBox');
  const userChoices = document.getElementById('userChoices');
  const pwdForm = document.getElementById('pwdForm');
  const loginPwd = document.getElementById('loginPwd');
  const loginBtn = document.getElementById('loginBtn');
  const setupBtn = document.getElementById('setupBtn');

  // 背景
  const savedBg = (localStorage.getItem('loveBase_bgImageInner') || '') || localStorage.getItem('loveBase_bgImage') || DEFAULT_BG;
  document.getElementById('loginBg').style.backgroundImage = `url('${savedBg}')`;

  let selectedUserId = null;

  if (isSetupDone()) {
    setupBox.classList.add('hidden');
    loginBox.classList.remove('hidden');
    renderUserChoices();
  }

  // 完成设置
  setupBtn.addEventListener('click', () => {
    const name1 = document.getElementById('name1').value.trim();
    const name2 = document.getElementById('name2').value.trim();
    const pwd1 = document.getElementById('pwd1').value;
    const pwd2 = document.getElementById('pwd2').value;
    const bio1 = document.getElementById('bio1').value.trim();
    const bio2 = document.getElementById('bio2').value.trim();

    if (!name1 || !name2) {
      alert('请填写两个昵称');
      return;
    }
    if (pwd1.length < 4 || pwd2.length < 4) {
      alert('密码至少需要4位');
      return;
    }

    const users = [
      { id: 'user1', name: name1, avatar: '', bio: bio1, password: pwd1 },
      { id: 'user2', name: name2, avatar: '', bio: bio2, password: pwd2 },
    ];
    saveUsers(users);
    setCurrentUser(users[0].id);
    alert('设置完成！');
    goToRedirect();
  });

  function renderUserChoices() {
    const users = getUsers();
    if (!users.length) {
      userChoices.innerHTML = '<p class="hint">暂无账号，请先完成设置</p>';
      return;
    }
    userChoices.innerHTML = users.map(u => {
      const avatarHtml = u.avatar
        ? `<span class="user-avatar has-avatar" style="background-image:url('${u.avatar}')"></span>`
        : `<span class="user-avatar">${(u.name[0] || '?')}</span>`;
      return `
      <button type="button" class="user-choice" data-id="${u.id}">
        ${avatarHtml}
        <span class="user-name">${escapeHtml(u.name)}</span>
      </button>
    `;
    }).join('');

    userChoices.querySelectorAll('.user-choice').forEach(btn => {
      btn.addEventListener('click', () => {
        selectedUserId = btn.dataset.id;
        userChoices.querySelectorAll('.user-choice').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        pwdForm.classList.remove('hidden');
        loginPwd.value = '';
        loginPwd.focus();
      });
    });
  }

  loginBtn.addEventListener('click', doLogin);
  loginPwd.addEventListener('keypress', (e) => e.key === 'Enter' && doLogin());

  function escapeHtml(t) {
    const d = document.createElement('div');
    d.textContent = t;
    return d.innerHTML;
  }

  function doLogin() {
    if (!selectedUserId) {
      alert('请先选择账号');
      return;
    }
    const pwd = loginPwd.value;
    const user = getUserById(selectedUserId);
    if (!user || user.password !== pwd) {
      alert('密码错误');
      return;
    }
    setCurrentUser(selectedUserId);
    goToRedirect();
  }

  function goToRedirect() {
    const params = new URLSearchParams(location.search);
    const redirect = params.get('redirect');
    window.location.href = redirect || 'inner.html';
  }
});
