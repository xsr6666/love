// 全局聊天入口 - 在非 inner 页面注入聊天按钮和弹窗
(function() {
  if (document.getElementById('pandaBtn')) return;

  var btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'side-icon side-icon-left';
  btn.id = 'pandaBtn';
  btn.title = '私聊';
  btn.innerHTML = '<img src="assets/redpanda.svg" alt="小熊猫" class="side-icon-img" onerror="this.style.display=\'none\';this.nextElementSibling.style.display=\'block\'"><span class="side-icon-emoji" style="display:none">🦊</span>';
  document.body.appendChild(btn);

  var popup = document.createElement('div');
  popup.className = 'chat-popup';
  popup.id = 'chatPopup';
  popup.innerHTML =
    '<div class="chat-window">' +
      '<div class="chat-header"><h3>💬 私聊</h3><button type="button" class="chat-close" id="chatClose">×</button></div>' +
      '<div class="chat-messages" id="chatMessages"></div>' +
      '<div class="chat-form">' +
        '<input type="text" id="chatInput" placeholder="说句悄悄话...">' +
        '<button type="button" class="chat-send" id="chatSendBtn">发送</button>' +
      '</div>' +
    '</div>';
  document.body.appendChild(popup);

  var chatPopup = document.getElementById('chatPopup');
  var chatClose = document.getElementById('chatClose');
  var chatMessages = document.getElementById('chatMessages');
  var chatInput = document.getElementById('chatInput');
  var chatSendBtn = document.getElementById('chatSendBtn');

  btn.addEventListener('click', function() { chatPopup.classList.add('open'); });
  chatClose.addEventListener('click', function() { chatPopup.classList.remove('open'); });
  chatPopup.addEventListener('click', function(e) { if (e.target === chatPopup) chatPopup.classList.remove('open'); });

  function initChat() {
    if (typeof getCurrentUser !== 'function' || typeof getChatMessages !== 'function') return;
    var me = getCurrentUser();
    if (!me) {
      chatMessages.innerHTML = '<p class="chat-empty">请先<a href="login.html">登录</a>后使用聊天</p>';
      return;
    }
    var users = typeof getUsers === 'function' ? getUsers() : [];
    function escapeHtml(t) {
      var d = document.createElement('div');
      d.textContent = t;
      return d.innerHTML.replace(/\n/g, '<br>');
    }
    function render() {
      var msgs = getChatMessages();
      if (msgs.length === 0) {
        chatMessages.innerHTML = '<p class="chat-empty">暂无消息，开始聊天吧</p>';
        chatMessages.scrollTop = 0;
        return;
      }
      chatMessages.innerHTML = msgs.map(function(m) {
        var isMe = m.fromUserId === me.id;
        var sender = users.find(function(u) { return u.id === m.fromUserId; });
        var name = sender ? sender.name : '?';
        var time = new Date(m.timestamp);
        var timeStr = (time.getMonth() + 1) + '/' + time.getDate() + ' ' + (time.getHours() + '').padStart(2, '0') + ':' + (time.getMinutes() + '').padStart(2, '0');
        return '<div class="chat-msg ' + (isMe ? 'chat-msg-me' : '') + '"><span class="chat-msg-meta">' + name + ' · ' + timeStr + '</span><p class="chat-msg-content">' + escapeHtml(m.content) + '</p></div>';
      }).join('');
      chatMessages.scrollTop = chatMessages.scrollHeight;
    }
    render();
    function send() {
      var content = chatInput.value.trim();
      if (!content) return;
      addChatMessage({ fromUserId: me.id, content: content });
      chatInput.value = '';
      render();
    }
    chatSendBtn.addEventListener('click', send);
    chatInput.addEventListener('keypress', function(e) { if (e.key === 'Enter') { e.preventDefault(); send(); } });
  }

  document.addEventListener('DOMContentLoaded', function() {
    (window.StorageReady || Promise.resolve()).then(function() {
      setTimeout(initChat, 50);
    }).catch(function() { setTimeout(initChat, 50); });
  });
})();
