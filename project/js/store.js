// 数据存储层 - localStorage CRUD

const Store = {
  _keys: [
    'users', 'products', 'messages', 'orders', 'favorites', 'cart',
    'ratings', 'currentUser',
  ],

  _init() {
    if (!localStorage.getItem('secondhand_users')) {
      localStorage.setItem('secondhand_users', JSON.stringify(MOCK_USERS));
      localStorage.setItem('secondhand_products', JSON.stringify(MOCK_PRODUCTS));
      localStorage.setItem('secondhand_messages', JSON.stringify(MOCK_MESSAGES));
      localStorage.setItem('secondhand_orders', JSON.stringify(MOCK_ORDERS));
      localStorage.setItem('secondhand_favorites', JSON.stringify([]));
      localStorage.setItem('secondhand_cart', JSON.stringify([]));
      localStorage.setItem('secondhand_ratings', JSON.stringify(MOCK_RATINGS));
      localStorage.setItem('secondhand_currentUser', 'null');
    }
  },

  // ===== 当前用户 =====
  getCurrentUser() {
    const raw = localStorage.getItem('secondhand_currentUser');
    return raw ? JSON.parse(raw) : null;
  },
  setCurrentUser(user) {
    localStorage.setItem('secondhand_currentUser', JSON.stringify(user));
  },
  logout() {
    localStorage.setItem('secondhand_currentUser', 'null');
  },
  isAdmin() {
    const u = this.getCurrentUser();
    return u && u.role === 'admin';
  },

  // ===== 通用读写 =====
  _get(key) {
    this._init();
    return JSON.parse(localStorage.getItem('secondhand_' + key) || '[]');
  },
  _set(key, data) {
    localStorage.setItem('secondhand_' + key, JSON.stringify(data));
  },

  // ===== 商品 =====
  getProducts() { return this._get('products'); },
  getProduct(id) { return this._get('products').find(p => p.id === id); },
  addProduct(product) { const list = this._get('products'); list.unshift(product); this._set('products', list); },
  updateProduct(id, updates) { const list = this._get('products'); const idx = list.findIndex(p => p.id === id); if (idx !== -1) { list[idx] = { ...list[idx], ...updates }; this._set('products', list); } },
  deleteProduct(id) { this._set('products', this._get('products').filter(p => p.id !== id)); },
  // 管理员审核
  auditProduct(id, status) { this.updateProduct(id, { status }); },
  getPendingProducts() { return this._get('products').filter(p => p.status === 'pending'); },

  // ===== 用户 =====
  getUsers() { return this._get('users'); },
  getUser(id) { return this._get('users').find(u => u.id === id); },
  getUserByStudentId(sid) { return this._get('users').find(u => u.studentId === sid); },
  findByUsername(username) { return this._get('users').find(u => u.username === username); },
  addUser(user) { const list = this._get('users'); list.push(user); this._set('users', list); },
  updateUser(id, updates) { const list = this._get('users'); const idx = list.findIndex(u => u.id === id); if (idx !== -1) { list[idx] = { ...list[idx], ...updates }; this._set('users', list); if (this.getCurrentUser()?.id === id) this.setCurrentUser(list[idx]); } },

  // ===== 消息 =====
  getMessages() { return this._get('messages'); },
  addMessage(msg) { const list = this._get('messages'); list.push(msg); this._set('messages', list); },

  // ===== 订单 =====
  getOrders() { return this._get('orders'); },
  addOrder(order) { const list = this._get('orders'); list.unshift(order); this._set('orders', list); },
  updateOrder(id, updates) { const list = this._get('orders'); const idx = list.findIndex(o => o.id === id); if (idx !== -1) { list[idx] = { ...list[idx], ...updates }; this._set('orders', list); } },

  // ===== 收藏 =====
  getFavorites() { return this._get('favorites'); },
  isFavorite(userId, productId) { return this._get('favorites').some(f => f.userId === userId && f.productId === productId); },
  toggleFavorite(userId, productId) { const list = this._get('favorites'); const idx = list.findIndex(f => f.userId === userId && f.productId === productId); if (idx !== -1) { list.splice(idx, 1); this._set('favorites', list); return false; } else { list.push({ userId, productId }); this._set('favorites', list); return true; } },

  // ===== 购物车 =====
  getCart(userId) { return this._get('cart').filter(c => c.userId === userId); },
  addToCart(userId, productId, quantity = 1) { const list = this._get('cart'); const exist = list.find(c => c.userId === userId && c.productId === productId); if (exist) { exist.quantity += quantity; } else { list.push({ userId, productId, quantity }); } this._set('cart', list); },
  removeFromCart(userId, productId) { this._set('cart', this._get('cart').filter(c => !(c.userId === userId && c.productId === productId))); },
  updateCartQuantity(userId, productId, quantity) { const list = this._get('cart'); const item = list.find(c => c.userId === userId && c.productId === productId); if (item) { item.quantity = Math.max(1, quantity); } this._set('cart', list); },
  clearCart(userId) { this._set('cart', this._get('cart').filter(c => c.userId !== userId)); },

  // ===== 信用评价 =====
  getRatings() { return this._get('ratings'); },
  getUserRatings(userId) { return this._get('ratings').filter(r => r.toUserId === userId); },
  getAvgRating(userId) { const ratings = this.getUserRatings(userId); if (ratings.length === 0) return 0; return ratings.reduce((s, r) => s + r.score, 0) / ratings.length; },
  addRating(rating) { const list = this._get('ratings'); list.push(rating); this._set('ratings', list); },
};

Store._init();
