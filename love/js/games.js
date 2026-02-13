// 游戏推荐
let gamesList, gamesEmpty, addGameBtn, gameModal, gameModalBackdrop, gameModalContent;

function escapeHtml(s) {
  if (!s) return '';
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

function renderGames() {
  const list = getGames();
  if (list.length === 0) {
    gamesList.classList.add('hidden');
    gamesEmpty.classList.remove('hidden');
    return;
  }
  gamesList.classList.remove('hidden');
  gamesEmpty.classList.add('hidden');
  gamesList.innerHTML = list.map(g => {
    const doubanUrl = g.doubanUrl || `https://www.douban.com/search?q=${encodeURIComponent(g.name)}`;
    return `
      <div class="game-card" data-id="${g.id}">
        <img class="game-card-cover" src="${g.cover || 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2290%22 height=%22120%22><rect fill=%22%23333%22 width=%2290%22 height=%22120%22/><text x=%2245%22 y=%2260%22 fill=%22%23666%22 text-anchor=%22middle%22 dy=%22.3em%22 font-size=%2212%22>无封面</text></svg>'}" alt="${escapeHtml(g.name)}">
        <div class="game-card-body">
          <h3 class="game-card-title">${escapeHtml(g.name)}</h3>
          <p class="game-card-meta">${g.platform ? escapeHtml(g.platform) : ''} ${g.ourScore ? '· 我们 ' + g.ourScore + ' 分' : ''}</p>
          <a href="${doubanUrl}" target="_blank" rel="noopener" class="game-card-link">豆瓣搜索</a>
        </div>
      </div>
    `;
  }).join('');
}

function openModal(game, isNew) {
  const g = game || { id: Date.now().toString(), name: '', cover: '', platform: '', desc: '', doubanUrl: '', ourScore: '' };
  let html = `
    <h3 class="modal-title">${isNew ? '添加游戏' : '编辑游戏'}</h3>
    <div class="form-group">
      <label>游戏名称</label>
      <input type="text" id="gameName" value="${escapeHtml(g.name)}" placeholder="如：塞尔达传说">
    </div>
    <div class="form-group">
      <label>封面链接</label>
      <input type="url" id="gameCover" value="${escapeHtml(g.cover || '')}" placeholder="图片链接">
    </div>
    <div class="form-group">
      <label>平台</label>
      <input type="text" id="gamePlatform" value="${escapeHtml(g.platform || '')}" placeholder="如：Switch、PC">
    </div>
    <div class="form-group">
      <label>豆瓣链接（可选）</label>
      <input type="url" id="gameDouban" value="${escapeHtml(g.doubanUrl || '')}" placeholder="豆瓣游戏页链接">
    </div>
    <div class="form-group">
      <label>我们的评分（0-10）</label>
      <input type="number" id="gameOurScore" min="0" max="10" step="0.5" value="${g.ourScore || ''}" placeholder="选填">
    </div>
    <div class="form-group">
      <label>备注</label>
      <textarea id="gameDesc" placeholder="简单描述">${escapeHtml(g.desc || '')}</textarea>
    </div>
    <div class="modal-actions">
      <button type="button" class="modal-save" id="gameSave">保存</button>
      ${isNew ? '' : '<button type="button" class="modal-delete" id="gameDelete">删除</button>'}
    </div>
  `;
  gameModalContent.innerHTML = html;
  gameModal.classList.remove('hidden');

  document.getElementById('gameSave').onclick = () => {
    const updated = {
      id: g.id,
      name: document.getElementById('gameName').value.trim(),
      cover: document.getElementById('gameCover').value.trim(),
      platform: document.getElementById('gamePlatform').value.trim(),
      doubanUrl: document.getElementById('gameDouban').value.trim(),
      ourScore: document.getElementById('gameOurScore').value.trim(),
      desc: document.getElementById('gameDesc').value.trim(),
    };
    if (!updated.name) {
      alert('请输入游戏名称');
      return;
    }
    const list = getGames();
    if (isNew) {
      list.unshift(updated);
    } else {
      const idx = list.findIndex(x => x.id === g.id);
      if (idx >= 0) list[idx] = updated;
    }
    saveGames(list);
    closeModal();
    renderGames();
  };

  if (!isNew) {
    document.getElementById('gameDelete').onclick = () => {
      if (!confirm('确定删除这个游戏吗？')) return;
      const list = getGames().filter(x => x.id !== g.id);
      saveGames(list);
      closeModal();
      renderGames();
    };
  }
}

function closeModal() {
  gameModal.classList.add('hidden');
}

document.addEventListener('DOMContentLoaded', async () => {
  await (window.StorageReady || Promise.resolve());
  gamesList = document.getElementById('gamesList');
  gamesEmpty = document.getElementById('gamesEmpty');
  addGameBtn = document.getElementById('addGameBtn');
  gameModal = document.getElementById('gameModal');
  gameModalBackdrop = document.getElementById('gameModalBackdrop');
  gameModalContent = document.getElementById('gameModalContent');
  if (!gamesList) return;
  gameModalBackdrop.onclick = closeModal;
  addGameBtn.addEventListener('click', (e) => {
    e.preventDefault();
    openModal(null, true);
  });
  gamesList.addEventListener('click', (e) => {
    const card = e.target.closest('.game-card');
    if (!card) return;
    const id = card.dataset.id;
    const game = getGames().find(g => g.id === id);
    if (game) openModal(game, false);
  });
  renderGames();
});
