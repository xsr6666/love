// 用户认证与数据管理（支持腾讯云开发云端存储）
const _storage = () => window.CloudStorage || localStorage;
const STORAGE = {
  users: 'loveBase_users',
  posts: 'loveBase_posts',
  currentUser: 'loveBase_currentUser',
  setupDone: 'loveBase_setupDone',
  loveDays: 'loveBase_loveDays',
  lastCheckIn: 'loveBase_lastCheckIn',
  checkIns: 'loveBase_checkIns',
  messages: 'loveBase_messages',
  chat: 'loveBase_chat',
  albums: 'loveBase_albums',
  movies: 'loveBase_movies',
  games: 'loveBase_games',
  travelPlaces: 'loveBase_travelPlaces',
  todos: 'loveBase_todos',
  wishes: 'loveBase_wishes',
};

function getUsers() {
  const data = _storage().getItem(STORAGE.users);
  return data ? JSON.parse(data) : [];
}

function saveUsers(users) {
  _storage().setItem(STORAGE.users, JSON.stringify(users));
  _storage().setItem(STORAGE.setupDone, '1');
}

function getPosts() {
  const data = _storage().getItem(STORAGE.posts);
  return data ? JSON.parse(data) : [];
}

function savePosts(posts) {
  _storage().setItem(STORAGE.posts, JSON.stringify(posts));
}

function getCurrentUser() {
  const id = _storage().getItem(STORAGE.currentUser);
  if (!id) return null;
  const users = getUsers();
  return users.find(u => u.id === id) || null;
}

function setCurrentUser(userId) {
  if (userId) _storage().setItem(STORAGE.currentUser, userId);
  else _storage().removeItem(STORAGE.currentUser);
}

function isSetupDone() {
  return _storage().getItem(STORAGE.setupDone) === '1';
}

function isLoggedIn() {
  return !!getCurrentUser();
}

function getAlbums() {
  const data = _storage().getItem(STORAGE.albums);
  if (data) return JSON.parse(data);
  return [{ id: 'default', name: '默认相册' }, { id: 'daily', name: '日常' }, { id: 'travel', name: '旅行' }, { id: 'food', name: '美食' }];
}

function saveAlbums(albums) {
  _storage().setItem(STORAGE.albums, JSON.stringify(albums));
}

function getMovies() {
  const data = _storage().getItem(STORAGE.movies);
  return data ? JSON.parse(data) : [];
}

function saveMovies(movies) {
  _storage().setItem(STORAGE.movies, JSON.stringify(movies));
}

function getGames() {
  const data = _storage().getItem(STORAGE.games);
  return data ? JSON.parse(data) : [];
}

function saveGames(games) {
  _storage().setItem(STORAGE.games, JSON.stringify(games));
}

function getTravelPlaces() {
  const data = _storage().getItem(STORAGE.travelPlaces);
  return data ? JSON.parse(data) : {};
}

function saveTravelPlaces(data) {
  _storage().setItem(STORAGE.travelPlaces, JSON.stringify(data));
}

function getTodos() {
  const data = _storage().getItem(STORAGE.todos);
  return data ? JSON.parse(data) : [];
}

function saveTodos(todos) {
  _storage().setItem(STORAGE.todos, JSON.stringify(todos));
}

function getWishes() {
  const data = _storage().getItem(STORAGE.wishes);
  return data ? JSON.parse(data) : [];
}

function saveWishes(wishes) {
  _storage().setItem(STORAGE.wishes, JSON.stringify(wishes));
}

function addPost(post) {
  const posts = getPosts();
  const imgs = post.images && post.images.length ? post.images : (post.image ? [post.image] : []);
  const newPost = {
    id: Date.now().toString(),
    userId: post.userId,
    content: post.content || '',
    image: imgs[0] || '',
    images: imgs,
    video: post.video || '',
    albumId: post.albumId || 'default',
    visibility: post.visibility || 'public',
    timestamp: Date.now(),
  };
  posts.unshift(newPost);
  savePosts(posts);
  return newPost;
}

function getPostImages(post) {
  if (post.images && post.images.length) return post.images;
  return post.image ? [post.image] : [];
}

function getVisiblePosts(currentUserId) {
  const posts = getPosts();
  return posts.filter(p => {
    if (p.visibility === 'public') return true;
    return p.userId === currentUserId;
  });
}

function deletePost(id) {
  const list = getPosts().filter(p => p.id !== id);
  savePosts(list);
}

function getUserById(id) {
  return getUsers().find(u => u.id === id);
}

function getLoveDays() {
  const saved = _storage().getItem(STORAGE.loveDays);
  if (saved === null || saved === '') return 120;
  const n = parseInt(saved, 10);
  return isNaN(n) ? 120 : n;
}

function resetLoveDays() {
  _storage().removeItem(STORAGE.loveDays);
  _storage().removeItem(STORAGE.lastCheckIn);
  _storage().removeItem(STORAGE.checkIns);
}

function getLastCheckIn() {
  return _storage().getItem(STORAGE.lastCheckIn) || '';
}

function getCheckIns() {
  const data = _storage().getItem(STORAGE.checkIns);
  return data ? JSON.parse(data) : {};
}

function saveCheckIns(data) {
  _storage().setItem(STORAGE.checkIns, JSON.stringify(data));
}

function checkIn() {
  const user = getCurrentUser();
  if (!user) return { ok: false, msg: '请先登录' };
  const today = new Date().toDateString();
  const data = getCheckIns();
  const userData = data[user.id] || { count: 0, lastDate: '' };
  if (userData.lastDate === today) return { ok: false, msg: '今日已打卡', data: getCheckIns() };
  userData.count = (userData.count || 0) + 1;
  userData.lastDate = today;
  data[user.id] = userData;
  saveCheckIns(data);
  return { ok: true, msg: '打卡成功', data };
}

function getMessages() {
  const data = _storage().getItem(STORAGE.messages);
  return data ? JSON.parse(data) : [];
}

function addMessage(msg) {
  const list = getMessages();
  const newMsg = {
    id: Date.now().toString(),
    userId: msg.userId,
    content: msg.content || '',
    type: msg.type || 'text',
    audioUrl: msg.audioUrl || '',
    duration: msg.duration || 0,
    timestamp: Date.now(),
  };
  list.unshift(newMsg);
  _storage().setItem(STORAGE.messages, JSON.stringify(list));
  return newMsg;
}

function deleteMessage(id) {
  const list = getMessages().filter(m => m.id !== id);
  _storage().setItem(STORAGE.messages, JSON.stringify(list));
}

function getChatMessages() {
  const data = _storage().getItem(STORAGE.chat);
  return data ? JSON.parse(data) : [];
}

function addChatMessage(msg) {
  const list = getChatMessages();
  const newMsg = {
    id: Date.now().toString(),
    fromUserId: msg.fromUserId,
    content: msg.content,
    timestamp: Date.now(),
  };
  list.push(newMsg);
  _storage().setItem(STORAGE.chat, JSON.stringify(list));
  return newMsg;
}
