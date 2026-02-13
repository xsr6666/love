// 编辑个人资料
document.addEventListener('DOMContentLoaded', async () => {
  await (window.StorageReady || Promise.resolve());
  if (!isLoggedIn()) {
    window.location.href = 'login.html';
    return;
  }

  const user = getCurrentUser();
  const savedBg = (localStorage.getItem('loveBase_bgImageInner') || '') || localStorage.getItem('loveBase_bgImage') || DEFAULT_BG;
  document.getElementById('editBg').style.backgroundImage = `url('${savedBg}')`;

  const avatarPreview = document.getElementById('avatarPreview');
  const avatarInput = document.getElementById('avatarInput');
  const editName = document.getElementById('editName');
  const editBio = document.getElementById('editBio');
  const editPwd = document.getElementById('editPwd');

  editName.value = user.name;
  editBio.value = user.bio || '';
  let currentAvatar = user.avatar || '';
  if (user.avatar) {
    avatarPreview.style.backgroundImage = `url('${user.avatar}')`;
    avatarPreview.textContent = '';
  } else {
    avatarPreview.style.backgroundImage = '';
    avatarPreview.textContent = user.name[0] || '?';
  }

  avatarInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      compressImage(ev.target.result, 200, 0.85).then(compressed => {
        currentAvatar = compressed;
        avatarPreview.style.backgroundImage = `url('${compressed}')`;
        avatarPreview.textContent = '';
      }).catch(() => {
        currentAvatar = ev.target.result;
        avatarPreview.style.backgroundImage = `url('${ev.target.result}')`;
        avatarPreview.textContent = '';
      });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  });

  document.getElementById('saveBtn').addEventListener('click', () => {
    const name = editName.value.trim();
    if (!name) {
      alert('昵称不能为空');
      return;
    }
    const users = getUsers();
    const idx = users.findIndex(u => u.id === user.id);
    if (idx < 0) return;
    users[idx].name = name;
    users[idx].bio = editBio.value.trim();
    users[idx].avatar = currentAvatar;
    if (editPwd.value) {
      if (editPwd.value.length < 4) {
        alert('密码至少4位');
        return;
      }
      users[idx].password = editPwd.value;
    }
    try {
      saveUsers(users);
      alert('保存成功');
      window.location.href = 'profile.html';
    } catch (err) {
      console.error(err);
      if (err.name === 'QuotaExceededError') {
        alert('存储空间不足，请尝试使用较小的头像图片');
      } else {
        alert('保存失败');
      }
    }
  });
});

function compressImage(dataUrl, maxSize, quality) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let w = img.width, h = img.height;
      if (w > maxSize || h > maxSize) {
        if (w > h) {
          h = (h * maxSize) / w;
          w = maxSize;
        } else {
          w = (w * maxSize) / h;
          h = maxSize;
        }
      }
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, w, h);
      try {
        resolve(canvas.toDataURL('image/jpeg', quality));
      } catch (e) {
        resolve(dataUrl);
      }
    };
    img.onerror = reject;
    img.src = dataUrl;
  });
}
