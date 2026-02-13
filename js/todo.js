// 代办日历 - 阴历阳历、节日、任务、想做的事
const FESTIVALS = {
  '1-1': '元旦', '2-14': '情人节', '5-1': '劳动节', '10-1': '国庆',
  '12-25': '圣诞', '7-7': '七夕', '8-15': '中秋',
};

document.addEventListener('DOMContentLoaded', async () => {
  await (window.StorageReady || Promise.resolve());
  if (!isLoggedIn()) {
    window.location.href = 'login.html?redirect=todo.html';
    return;
  }

  const savedBg = (localStorage.getItem('loveBase_bgImageInner') || '') || localStorage.getItem('loveBase_bgImage') || DEFAULT_BG;
  const bg = document.getElementById('todoBg');
  if (bg) bg.style.backgroundImage = `url('${savedBg}')`;

  const calEl = document.getElementById('todoCalendar');
  const calTitle = document.getElementById('calTitle');
  const calPrev = document.getElementById('calPrev');
  const calNext = document.getElementById('calNext');
  const todoList = document.getElementById('todoList');
  const todoInput = document.getElementById('todoInput');
  const todoAddBtn = document.getElementById('todoAddBtn');
  const todoPriority = document.getElementById('todoPriority');
  const todoAssign = document.getElementById('todoAssign');
  const todoDueDate = document.getElementById('todoDueDate');
  const dayModal = document.getElementById('dayModal');
  const dayBackdrop = document.getElementById('dayModalBackdrop');
  const dayContent = document.getElementById('dayModalContent');

  const users = getUsers();
  const me = getCurrentUser();
  let currentYear = new Date().getFullYear();
  let currentMonth = new Date().getMonth();
  let currentTab = 'pending';
  let selectedDate = null;

  function getLunarStr(y, m, d) {
    try {
      if (typeof Solar !== 'undefined') {
        const solar = Solar.fromYmd(parseInt(y,10), parseInt(m,10), parseInt(d,10));
        const lunar = solar.getLunar();
        return lunar.getDayInChinese() || '';
      }
    } catch (e) {}
    return '';
  }

  function getFestival(m, d) {
    return FESTIVALS[`${m}-${d}`] || '';
  }

  function renderCalendar() {
    calTitle.textContent = `${currentYear}年${currentMonth + 1}月`;
    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    const startPad = firstDay.getDay();
    const daysInMonth = lastDay.getDate();
    const prevMonthLast = new Date(currentYear, currentMonth, 0).getDate();

    const todos = getTodos();
    const wishes = getWishes();
    const allItems = [...todos, ...wishes.map(w => ({ ...w, isWish: true }))];

    let html = '<div class="cal-weekday">日</div><div class="cal-weekday">一</div><div class="cal-weekday">二</div><div class="cal-weekday">三</div><div class="cal-weekday">四</div><div class="cal-weekday">五</div><div class="cal-weekday">六</div>';

    const today = new Date();
    const todayStr = today.getFullYear() + '-' + (today.getMonth() + 1) + '-' + today.getDate();

    for (let i = 0; i < startPad; i++) {
      const d = prevMonthLast - startPad + i + 1;
      const pY = currentMonth === 0 ? currentYear - 1 : currentYear;
      const pM = currentMonth === 0 ? 12 : currentMonth;
      const dateStr = pY + '-' + pM + '-' + d;
      const lunar = getLunarStr(pY, pM, d);
      html += `<div class="cal-day other-month" data-date="${dateStr}"><span class="cal-day-num">${d}</span>${lunar ? `<span class="cal-day-lunar">${lunar}</span>` : ''}</div>`;
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = currentYear + '-' + (currentMonth + 1) + '-' + d;
      const dayTodos = allItems.filter(t => !t.isWish && t.dueDate === dateStr);
      const hasTodo = dayTodos.length > 0;
      const allDone = hasTodo && dayTodos.every(t => t.done);
      const lunar = getLunarStr(currentYear, currentMonth + 1, d);
      const fest = getFestival(currentMonth + 1, d);
      const isToday = dateStr === todayStr;
      const addHint = !hasTodo ? `<span class="cal-day-add">+</span>` : '';
      html += `
        <div class="cal-day ${isToday ? 'today' : ''} ${hasTodo ? (allDone ? 'done-todo' : 'has-todo') : ''}" data-date="${dateStr}">
          <span class="cal-day-num">${d}</span>
          ${lunar ? `<span class="cal-day-lunar">${lunar}</span>` : ''}
          ${fest ? `<span class="cal-day-fest">${fest}</span>` : ''}
          ${addHint}
        </div>
      `;
    }

    const totalCells = startPad + daysInMonth;
    const remaining = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);
    for (let i = 0; i < remaining; i++) {
      const d = i + 1;
      const nY = currentMonth === 11 ? currentYear + 1 : currentYear;
      const nM = currentMonth === 11 ? 1 : currentMonth + 2;
      const dateStr = nY + '-' + nM + '-' + d;
      html += `<div class="cal-day other-month" data-date="${dateStr}"><span class="cal-day-num">${d}</span></div>`;
    }

    calEl.innerHTML = html;

    calEl.querySelectorAll('.cal-day').forEach(el => {
      el.addEventListener('click', () => {
        selectedDate = el.dataset.date;
        openDayModal(selectedDate);
      });
    });
  }

  function openDayModal(dateStr) {
    const [y, m, d] = dateStr.split('-').map(Number);
    const lunar = getLunarStr(y, m, d);
    const fest = getFestival(m, d);
    const todos = getTodos().filter(t => t.dueDate === dateStr);
    const weekDays = ['日','一','二','三','四','五','六'];
    const date = new Date(y, m - 1, d);
    const weekDay = weekDays[date.getDay()];

    const priorityLabels = { 1: '低', 2: '中', 3: '高' };
    dayContent.innerHTML = `
      <h3>${y}年${m}月${d}日 周${weekDay}${fest ? ' · ' + fest : ''}</h3>
      ${lunar ? `<p class="todo-modal-lunar">农历 ${lunar}</p>` : ''}
      <div class="todo-day-list" id="dayTodoList">
        ${todos.length === 0 ? '<p class="todo-empty">暂无待办，下方输入添加</p>' : todos.map(t => {
          const creator = users.find(u => u.id === t.createdBy);
          const assign = users.find(u => u.id === t.assignTo);
          return `
            <div class="todo-item todo-item-modal ${t.done ? 'done' : ''}" data-id="${t.id}">
              <button type="button" class="todo-check">${t.done ? '✓' : ''}</button>
              <div class="todo-item-body">
                <div class="todo-item-text">${escapeHtml(t.content)}</div>
                <div class="todo-item-meta">${creator?.name || '?'} · ${assign ? (assign.name + ' 做') : '未指定'}${t.priority ? ' · ' + (priorityLabels[t.priority] || '') + '优先级' : ''}</div>
              </div>
              <button type="button" class="todo-item-del">×</button>
            </div>
          `;
        }).join('')}
      </div>
      <div class="todo-day-add-form">
        <input type="text" id="dayTodoInput" placeholder="添加这天的待办...">
        <div class="todo-day-add-options">
          <select id="dayTodoPriority" title="优先级">
            <option value="1">低</option>
            <option value="2" selected>中</option>
            <option value="3">高</option>
          </select>
          <select id="dayTodoAssign" title="谁来做">
            ${users.map(u => `<option value="${u.id}" ${u.id === me.id ? 'selected' : ''}>${escapeHtml(u.name)}</option>`).join('')}
          </select>
        </div>
        <button type="button" id="dayTodoAddBtn">添加</button>
      </div>
    `;

    dayModal.classList.remove('hidden');

    dayContent.querySelectorAll('.todo-check').forEach(btn => {
      const item = btn.closest('.todo-item');
      btn.addEventListener('click', () => {
        const list = getTodos();
        const todo = list.find(x => x.id === item.dataset.id);
        if (todo) {
          todo.done = !todo.done;
          saveTodos(list);
          openDayModal(dateStr);
          renderCalendar();
          renderTodoList();
        }
      });
    });

    dayContent.querySelectorAll('.todo-item-del').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (!confirm('删除这条待办？')) return;
        const list = getTodos().filter(x => x.id !== btn.closest('.todo-item').dataset.id);
        saveTodos(list);
        openDayModal(dateStr);
        renderCalendar();
        renderTodoList();
      });
    });

    const doAddDayTodo = () => {
      const input = dayContent.querySelector('#dayTodoInput');
      const content = input?.value?.trim();
      if (!content) return;
      const priorityEl = dayContent.querySelector('#dayTodoPriority');
      const assignEl = dayContent.querySelector('#dayTodoAssign');
      const list = getTodos();
      list.push({
        id: Date.now().toString(),
        content,
        dueDate: dateStr,
        createdBy: me.id,
        assignTo: assignEl ? assignEl.value : me.id,
        priority: priorityEl ? parseInt(priorityEl.value, 10) : 2,
        done: false,
        createdAt: Date.now(),
      });
      saveTodos(list);
      input.value = '';
      openDayModal(dateStr);
      renderCalendar();
      renderTodoList();
    };
    dayContent.querySelector('#dayTodoAddBtn')?.addEventListener('click', doAddDayTodo);
    dayContent.querySelector('#dayTodoInput')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); doAddDayTodo(); }
    });
  }

  function renderTodoList() {
    const todos = getTodos();
    const wishes = getWishes();

    const priorityLabels = { 1: '低', 2: '中', 3: '高' };
    if (currentTab === 'pending') {
      const pending = todos.filter(t => !t.done).sort((a, b) => (a.dueDate || '').localeCompare(b.dueDate || '') || (b.priority || 0) - (a.priority || 0));
      todoList.innerHTML = pending.length === 0 ? '<p class="todo-empty">暂无待办</p>' : pending.map(t => {
        const creator = users.find(u => u.id === t.createdBy);
        const assign = users.find(u => u.id === t.assignTo);
        const priLabel = t.priority ? priorityLabels[t.priority] || '' : '';
        return `
          <div class="todo-item" data-id="${t.id}">
            <button type="button" class="todo-check"></button>
            <div class="todo-item-body">
              <div class="todo-item-text">${escapeHtml(t.content)}</div>
              <div class="todo-item-meta">${t.dueDate || '无日期'} · ${creator?.name || '?'}${assign ? ' → ' + assign.name : ' 未指定'}${priLabel ? ' · ' + priLabel + '优先级' : ''}</div>
            </div>
            <button type="button" class="todo-item-del">×</button>
          </div>
        `;
      }).join('');
    } else if (currentTab === 'done') {
      const done = todos.filter(t => t.done).sort((a, b) => (b.doneAt || 0) - (a.doneAt || 0));
      todoList.innerHTML = done.length === 0 ? '<p class="todo-empty">暂无已完成</p>' : done.map(t => {
        const creator = users.find(u => u.id === t.createdBy);
        return `
          <div class="todo-item done" data-id="${t.id}">
            <button type="button" class="todo-check">✓</button>
            <div class="todo-item-body">
              <div class="todo-item-text">${escapeHtml(t.content)}</div>
              <div class="todo-item-meta">${t.dueDate || ''} · ${creator?.name || '?'}</div>
            </div>
            <button type="button" class="todo-item-del">×</button>
          </div>
        `;
      }).join('');
    } else {
      todoList.innerHTML = wishes.length === 0 ? '<p class="todo-empty">想想有什么想做的事~</p>' : wishes.map(w => {
        const creator = users.find(u => u.id === w.createdBy);
        return `
          <div class="todo-item" data-id="${w.id}" data-wish="1">
            <button type="button" class="todo-check todo-wish-star">☆</button>
            <div class="todo-item-body">
              <div class="todo-item-text">${escapeHtml(w.content)}</div>
              <div class="todo-item-meta">${creator?.name || '?'} 想做的事</div>
            </div>
            <button type="button" class="todo-item-del">×</button>
          </div>
        `;
      }).join('');
    }

    todoList.querySelectorAll('.todo-check').forEach(btn => {
      const item = btn.closest('.todo-item');
      if (item.dataset.wish) return;
      btn.addEventListener('click', () => {
        const list = getTodos();
        const todo = list.find(x => x.id === item.dataset.id);
        if (todo) {
          todo.done = !todo.done;
          todo.doneAt = todo.done ? Date.now() : 0;
          saveTodos(list);
          renderCalendar();
          renderTodoList();
        }
      });
    });

    todoList.querySelectorAll('.todo-item-del').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const item = btn.closest('.todo-item');
        if (item.dataset.wish) {
          if (!confirm('删除这条想做的事？')) return;
          const list = getWishes().filter(x => x.id !== item.dataset.id);
          saveWishes(list);
        } else {
          if (!confirm('删除这条待办？')) return;
          const list = getTodos().filter(x => x.id !== item.dataset.id);
          saveTodos(list);
        }
        renderCalendar();
        renderTodoList();
      });
    });
  }

  function escapeHtml(s) {
    if (!s) return '';
    const d = document.createElement('div');
    d.textContent = s;
    return d.innerHTML;
  }

  calPrev.addEventListener('click', () => {
    currentMonth--;
    if (currentMonth < 0) { currentMonth = 11; currentYear--; }
    renderCalendar();
  });

  calNext.addEventListener('click', () => {
    currentMonth++;
    if (currentMonth > 11) { currentMonth = 0; currentYear++; }
    renderCalendar();
  });

  document.querySelectorAll('.todo-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      currentTab = btn.dataset.tab;
      document.querySelectorAll('.todo-tab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderTodoList();
    });
  });

  function initTodoAddForm() {
    if (todoAssign) {
      todoAssign.innerHTML = users.map(u => `<option value="${u.id}" ${u.id === me.id ? 'selected' : ''}>${escapeHtml(u.name)}</option>`).join('');
    }
    if (todoDueDate) {
      const today = new Date();
      todoDueDate.value = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');
    }
  }
  initTodoAddForm();

  todoAddBtn.addEventListener('click', () => {
    const content = todoInput.value.trim();
    if (!content) return;
    if (currentTab === 'wish') {
      const list = getWishes();
      list.push({ id: Date.now().toString(), content, createdBy: me.id, createdAt: Date.now() });
      saveWishes(list);
    } else {
      const dateStr = todoDueDate?.value || (() => {
        const t = new Date();
        return t.getFullYear() + '-' + (t.getMonth() + 1) + '-' + t.getDate();
      })();
      const list = getTodos();
      list.push({
        id: Date.now().toString(),
        content,
        dueDate: dateStr,
        createdBy: me.id,
        assignTo: todoAssign?.value || me.id,
        priority: todoPriority ? parseInt(todoPriority.value, 10) : 2,
        done: false,
        createdAt: Date.now(),
      });
      saveTodos(list);
    }
    todoInput.value = '';
    renderCalendar();
    renderTodoList();
  });

  dayBackdrop.addEventListener('click', () => dayModal.classList.add('hidden'));

  renderCalendar();
  renderTodoList();
});
