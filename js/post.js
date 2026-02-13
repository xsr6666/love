// 发布点滴 - 支持多图
document.addEventListener('DOMContentLoaded', async () => {
  await (window.StorageReady || Promise.resolve());
  if (!isLoggedIn()) {
    window.location.href = 'login.html?redirect=post.html';
    return;
  }

  const postText = document.getElementById('postText');
  const postImageInput = document.getElementById('postImageInput');
  const postVideoInput = document.getElementById('postVideoInput');
  const pickImage = document.getElementById('pickImage');
  const pickVideo = document.getElementById('pickVideo');
  const pickPlaceholder = document.getElementById('pickPlaceholder');
  const pickVideoPlaceholder = document.getElementById('pickVideoPlaceholder');
  const previewGrid = document.getElementById('previewGrid');
  const previewVideo = document.getElementById('previewVideo');
  const publishBtn = document.getElementById('publishBtn');
  const visibilityToggle = document.getElementById('visibilityToggle');

  const savedBg = (localStorage.getItem('loveBase_bgImageInner') || '') || localStorage.getItem('loveBase_bgImage') || DEFAULT_BG;
  document.getElementById('postBg').style.backgroundImage = `url('${savedBg}')`;

  let imageList = [];
  let videoUrl = '';
  let visibility = 'public';
  const VIDEO_MAX_MB = 5;

  const albumSelect = document.getElementById('albumSelect');
  if (albumSelect) {
    const albums = getAlbums();
    albumSelect.innerHTML = albums.map(a => `<option value="${a.id}">${a.name}</option>`).join('');
    const urlAlbum = new URLSearchParams(location.search).get('album');
    if (urlAlbum && albums.some(a => a.id === urlAlbum)) {
      albumSelect.value = urlAlbum;
    }
  }

  pickImage.addEventListener('click', (e) => {
    if (e.target.closest('.preview-item') || e.target.closest('.remove-preview')) return;
    postImageInput.click();
  });

  postImageInput.addEventListener('change', (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const imageFiles = files.filter(f => f.type.startsWith('image/'));
    if (!imageFiles.length) return;

    let loaded = 0;
    imageFiles.forEach(file => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        imageList.push(ev.target.result);
        renderPreviews();
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  });

  if (pickVideo && postVideoInput) {
    pickVideo.addEventListener('click', (e) => {
      if (e.target.closest('.remove-video')) return;
      if (!videoUrl) postVideoInput.click();
    });
    postVideoInput.addEventListener('change', (e) => {
      const file = e.target.files?.[0];
      if (!file || !file.type.startsWith('video/')) return;
      if (file.size > VIDEO_MAX_MB * 1024 * 1024) {
        alert(`视频请控制在 ${VIDEO_MAX_MB}MB 以内，当前约 ${(file.size / 1024 / 1024).toFixed(1)}MB`);
        e.target.value = '';
        return;
      }
      const reader = new FileReader();
      reader.onload = (ev) => {
        videoUrl = ev.target.result;
        renderVideoPreview();
      };
      reader.readAsDataURL(file);
      e.target.value = '';
    });
  }

  function renderVideoPreview() {
    if (!previewVideo || !pickVideoPlaceholder) return;
    if (!videoUrl) {
      pickVideoPlaceholder.style.display = '';
      previewVideo.innerHTML = '';
      previewVideo.style.display = 'none';
      return;
    }
    pickVideoPlaceholder.style.display = 'none';
    previewVideo.style.display = 'block';
    previewVideo.innerHTML = `
      <div style="position:relative">
        <video src="${videoUrl}" controls style="width:100%;max-height:200px;border-radius:10px"></video>
        <button type="button" class="remove-video" title="移除">×</button>
      </div>
    `;
    previewVideo.querySelector('.remove-video').addEventListener('click', (e) => {
      e.stopPropagation();
      videoUrl = '';
      renderVideoPreview();
    });
  }

  function renderPreviews() {
    if (imageList.length === 0) {
      pickPlaceholder.style.display = '';
      previewGrid.innerHTML = '';
      previewGrid.style.display = 'none';
      return;
    }
    pickPlaceholder.style.display = 'none';
    previewGrid.style.display = 'grid';
    previewGrid.innerHTML = imageList.map((src, i) => `
      <div class="preview-item">
        <img src="${src}" alt="">
        <button type="button" class="remove-preview" data-idx="${i}" title="移除">×</button>
      </div>
    `).join('');
    previewGrid.querySelectorAll('.remove-preview').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const idx = parseInt(btn.dataset.idx, 10);
        imageList.splice(idx, 1);
        renderPreviews();
      });
    });
  }

  if (visibilityToggle) {
    visibilityToggle.addEventListener('click', () => {
      visibility = visibility === 'public' ? 'private' : 'public';
      visibilityToggle.textContent = visibility === 'public' ? '🌐 公开' : '🔒 私密';
      visibilityToggle.classList.toggle('private', visibility === 'private');
    });
  }

  publishBtn.addEventListener('click', () => {
    const content = postText.value.trim();
    if (!content && !imageList.length && !videoUrl) {
      alert('写点什么或添加照片/视频吧');
      return;
    }

    const user = getCurrentUser();
    const albumId = albumSelect?.value || 'default';
    try {
      addPost({ userId: user.id, content, images: [...imageList], video: videoUrl, visibility, albumId });
      alert('发布成功！');
      window.location.href = 'feed.html';
    } catch (err) {
      console.error(err);
      if (err.name === 'QuotaExceededError' || err.message?.includes('QuotaExceeded')) {
        alert('存储空间不足，请尝试使用较小的照片或只发文字');
      } else {
        alert('发布失败：' + (err.message || '未知错误'));
      }
    }
  });
});
