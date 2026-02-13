// 内页首页：携手计时 + 打卡 + 留言板
document.addEventListener('DOMContentLoaded', async () => {
  await (window.StorageReady || Promise.resolve());
  const checkinCompare = document.getElementById('checkinCompare');
  const checkinBtn = document.getElementById('checkinBtn');
  const checkinHint = document.getElementById('checkinHint');
  const msgInput = document.getElementById('msgInput');
  const msgSendBtn = document.getElementById('msgSendBtn');
  const msgVoiceBtn = document.getElementById('msgVoiceBtn');
  const messageList = document.getElementById('messageList');

  function updateCheckin() {
    const data = getCheckIns();
    const users = getUsers();
    const me = getCurrentUser();
    const today = new Date().toDateString();
    const myData = data[me?.id] || { count: 0, lastDate: '' };
    const done = myData.lastDate === today;
    const todayChecked = users.filter(u => (data[u.id] || {}).lastDate === today);
    if (todayChecked.length === 0) {
      if (checkinCompare) checkinCompare.textContent = '今天还没有人打卡哦';
      return;
    }
    if (todayChecked.length === 1 && users.length >= 2) {
      const checker = todayChecked[0];
      const other = users.find(u => u.id !== checker.id);
      if (other) {
        checkinCompare.textContent = `${checker.name || checker.nickname || 'TA'}今天好喜欢${other.name || other.nickname || 'TA'}`;
        return;
      }
    }
    const parts = users.map(u => {
      const d = data[u.id] || { count: 0 };
      return `${u.name || u.nickname || '?'}:${d.count || 0}`;
    });
    if (checkinCompare) checkinCompare.textContent = parts.join(' vs ') || '看谁打卡多';
  }

  function spawnHearts() {
    const container = document.body;
    for (let i = 0; i < 8; i++) {
      const heart = document.createElement('span');
      heart.className = 'falling-heart';
      heart.textContent = '♥';
      heart.style.left = Math.random() * 100 + '%';
      heart.style.animationDelay = Math.random() * 0.5 + 's';
      heart.style.fontSize = (14 + Math.random() * 20) + 'px';
      container.appendChild(heart);
      setTimeout(() => heart.remove(), 2000);
    }
  }

  let heartClickCount = 0;
  let heartClickTimer = null;

  if (checkinBtn) {
    checkinBtn.disabled = false;
    checkinBtn.addEventListener('click', () => {
      spawnHearts();
      checkinBtn.classList.add('heart-pulse');
      setTimeout(() => checkinBtn.classList.remove('heart-pulse'), 300);
      const res = checkIn();
      updateCheckin();
      if (res.ok) {
        checkinHint.textContent = '打卡成功 +1';
        checkinHint.style.color = 'rgba(255,255,255,0.9)';
        setTimeout(() => { checkinHint.textContent = ''; }, 1500);
      } else {
        checkinHint.textContent = res.msg;
        checkinHint.style.color = 'rgba(255,255,255,0.6)';
        heartClickCount++;
        if (heartClickTimer) clearTimeout(heartClickTimer);
        heartClickTimer = setTimeout(() => { heartClickCount = 0; }, 2000);
        if (heartClickCount >= 5) {
          checkinHint.textContent = '我也爱你宝宝';
          checkinHint.style.color = 'rgba(255,182,193,1)';
          heartClickCount = 0;
          setTimeout(() => { checkinHint.textContent = ''; }, 2000);
        }
      }
    });
  }

  function updateTimer() {
    const now = new Date();
    const diff = now - LOVE_START;
    if (diff < 0) return;
    const days = Math.floor(diff / 86400000);
    const hours = Math.floor((diff % 86400000) / 3600000);
    const mins = Math.floor((diff % 3600000) / 60000);
    const secs = Math.floor((diff % 60000) / 1000);
    const d = document.getElementById('timerDays');
    const h = document.getElementById('timerHours');
    const m = document.getElementById('timerMins');
    const s = document.getElementById('timerSecs');
    if (d) d.textContent = days;
    if (h) h.textContent = String(hours).padStart(2, '0');
    if (m) m.textContent = String(mins).padStart(2, '0');
    if (s) s.textContent = String(secs).padStart(2, '0');
  }
  updateTimer();
  setInterval(updateTimer, 1000);

  function renderMessages() {
    if (!messageList) return;
    const msgs = getMessages();
    const users = getUsers();
    const me = getCurrentUser();
    if (msgs.length === 0) {
      messageList.innerHTML = '<p class="msg-empty">暂无留言，<a href="messages.html">去留言</a></p>';
      return;
    }
    messageList.innerHTML = msgs.slice(0, 5).map(m => {
      const user = users.find(u => u.id === m.userId) || { name: '?' };
      const time = new Date(m.timestamp);
      const timeStr = time.getMonth() + 1 + '/' + time.getDate() + ' ' + (time.getHours() + '').padStart(2, '0') + ':' + (time.getMinutes() + '').padStart(2, '0');
      const dur = m.duration ? `${m.duration}秒` : '';
      const body = m.type === 'voice' && m.audioUrl
        ? `<div class="msg-voice-card" data-audio="${m.audioUrl.replace(/"/g, '&quot;')}"><button type="button" class="msg-voice-play-btn" title="播放">▶</button><span class="msg-voice-dur">${dur}</span></div>`
        : `<p class="msg-content">${escapeHtml(m.content)}</p>`;
      const canDel = me && m.userId === me.id;
      return `
        <div class="msg-card" data-id="${m.id}">
          <div class="msg-card-header">
            <span class="msg-author">${escapeHtml(user.name)}</span>
            <div class="msg-card-header-right">
              <span class="msg-time">${timeStr}</span>
              ${canDel ? `<button type="button" class="msg-del-btn" data-id="${m.id}" title="删除">×</button>` : ''}
            </div>
          </div>
          ${body}
        </div>
      `;
    }).join('') + (msgs.length > 5 ? `<a href="messages.html" class="msg-more">查看全部 ${msgs.length} 条</a>` : '');
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML.replace(/\n/g, '<br>');
  }

  if (msgSendBtn) {
    msgSendBtn.addEventListener('click', () => {
      const content = msgInput.value.trim();
      if (!content) return;
      const user = getCurrentUser();
      if (!user) return;
      addMessage({ userId: user.id, content });
      msgInput.value = '';
      renderMessages();
    });
  }

  if (msgInput) {
    msgInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        msgSendBtn.click();
      }
    });
  }

  if (msgVoiceBtn) {
    initVoiceMsg(msgVoiceBtn, (data) => {
      const user = getCurrentUser();
      if (!user) return;
      addMessage({ userId: user.id, type: 'voice', audioUrl: data.audioUrl, duration: data.duration });
      renderMessages();
    });
  }

  messageList?.addEventListener('click', (e) => {
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
      renderMessages();
    }
  });

  updateCheckin();
  renderMessages();
});
