// 留言板详情页
document.addEventListener('DOMContentLoaded', async () => {
  await (window.StorageReady || Promise.resolve());
  if (!isLoggedIn()) {
    window.location.href = 'login.html?redirect=messages.html';
    return;
  }

  const savedBg = (localStorage.getItem('loveBase_bgImageInner') || '') || localStorage.getItem('loveBase_bgImage') || DEFAULT_BG;
  const bg = document.getElementById('messagesBg');
  if (bg) bg.style.backgroundImage = `url('${savedBg}')`;

  const msgInput = document.getElementById('msgInput');
  const msgSendBtn = document.getElementById('msgSendBtn');
  const msgVoiceBtn = document.getElementById('msgVoiceBtn');
  const messageList = document.getElementById('messageList');

  function render() {
    const msgs = getMessages();
    const users = getUsers();
    if (msgs.length === 0) {
      messageList.innerHTML = `
        <div class="messages-empty">
          <p>还没有留言</p>
          <p class="hint">写下第一句悄悄话吧~</p>
        </div>
      `;
      return;
    }
    const me = getCurrentUser();
    messageList.innerHTML = msgs.map(m => {
      const user = users.find(u => u.id === m.userId) || { name: '?' };
      const time = new Date(m.timestamp);
      const dateStr = time.getFullYear() + '-' + (time.getMonth() + 1 + '').padStart(2, '0') + '-' + (time.getDate() + '').padStart(2, '0');
      const timeStr = (time.getHours() + '').padStart(2, '0') + ':' + (time.getMinutes() + '').padStart(2, '0');
      const dur = m.duration ? `${m.duration}秒` : '';
      const body = m.type === 'voice' && m.audioUrl
        ? `<div class="msg-card-full-body"><div class="msg-voice-card msg-voice-card-full" data-audio="${m.audioUrl.replace(/"/g, '&quot;')}"><button type="button" class="msg-voice-play-btn" title="播放">▶</button><span class="msg-voice-dur">${dur}</span></div></div>`
        : `<div class="msg-card-full-body">${escapeHtml(m.content).replace(/\n/g, '<br>')}</div>`;
      const canDel = me && m.userId === me.id;
      return `
        <article class="msg-card-full" data-id="${m.id}">
          <div class="msg-card-full-header">
            <span class="msg-author">${escapeHtml(user.name)}</span>
            <div class="msg-card-full-header-right">
              <time>${dateStr} ${timeStr}</time>
              ${canDel ? `<button type="button" class="msg-del-btn" data-id="${m.id}" title="删除">×</button>` : ''}
            </div>
          </div>
          ${body}
        </article>
      `;
    }).join('');
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  msgSendBtn.addEventListener('click', () => {
    const content = msgInput.value.trim();
    if (!content) return;
    const user = getCurrentUser();
    if (!user) return;
    addMessage({ userId: user.id, content });
    msgInput.value = '';
    render();
  });

  if (msgVoiceBtn) {
    initVoiceMsg(msgVoiceBtn, (data) => {
      const user = getCurrentUser();
      if (!user) return;
      addMessage({ userId: user.id, type: 'voice', audioUrl: data.audioUrl, duration: data.duration });
      render();
    });
  }

  messageList.addEventListener('click', (e) => {
    const playBtn = e.target.closest('.msg-voice-play-btn');
    if (playBtn) {
      const wrap = playBtn.closest('.msg-voice-card');
      const url = wrap?.dataset?.audio;
      if (url) {
        const audio = new Audio(url);
        audio.play();
        playBtn.textContent = '⏸';
        playBtn.classList.add('playing');
        audio.onended = () => { playBtn.textContent = '▶'; playBtn.classList.remove('playing'); };
      }
      return;
    }
    const delBtn = e.target.closest('.msg-del-btn');
    if (delBtn && confirm('确定删除这条留言？')) {
      deleteMessage(delBtn.dataset.id);
      render();
    }
  });

  msgInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      msgSendBtn.click();
    }
  });

  render();
});
