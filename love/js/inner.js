// 内页背景逻辑（支持 innerBgImage 或 feedBg 等）
(function() {
  const bgImage = document.getElementById('innerBgImage') || document.getElementById('feedBg') || document.getElementById('postBg') || document.getElementById('profileBg') || document.getElementById('editBg') || document.getElementById('albumBg') || document.getElementById('loginBg') || document.getElementById('messagesBg') || document.getElementById('moviesBg') || document.getElementById('gamesBg') || document.getElementById('travelBg') || document.getElementById('todoBg');
  const videoWrap = document.getElementById('innerVideoWrap') || document.getElementById('bgVideoWrap');
  const video = document.getElementById('innerVideo');

  if (!bgImage) return;

  const savedInner = localStorage.getItem('loveBase_bgImageInner') || '';
  const savedBg = savedInner || localStorage.getItem('loveBase_bgImage') || DEFAULT_BG;
  const savedVideo = localStorage.getItem('loveBase_bgVideo') || '';

  function isVideoUrl(url) {
    return url && (/\.(mp4|webm|ogg)(\?|$)/i.test(url) || url.includes('video'));
  }

  if (video && videoWrap && savedVideo && isVideoUrl(savedVideo)) {
    video.src = savedVideo;
    video.load();
    videoWrap.classList.remove('hidden');
    bgImage.style.backgroundImage = 'none';
  } else {
    if (videoWrap) videoWrap.classList.add('hidden');
    bgImage.style.backgroundImage = `url('${savedBg}')`;
  }
})();
