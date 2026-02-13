// 相册 - 按相册分类展示
document.addEventListener('DOMContentLoaded', async () => {
  await (window.StorageReady || Promise.resolve());
  if (!isLoggedIn()) {
    window.location.href = 'login.html?redirect=album.html';
    return;
  }

  const savedBg = (localStorage.getItem('loveBase_bgImageInner') || '') || localStorage.getItem('loveBase_bgImage') || DEFAULT_BG;
  const bgEl = document.getElementById('albumBg');
  if (bgEl) bgEl.style.backgroundImage = `url('${savedBg}')`;

  const albumTabs = document.getElementById('albumTabs');
  const albumGrid = document.getElementById('albumGrid');
  const albumEmpty = document.getElementById('albumEmpty');
  const lightbox = document.getElementById('albumLightbox');
  const lightboxImg = document.getElementById('lightboxImg');
  const lightboxCaption = document.getElementById('lightboxCaption');
  const lightboxClose = document.getElementById('lightboxClose');

  let albums = getAlbums();
  const users = getUsers();
  const me = getCurrentUser();

  function addNewAlbum(name) {
    const id = 'album_' + Date.now();
    albums = [...albums, { id, name }];
    saveAlbums(albums);
    photosByAlbum = buildPhotosByAlbum();
    albumTabs.innerHTML = albums.map(a => {
      const count = (photosByAlbum[a.id] || []).length;
      return `<button type="button" class="album-tab" data-id="${a.id}">${a.name} (${count})</button>`;
    }).join('');
    albumTabs.querySelectorAll('.album-tab').forEach(b => {
      b.addEventListener('click', () => {
        currentAlbum = b.dataset.id;
        albumTabs.querySelectorAll('.album-tab').forEach(x => x.classList.remove('active'));
        b.classList.add('active');
        render();
      });
    });
    currentAlbum = id;
    albumTabs.querySelectorAll('.album-tab').forEach(x => x.classList.remove('active'));
    const newTab = albumTabs.querySelector(`[data-id="${id}"]`);
    if (newTab) newTab.classList.add('active');
    render();
  }

  function buildPhotosByAlbum() {
    const photosByAlbum = {};
    albums.forEach(a => { photosByAlbum[a.id] = []; });
    const posts = getVisiblePosts(me.id);
    posts.filter(p => getPostImages(p).length).forEach(p => {
      const albumId = p.albumId || 'default';
      const list = photosByAlbum[albumId] || (photosByAlbum[albumId] = []);
      const user = users.find(u => u.id === p.userId) || { name: '?' };
      getPostImages(p).forEach(image => {
        list.push({
          image,
          content: p.content,
          timestamp: p.timestamp,
          user,
          postId: p.id,
          userId: p.userId,
        });
      });
    });
    return photosByAlbum;
  }

  let photosByAlbum = buildPhotosByAlbum();

  albumTabs.innerHTML = albums.map(a => {
    const count = (photosByAlbum[a.id] || []).length;
    return `<button type="button" class="album-tab" data-id="${a.id}">${a.name} (${count})</button>`;
  }).join('');

  let currentAlbum = 'default';

  function render() {
    const photos = photosByAlbum[currentAlbum] || [];
    if (photos.length === 0) {
      albumGrid.classList.add('hidden');
      albumEmpty.classList.remove('hidden');
      albumEmpty.textContent = '该相册暂无照片，去发布吧~';
      return;
    }
    albumGrid.classList.remove('hidden');
    albumEmpty.classList.add('hidden');
    albumGrid.innerHTML = photos.map((ph, i) => {
      const d = new Date(ph.timestamp);
      const timeStr = (d.getMonth() + 1) + '/' + d.getDate();
      const canDel = me && ph.userId === me.id;
      return `
        <div class="album-item" data-idx="${i}" data-post-id="${ph.postId || ''}">
          <img src="${ph.image}" alt="" loading="lazy">
          <span class="album-item-meta">${ph.user.name} · ${timeStr}</span>
          ${canDel ? `<button type="button" class="album-del-btn" data-post-id="${ph.postId}" title="删除">×</button>` : ''}
        </div>
      `;
    }).join('');

    albumGrid.querySelectorAll('.album-item').forEach((el, i) => {
      el.addEventListener('click', (e) => {
        if (e.target.closest('.album-del-btn')) return;
        const ph = photos[i];
        lightboxImg.src = ph.image;
        const d = new Date(ph.timestamp);
        lightboxCaption.textContent = (ph.content || ph.user.name) + ' · ' + (d.getMonth() + 1) + '/' + d.getDate();
        lightbox.classList.add('open');
      });
    });

    albumGrid.querySelectorAll('.album-del-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (confirm('确定删除这张照片？（将删除整条动态）')) {
          deletePost(btn.dataset.postId);
          photosByAlbum = buildPhotosByAlbum();
          albumTabs.innerHTML = albums.map(a => {
            const count = (photosByAlbum[a.id] || []).length;
            return `<button type="button" class="album-tab" data-id="${a.id}">${a.name} (${count})</button>`;
          }).join('');
          albumTabs.querySelectorAll('.album-tab').forEach(b => {
            b.addEventListener('click', () => {
              currentAlbum = b.dataset.id;
              albumTabs.querySelectorAll('.album-tab').forEach(x => x.classList.remove('active'));
              b.classList.add('active');
              render();
            });
          });
          const curTab = albumTabs.querySelector(`.album-tab[data-id="${currentAlbum}"]`);
          if (curTab) curTab.classList.add('active');
          render();
        }
      });
    });
  }

  albumTabs.querySelectorAll('.album-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      currentAlbum = btn.dataset.id;
      albumTabs.querySelectorAll('.album-tab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      render();
    });
  });

  const firstTab = albumTabs.querySelector('.album-tab');
  if (firstTab) firstTab.classList.add('active');
  render();

  document.getElementById('albumNewBtn')?.addEventListener('click', () => {
    const name = prompt('输入相册名称：');
    if (name && name.trim()) addNewAlbum(name.trim());
  });

  lightboxClose?.addEventListener('click', () => lightbox.classList.remove('open'));
  lightbox?.addEventListener('click', (e) => e.target === lightbox && lightbox.classList.remove('open'));
});
