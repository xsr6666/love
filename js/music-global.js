// 全局音乐按钮 - 在新标签页打开音乐页，实现后台播放（切换页面不中断）
(function() {
  // inner.html 已有音乐按钮，跳过
  if (document.getElementById('musicIconBtn')) return;

  var btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'side-icon side-icon-right';
  btn.id = 'musicIconBtn';
  btn.title = '留声机（新窗口，可后台播放）';
  btn.innerHTML = '<img src="assets/phonograph.svg" alt="留声机" class="side-icon-img" onerror="this.style.display=\'none\';this.nextElementSibling.style.display=\'block\'"><span class="side-icon-emoji" style="display:none">🎵</span>';
  document.body.appendChild(btn);
  btn.addEventListener('click', function() {
    window.open('music.html', '_blank', 'noopener');
  });
})();
