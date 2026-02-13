// 点滴时间线
document.addEventListener('DOMContentLoaded', async () => {
  await (window.StorageReady || Promise.resolve());
  if (!isLoggedIn()) {
    window.location.href = 'login.html?redirect=feed.html';
    return;
  }

  const feedList = document.getElementById('feedList');
  const feedEmpty = document.getElementById('feedEmpty');

  renderFeed();
});

function renderFeed() {
  const posts = getVisiblePosts(getCurrentUser().id);
  const users = getUsers();
  const feedList = document.getElementById('feedList');
  const feedEmpty = document.getElementById('feedEmpty');

  if (posts.length === 0) {
    feedList.classList.add('hidden');
    feedEmpty.classList.remove('hidden');
    return;
  }

  feedList.classList.remove('hidden');
  feedEmpty.classList.add('hidden');

  const me = getCurrentUser();
  feedList.innerHTML = posts.map(post => {
    const user = users.find(u => u.id === post.userId) || { name: '未知', avatar: '' };
    const time = formatTime(post.timestamp);
    const isPrivate = post.visibility === 'private';
    const privateBadge = isPrivate && post.userId === me.id ? '<span class="post-private-badge" title="仅自己可见">🔒</span>' : '';
    const avatarHtml = user.avatar
      ? `<span class="post-avatar has-avatar" style="background-image:url('${user.avatar}')"></span>`
      : `<span class="post-avatar">${user.name[0] || '?'}</span>`;
    const imgs = getPostImages(post);
    const imgHtml = imgs.length ? `<div class="post-images">${imgs.map(src => `<div class="post-image"><img src="${src}" alt=""></div>`).join('')}</div>` : '';
    const videoHtml = post.video ? `<div class="post-video"><video src="${post.video}" controls playsinline></video></div>` : '';
    const canDel = post.userId === me.id;
    return `
      <article class="post-card" data-id="${post.id}">
        <div class="post-header">
          <a href="profile.html?user=${post.userId}" class="post-user">
            ${avatarHtml}
            <span class="post-name">${user.name}</span>
            ${privateBadge}
          </a>
          <div class="post-header-right">
            <time class="post-time">${time}</time>
            ${canDel ? `<button type="button" class="post-del-btn" data-id="${post.id}" title="删除">×</button>` : ''}
          </div>
        </div>
        ${post.content ? `<p class="post-content">${escapeHtml(post.content)}</p>` : ''}
        ${imgHtml}
        ${videoHtml}
      </article>
    `;
  }).join('');

  feedList.addEventListener('click', (e) => {
    const delBtn = e.target.closest('.post-del-btn');
    if (delBtn && confirm('确定删除这条动态？')) {
      deletePost(delBtn.dataset.id);
      renderFeed();
    }
  });

  feedList.querySelectorAll('.post-image').forEach(el => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const img = el.querySelector('img');
      const src = img?.src;
      if (src) {
        const lb = document.getElementById('imgLightbox');
        const lbImg = document.getElementById('lightboxImg');
        if (lb && lbImg) {
          lbImg.src = src;
          lbImg.className = 'img-full';
          lb.classList.add('open');
        }
      }
    });
  });
}

document.getElementById('lightboxClose')?.addEventListener('click', () => {
  document.getElementById('imgLightbox')?.classList.remove('open');
});
document.getElementById('imgLightbox')?.addEventListener('click', (e) => {
  if (e.target.id === 'imgLightbox') e.target.classList.remove('open');
});

function formatTime(timestamp) {
  const d = new Date(timestamp);
  const now = new Date();
  const diff = now - d;
  if (diff < 60000) return '刚刚';
  if (diff < 3600000) return Math.floor(diff / 60000) + '分钟前';
  if (diff < 86400000) return Math.floor(diff / 3600000) + '小时前';
  if (diff < 604800000) return Math.floor(diff / 86400000) + '天前';
  return d.getMonth() + 1 + '/' + d.getDate();
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML.replace(/\n/g, '<br>');
}
