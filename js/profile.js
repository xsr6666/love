// 个人空间
document.addEventListener('DOMContentLoaded', async () => {
  await (window.StorageReady || Promise.resolve());
  if (!isLoggedIn()) {
    window.location.href = 'login.html?redirect=profile.html';
    return;
  }

  const params = new URLSearchParams(location.search);
  const userId = params.get('user') || getCurrentUser().id;
  const isSelf = userId === getCurrentUser().id;

  const _store = () => (window.CloudStorage || localStorage);
  const savedBg = (_store().getItem('loveBase_bgImageInner') || '') || _store().getItem('loveBase_bgImage') || DEFAULT_BG;
  document.getElementById('profileBg').style.backgroundImage = `url('${savedBg}')`;

  const editLink = document.getElementById('editLink');
  if (!isSelf) editLink.style.display = 'none';
  else editLink.href = 'profile-edit.html';

  const user = getUserById(userId);
  if (!user) {
    document.getElementById('profileCard').innerHTML = '<p>用户不存在</p>';
    return;
  }

  const avatarEl = document.getElementById('profileAvatar');
  avatarEl.textContent = user.name[0] || '?';
  if (user.avatar) {
    avatarEl.style.backgroundImage = `url('${user.avatar}')`;
    avatarEl.classList.add('has-avatar');
    avatarEl.textContent = '';
  } else {
    avatarEl.style.backgroundImage = '';
    avatarEl.classList.remove('has-avatar');
  }
  document.getElementById('profileName').textContent = user.name;
  document.getElementById('profileBio').textContent = user.bio || '这个人很懒，什么都没写~';

  const postsTitle = document.getElementById('postsTitle');
  if (postsTitle) postsTitle.textContent = isSelf ? '我的分享' : 'TA的分享';

  const feedList = document.getElementById('profileFeed');

  function renderProfilePosts() {
    const posts = getPosts().filter(p => p.userId === userId && (p.visibility === 'public' || p.userId === getCurrentUser().id));
    if (posts.length === 0) {
      feedList.innerHTML = '<p class="empty-hint">✨ 还没有分享过，去点滴发布第一条吧~</p>';
      return;
    }
    feedList.innerHTML = posts.map(post => {
      const imgs = getPostImages(post);
      const imgHtml = imgs.length ? `<div class="post-images">${imgs.map(src => `<div class="post-image"><img src="${src}" alt=""></div>`).join('')}</div>` : '';
      const canDel = isSelf && post.userId === getCurrentUser().id;
      return `
        <article class="post-card profile-post-card" data-id="${post.id}">
          <div class="profile-post-header">
            <time class="post-time">${formatTime(post.timestamp)}</time>
            ${canDel ? `<button type="button" class="post-del-btn" data-id="${post.id}" title="删除">×</button>` : ''}
          </div>
          ${post.content ? `<p class="post-content">${escapeHtml(post.content)}</p>` : ''}
          ${imgHtml}
        </article>
      `;
    }).join('');
    feedList.querySelectorAll('.post-image').forEach(el => {
      el.addEventListener('click', (e) => {
        e.preventDefault();
        const img = el.querySelector('img');
        if (img?.src) {
          const lb = document.getElementById('imgLightbox');
          const lbImg = document.getElementById('lightboxImg');
          if (lb && lbImg) {
            lbImg.src = img.src;
            lb.classList.add('open');
          }
        }
      });
    });
  }

  feedList.addEventListener('click', (e) => {
    const delBtn = e.target.closest('.post-del-btn');
    if (delBtn && confirm('确定删除这条动态？')) {
      deletePost(delBtn.dataset.id);
      renderProfilePosts();
    }
  });

  renderProfilePosts();
});

document.getElementById('lightboxClose')?.addEventListener('click', () => {
  document.getElementById('imgLightbox')?.classList.remove('open');
});
document.getElementById('imgLightbox')?.addEventListener('click', (e) => {
  if (e.target.id === 'imgLightbox') e.target.classList.remove('open');
});

function formatTime(timestamp) {
  const d = new Date(timestamp);
  return d.getFullYear() + '-' + (d.getMonth() + 1 + '').padStart(2, '0') + '-' + (d.getDate() + '').padStart(2, '0') + ' ' + (d.getHours() + '').padStart(2, '0') + ':' + (d.getMinutes() + '').padStart(2, '0');
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML.replace(/\n/g, '<br>');
}
