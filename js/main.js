// 恋爱秘密基地 - 主逻辑
document.addEventListener('DOMContentLoaded', () => {
  const bgImage = document.getElementById('bgImage');
  const bgVideoWrap = document.getElementById('bgVideoWrap');
  const bgVideo = document.getElementById('bgVideo');

  const savedBg = localStorage.getItem('loveBase_bgImage') || DEFAULT_BG;
  const savedVideo = localStorage.getItem('loveBase_bgVideo') || DEFAULT_BG_VIDEO;

  // 优先使用视频背景
  if (savedVideo && isVideoUrl(savedVideo)) {
    bgVideo.src = savedVideo;
    bgVideo.load();
    bgVideoWrap.classList.remove('hidden');
    bgImage.style.backgroundImage = 'none';
  } else {
    bgVideoWrap.classList.add('hidden');
    bgImage.style.backgroundImage = `url('${savedBg}')`;
  }

  function isVideoUrl(url) {
    return /\.(mp4|webm|ogg)(\?|$)/i.test(url) || url.includes('video');
  }

  // 点击进入第二页
  document.body.addEventListener('click', (e) => {
    if (e.target.closest('a[href*="admin"]')) return;
    window.location.href = 'inner.html';
  });
});
