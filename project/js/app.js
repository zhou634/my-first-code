// 校园二手物品平台 — 路由注册 + 页面渲染

const router = new Router();

// ========== 公共组件 ==========

function createHeader() {
  const user = Store.getCurrentUser();
  return `
    <header class="header">
      <div class="header-inner">
        <a href="#/home" class="logo">🎓 校园二手集市</a>
        <div class="header-search" id="headerSearch">
          <input type="text" placeholder="搜索教材、数码、生活用品..." id="globalSearchInput" value="">
          <button id="globalSearchBtn"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg></button>
        </div>
        <nav class="header-nav">
          ${Store.isAdmin() ? '<a href="#/admin" class="nav-link admin-link">管理后台</a>' : ''}
          <a href="#/home" class="nav-link">首页</a>
          <a href="#/publish" class="btn btn-primary btn-sm">发布</a>
          ${user
            ? `<div class="user-dropdown" id="userDropdown">
                <span class="user-avatar-small">${(user.username || 'U')[0].toUpperCase()}</span>
                <span>${escapeHtml(user.username)}</span>
                <span class="credit-badge-mini" style="background:${getCreditLevel(user.creditScore || 0).color}">${getCreditLevel(user.creditScore || 0).label}</span>
                <div class="dropdown-menu" id="dropdownMenu">
                  <a href="#/profile">个人中心</a>
                  <a href="#/cart">购物车</a>
                  <a href="#/favorites">收藏夹</a>
                  <a href="#/chat">消息</a>
                  <a href="#/orders">我的订单</a>
                  <hr>
                  <a href="#" id="logoutBtn">退出登录</a>
                </div>
              </div>`
            : `<a href="#/login" class="btn btn-outline btn-sm">登录/注册</a>`
          }
        </nav>
      </div>
    </header>
  `;
}

function createProductCard(p) {
  const seller = Store.getUser(p.sellerId);
  const credit = getCreditLevel(seller ? seller.creditScore || 0 : 0);
  return `
    <a href="#/detail/${p.id}" class="product-card">
      <div class="product-img">
        <img src="${getProductImage(p)}" alt="${escapeHtml(p.title)}" loading="lazy">
        <span class="product-condition">${CONDITION_MAP[p.condition]}</span>
        ${p.category === '考研考公' || p.category === '教材教辅' ? '<span class="product-zone-tag">📚</span>' : ''}
      </div>
      <div class="product-info">
        <h3 class="product-title">${escapeHtml(p.title)}</h3>
        <div class="product-price">
          <span class="price-current">${formatPrice(p.price)}</span>
          ${p.originalPrice > p.price ? `<span class="price-original">${formatPrice(p.originalPrice)}</span>` : ''}
        </div>
        <div class="product-meta">
          <span class="seller-credit" style="color:${credit.color}" title="信用: ${credit.label}">◆ ${seller ? escapeHtml(seller.username) : '未知'}</span>
          <span>${escapeHtml(p.campus || '')}</span>
        </div>
      </div>
    </a>
  `;
}

function createBottomNav() {
  const current = location.hash.slice(1).split('?')[0];
  const items = [
    { path: '/home', icon: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>', label: '首页' },
    { path: '/cart', icon: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>', label: '购物车' },
    { path: '/publish', icon: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>', label: '发布' },
    { path: '/chat', icon: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>', label: '消息' },
    { path: '/profile', icon: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>', label: '我的' },
  ];
  return `
    <nav class="bottom-nav">
      ${items.map(i => `
        <a href="#${i.path}" class="bottom-nav-item ${current === i.path ? 'active' : ''}">
          ${i.icon}
          <span>${i.label}</span>
        </a>
      `).join('')}
    </nav>
  `;
}

// 信用徽章
function renderCreditBadge(user) {
  const credit = getCreditLevel(user.creditScore || 0);
  const avg = Store.getAvgRating(user.id);
  return `<span class="credit-badge" style="background:${credit.color}">${credit.label}</span>
    <span class="credit-stars">${'★'.repeat(Math.round(avg))}${'☆'.repeat(5 - Math.round(avg))} ${avg.toFixed(1)}</span>`;
}

// ========== 首页 ==========
function renderHome(params) {
  const { query } = params;
  const search = query.search || '';
  const category = query.category || '';
  const sort = query.sort || 'newest';
  const campus = query.campus || '';
  const zone = query.zone || '';

  let products = Store.getProducts().filter(p => p.status === 'active');
  if (search) {
    const kw = search.toLowerCase();
    products = products.filter(p => p.title.toLowerCase().includes(kw) || p.description.toLowerCase().includes(kw));
  }
  if (category) products = products.filter(p => p.category === category);
  if (campus) products = products.filter(p => p.campus === campus);
  if (sort === 'price-low') products.sort((a, b) => a.price - b.price);
  else if (sort === 'price-high') products.sort((a, b) => b.price - a.price);
  else products.sort((a, b) => new Date(b.postDate) - new Date(a.postDate));

  $('#app').innerHTML = `
    ${createHeader()}
    <main class="main-content">
      <div class="home-hero">
        <h1>📦 校园二手集市</h1>
        <p>实名认证 · 校内自提 · 安全交易</p>
        <div class="home-search">
          <input type="text" id="homeSearchInput" placeholder="搜一搜：教材、考研资料、电子产品..." value="${escapeHtml(search)}">
          <button id="homeSearchBtn">搜索</button>
        </div>
      </div>

      <!-- 特色专区 -->
      <div class="container">
        <div class="zone-cards">
          ${SPECIAL_ZONES.map(z => `
            <a href="#/home?zone=${z.id}" class="zone-card ${zone === z.id ? 'zone-active' : ''}">
              <span class="zone-icon">${z.icon}</span>
              <span class="zone-name">${z.name}</span>
              <span class="zone-desc">${z.desc}</span>
            </a>
          `).join('')}
        </div>
      </div>

      <div class="container">
        <!-- 分类 -->
        <div class="category-bar">
          <a href="#/home${buildQuery({ search, category: '', campus, sort })}" class="cat-item ${!category ? 'active' : ''}">全部</a>
          ${CATEGORIES.map(c => `
            <a href="#/home${buildQuery({ search, category: c, campus, sort })}" class="cat-item ${category === c ? 'active' : ''}">${c}</a>
          `).join('')}
        </div>
        <!-- 校区筛选 -->
        <div class="campus-filter-bar">
          <span class="filter-label">📍 校区：</span>
          <a href="#/home${buildQuery({ search, category, campus: '', sort })}" class="filter-chip ${!campus ? 'active' : ''}">全部校区</a>
          ${CAMPUSES.map(c => `
            <a href="#/home${buildQuery({ search, category, campus: c, sort })}" class="filter-chip ${campus === c ? 'active' : ''}">${c}</a>
          `).join('')}
        </div>
        <!-- 排序 -->
        <div class="sort-bar">
          <span>共 ${products.length} 件商品</span>
          <div>
            <button class="sort-btn ${sort === 'newest' ? 'active' : ''}" data-sort="newest">最新发布</button>
            <button class="sort-btn ${sort === 'price-low' ? 'active' : ''}" data-sort="price-low">价格↑</button>
            <button class="sort-btn ${sort === 'price-high' ? 'active' : ''}" data-sort="price-high">价格↓</button>
          </div>
        </div>

        <div class="product-grid">
          ${products.length > 0
            ? products.map(p => createProductCard(p)).join('')
            : '<div class="empty-state"><div class="empty-icon">🔍</div><p>没有找到相关商品</p></div>'
          }
        </div>
      </div>
    </main>
    ${createBottomNav()}
  `;

  bindHomeEvents(search, category, campus, sort);
}

function buildQuery(parts) {
  const qs = [];
  Object.entries(parts).forEach(([k, v]) => { if (v) qs.push(`${k}=${encodeURIComponent(v)}`); });
  return qs.length ? '?' + qs.join('&') : '';
}

function bindHomeEvents(search, category, campus, sort) {
  $('#homeSearchBtn').addEventListener('click', () => {
    const val = $('#homeSearchInput').value.trim();
    router.navigate('/home' + buildQuery({ search: val, category, campus, sort }));
  });
  $('#homeSearchInput').addEventListener('keydown', e => { if (e.key === 'Enter') $('#homeSearchBtn').click(); });
  $('#globalSearchBtn').addEventListener('click', () => {
    const val = $('#globalSearchInput').value.trim();
    router.navigate('/home' + buildQuery({ search: val, category, campus, sort }));
  });
  $('#globalSearchInput').addEventListener('keydown', e => { if (e.key === 'Enter') $('#globalSearchBtn').click(); });
  $$('.sort-btn').forEach(b => b.addEventListener('click', () => {
    router.navigate('/home' + buildQuery({ search, category, campus, sort: b.dataset.sort }));
  }));
  initHeaderDropdown();
}

// ========== 商品详情 ==========
function renderDetail(params) {
  const product = Store.getProduct(params.id);
  if (!product) { router.navigate('/home'); return; }
  const seller = Store.getUser(product.sellerId);
  const user = Store.getCurrentUser();
  const isFav = user ? Store.isFavorite(user.id, product.id) : false;
  const avgRating = Store.getAvgRating(product.sellerId);
  const ratingCount = Store.getUserRatings(product.sellerId).length;

  $('#app').innerHTML = `
    ${createHeader()}
    <main class="main-content">
      <div class="container">
        <div class="detail-page">
          <div class="detail-gallery">
            <img src="${getProductImage(product, '600/450')}" alt="${escapeHtml(product.title)}" class="detail-main-img">
          </div>
          <div class="detail-info">
            <h1 class="detail-title">${escapeHtml(product.title)}</h1>
            <div class="detail-price">${formatPrice(product.price)}
              ${product.originalPrice > product.price ? `<span class="price-original">${formatPrice(product.originalPrice)}</span>` : ''}
            </div>
            <div class="detail-tags">
              <span class="tag">${CONDITION_MAP[product.condition]}</span>
              <span class="tag">${escapeHtml(product.category)}</span>
              <span class="tag">📍 ${escapeHtml(product.campus)}</span>
              <span class="tag">🏷️ ${escapeHtml(product.pickupSpot || '校内自提')}</span>
            </div>
            <div class="detail-meta">
              <div class="seller-info">
                <span class="seller-avatar">${(seller ? seller.username : 'U')[0].toUpperCase()}</span>
                <div>
                  <div class="seller-name">
                    ${seller ? escapeHtml(seller.username) : '未知用户'}
                    ${seller ? renderCreditBadge(seller) : ''}
                  </div>
                  <div class="seller-date">${seller ? seller.campus + ' · ' + seller.joinDate + ' 加入' : ''} | ${ratingCount}条评价</div>
                </div>
              </div>
              <div>👁 ${product.views} · ${formatDate(product.postDate)}</div>
            </div>
            <div class="detail-desc">
              <h3>📝 商品描述</h3>
              <p>${escapeHtml(product.description)}</p>
            </div>
            <div class="detail-pickup">
              <h3>📍 自提信息</h3>
              <p>${escapeHtml(product.campus)} — ${escapeHtml(product.pickupSpot || '校内自提')}</p>
            </div>
            <div class="detail-actions">
              <button class="btn btn-fav ${isFav ? 'fav-active' : ''}" id="btnFav">
                ${isFav ? '❤️ 已收藏' : '🤍 收藏'}
              </button>
              <button class="btn btn-primary" id="btnAddCart">加入购物车</button>
              <button class="btn btn-outline" id="btnContact">💬 联系卖家</button>
            </div>
          </div>
        </div>
      </div>
    </main>
    ${createBottomNav()}
  `;

  $('#btnFav').addEventListener('click', () => {
    if (!Store.getCurrentUser()) { showToast('请先登录', 'error'); return; }
    const favd = Store.toggleFavorite(user.id, product.id);
    const btn = $('#btnFav');
    btn.textContent = favd ? '❤️ 已收藏' : '🤍 收藏';
    btn.classList.toggle('fav-active', favd);
    showToast(favd ? '已收藏' : '已取消收藏');
  });
  $('#btnAddCart').addEventListener('click', () => {
    if (!Store.getCurrentUser()) { showToast('请先登录', 'error'); return; }
    Store.addToCart(user.id, product.id);
    showToast('已加入购物车');
  });
  $('#btnContact').addEventListener('click', () => {
    if (!Store.getCurrentUser()) { showToast('请先登录', 'error'); return; }
    router.navigate('/chat/' + product.sellerId);
  });
  initHeaderDropdown();
}

// ========== 发布商品 ==========
function renderPublish() {
  if (!Store.getCurrentUser()) { router.navigate('/login'); return; }
  const user = Store.getCurrentUser();
  const defaultCampus = user.campus || CAMPUSES[0];
  const spots = PICKUP_SPOTS[defaultCampus] || PICKUP_SPOTS[CAMPUSES[0]];

  $('#app').innerHTML = `
    ${createHeader()}
    <main class="main-content">
      <div class="container">
        <div class="form-page">
          <h2>📦 发布商品</h2>
          <form id="publishForm" class="publish-form">
            <div class="form-group">
              <label>商品标题 <span class="required">*</span></label>
              <input type="text" id="pubTitle" required placeholder="例如：高等数学第七版 9成新" maxlength="100">
            </div>
            <div class="form-group">
              <label>分类 <span class="required">*</span></label>
              <select id="pubCategory" required>
                <option value="">请选择分类</option>
                ${CATEGORIES.map(c => `<option value="${c}">${c}</option>`).join('')}
              </select>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>售价 <span class="required">*</span></label>
                <input type="number" id="pubPrice" required placeholder="0.00" min="0" step="0.01">
              </div>
              <div class="form-group">
                <label>原价</label>
                <input type="number" id="pubOrigPrice" placeholder="选填" min="0" step="0.01">
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>成色 <span class="required">*</span></label>
                <select id="pubCondition" required>
                  <option value="">请选择</option>
                  <option value="new">全新未拆</option>
                  <option value="likeNew">几乎全新</option>
                  <option value="good">使用良好</option>
                  <option value="normal">正常使用</option>
                </select>
              </div>
              <div class="form-group">
                <label>校区 <span class="required">*</span></label>
                <select id="pubCampus" required>
                  <option value="">请选择校区</option>
                  ${CAMPUSES.map(c => `<option value="${c}" ${c === defaultCampus ? 'selected' : ''}>${c}</option>`).join('')}
                </select>
              </div>
            </div>
            <div class="form-group">
              <label>自提地点 <span class="required">*</span></label>
              <select id="pubPickupSpot" required>
                <option value="">请选择自提点</option>
                ${spots.map(s => `<option value="${s}">${s}</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label>商品描述 <span class="required">*</span></label>
              <textarea id="pubDesc" required placeholder="详细描述商品的使用情况、新旧程度、购买时间、配件等..." rows="6" maxlength="2000"></textarea>
            </div>
            <div class="form-group">
              <label>商品图片</label>
              <div class="upload-area" id="uploadArea">
                <p>📷 点击上传图片（演示模式，自动匹配实物图）</p>
                <small>支持 JPG/PNG，最多9张</small>
              </div>
            </div>
            <button type="submit" class="btn btn-primary btn-block">发布商品</button>
          </form>
        </div>
      </div>
    </main>
    ${createBottomNav()}
  `;

  $('#uploadArea').addEventListener('click', () => showToast('演示模式：发布时自动生成实物配图', 'info'));

  // 校区切换时更新自提点
  $('#pubCampus').addEventListener('change', function() {
    const newSpots = PICKUP_SPOTS[this.value] || [];
    const picker = $('#pubPickupSpot');
    picker.innerHTML = '<option value="">请选择自提点</option>' + newSpots.map(s => `<option value="${s}">${s}</option>`).join('');
  });

  $('#publishForm').addEventListener('submit', e => {
    e.preventDefault();
    const category = $('#pubCategory').value;
    const title = $('#pubTitle').value.trim();
    const product = {
      id: generateId(),
      title,
      category,
      price: parseFloat($('#pubPrice').value),
      originalPrice: parseFloat($('#pubOrigPrice').value) || parseFloat($('#pubPrice').value),
      condition: $('#pubCondition').value,
      campus: $('#pubCampus').value,
      pickupSpot: $('#pubPickupSpot').value,
      description: $('#pubDesc').value.trim(),
      imageSeed: title.slice(0, 8).replace(/\s/g, ''),
      images: [],
      sellerId: Store.getCurrentUser().id,
      postDate: new Date().toISOString(),
      status: 'active',
      views: 0,
    };
    Store.addProduct(product);
    showToast('发布成功！');
    router.navigate('/detail/' + product.id);
  });
  initHeaderDropdown();
}

// ========== 登录注册（含学号认证） ==========
function renderLogin() {
  if (Store.getCurrentUser()) { router.navigate('/home'); return; }
  $('#app').innerHTML = `
    ${createHeader()}
    <main class="main-content">
      <div class="container">
        <div class="auth-page">
          <div class="auth-card">
            <div class="auth-tabs">
              <button class="auth-tab active" id="tabLogin">登录</button>
              <button class="auth-tab" id="tabReg">新生注册</button>
            </div>
            <form id="loginForm" class="auth-form">
              <div class="form-group">
                <label>用户名</label>
                <input type="text" id="loginUser" required placeholder="请输入用户名">
              </div>
              <div class="form-group">
                <label>密码</label>
                <input type="password" id="loginPass" required placeholder="请输入密码">
              </div>
              <div id="regFields" style="display:none">
                <div class="form-group">
                  <label>真实姓名</label>
                  <input type="text" id="regRealName" placeholder="请输入真实姓名">
                </div>
                <div class="form-group">
                  <label>学号 / 工号 <span class="required">*</span></label>
                  <input type="text" id="regStudentId" placeholder="例如：20230101001">
                </div>
                <div class="form-group">
                  <label>所属校区</label>
                  <select id="regCampus">
                    ${CAMPUSES.map(c => `<option value="${c}">${c}</option>`).join('')}
                  </select>
                </div>
                <div class="form-group">
                  <label>确认密码</label>
                  <input type="password" id="regConfirmPass" placeholder="请再次输入密码">
                </div>
              </div>
              <button type="submit" class="btn btn-primary btn-block" id="authSubmit">登录</button>
            </form>
            <div class="auth-footer">
              <p>🔒 学号实名认证，安全交易有保障</p>
            </div>
          </div>
        </div>
      </div>
    </main>
  `;

  let mode = 'login';

  $('#tabLogin').addEventListener('click', () => {
    mode = 'login';
    $('#tabLogin').classList.add('active');
    $('#tabReg').classList.remove('active');
    $('#regFields').style.display = 'none';
    $('#authSubmit').textContent = '登录';
  });
  $('#tabReg').addEventListener('click', () => {
    mode = 'register';
    $('#tabReg').classList.add('active');
    $('#tabLogin').classList.remove('active');
    $('#regFields').style.display = 'block';
    $('#authSubmit').textContent = '注册';
  });

  $('#loginForm').addEventListener('submit', e => {
    e.preventDefault();
    const username = $('#loginUser').value.trim();
    const password = $('#loginPass').value.trim();

    if (mode === 'login') {
      const user = Store.findByUsername(username);
      if (!user) { showToast('用户不存在，请先注册', 'error'); return; }
      Store.setCurrentUser(user);
      showToast('登录成功！欢迎回来，' + user.username);
      if (user.role === 'admin') router.navigate('/admin');
      else router.navigate('/home');
    } else {
      const realName = $('#regRealName').value.trim();
      const studentId = $('#regStudentId').value.trim();
      if (!realName || !studentId) { showToast('请填写真实姓名和学号', 'error'); return; }
      if (password !== $('#regConfirmPass').value.trim()) { showToast('两次密码不一致', 'error'); return; }
      if (Store.findByUsername(username)) { showToast('用户名已存在', 'error'); return; }
      if (Store.getUserByStudentId(studentId)) { showToast('该学号已被注册', 'error'); return; }
      const newUser = {
        id: generateId(),
        username,
        studentId,
        realName,
        role: 'student',
        campus: $('#regCampus').value,
        avatar: '',
        phone: '',
        joinDate: new Date().toISOString().split('T')[0],
        bio: '',
        creditScore: 0,
      };
      Store.addUser(newUser);
      Store.setCurrentUser(newUser);
      showToast('注册成功！欢迎加入校园二手集市，' + username);
      router.navigate('/home');
    }
  });
  initHeaderDropdown();
}

// ========== 个人中心 ==========
function renderProfile() {
  const user = Store.getCurrentUser();
  if (!user) { router.navigate('/login'); return; }
  const userProducts = Store.getProducts().filter(p => p.sellerId === user.id);
  const userOrders = Store.getOrders().filter(o => o.buyerId === user.id || o.sellerId === user.id);
  const avgRating = Store.getAvgRating(user.id);
  const ratingCount = Store.getUserRatings(user.id).length;
  const credit = getCreditLevel(user.creditScore || 0);

  $('#app').innerHTML = `
    ${createHeader()}
    <main class="main-content">
      <div class="container">
        <div class="profile-page">
          <div class="profile-header">
            <div class="profile-avatar">${(user.username || 'U')[0].toUpperCase()}</div>
            <div class="profile-info">
              <h2>${escapeHtml(user.realName || user.username)}
                <span class="credit-badge" style="background:${credit.color}">${credit.label}</span>
              </h2>
              <p>${escapeHtml(user.bio || '这个人很懒，什么都没写...')}</p>
              <p class="text-muted">
                🎓 ${escapeHtml(user.studentId || '')}  |  📍 ${escapeHtml(user.campus || '')}  |  ${user.joinDate} 加入
              </p>
              <p class="text-muted">
                ⭐ ${'★'.repeat(Math.round(avgRating))}${'☆'.repeat(5 - Math.round(avgRating))} ${avgRating.toFixed(1)}（${ratingCount}条评价） | 信用分：${user.creditScore || 0}
              </p>
            </div>
          </div>
          <div class="profile-stats">
            <div class="stat-item"><strong>${userProducts.length}</strong><span>在售</span></div>
            <div class="stat-item"><strong>${userOrders.length}</strong><span>订单</span></div>
            <div class="stat-item"><strong>${Store.getFavorites().filter(f => f.userId === user.id).length}</strong><span>收藏</span></div>
            <div class="stat-item"><strong>${credit.label}</strong><span>信用等级</span></div>
          </div>
          <div class="profile-links">
            <a href="#/orders" class="profile-link">📦 我的订单</a>
            <a href="#/cart" class="profile-link">🛒 购物车</a>
            <a href="#/favorites" class="profile-link">❤️ 收藏夹</a>
            <a href="#/chat" class="profile-link">💬 消息</a>
          </div>
          ${userProducts.length > 0 ? `
            <div class="profile-section">
              <h3>我发布的商品</h3>
              <div class="product-grid">
                ${userProducts.map(p => createProductCard(p)).join('')}
              </div>
            </div>
          ` : ''}
        </div>
      </div>
    </main>
    ${createBottomNav()}
  `;
  initHeaderDropdown();
}

// ========== 购物车 ==========
function renderCart() {
  const user = Store.getCurrentUser();
  if (!user) { router.navigate('/login'); return; }
  const cartItems = Store.getCart(user.id);
  const products = Store.getProducts();
  const items = cartItems.map(ci => ({ ...ci, product: products.find(p => p.id === ci.productId) })).filter(i => i.product);
  const total = items.reduce((sum, i) => sum + i.product.price * i.quantity, 0);

  $('#app').innerHTML = `
    ${createHeader()}
    <main class="main-content">
      <div class="container">
        <div class="cart-page">
          <h2>🛒 购物车</h2>
          ${items.length === 0 ? '<div class="empty-state"><div class="empty-icon">🛒</div><p>购物车是空的</p><a href="#/home" class="btn btn-primary">去逛逛</a></div>' : `
            <div class="cart-list">
              ${items.map(item => `
                <div class="cart-item" data-product-id="${item.product.id}">
                  <img src="${getProductImage(item.product, '120/120')}" alt="" class="cart-item-img">
                  <div class="cart-item-info">
                    <h4>${escapeHtml(item.product.title)}</h4>
                    <div class="cart-item-price">${formatPrice(item.product.price)}</div>
                    <div class="text-muted">📍 ${escapeHtml(item.product.campus)} · ${escapeHtml(item.product.pickupSpot || '')}</div>
                  </div>
                  <div class="cart-item-qty">
                    <button class="qty-btn qty-minus">-</button>
                    <span class="qty-val">${item.quantity}</span>
                    <button class="qty-btn qty-plus">+</button>
                  </div>
                  <button class="cart-item-del">删除</button>
                </div>
              `).join('')}
            </div>
            <div class="cart-footer">
              <div class="cart-total">合计：<strong>${formatPrice(total)}</strong></div>
              <div>
                <button class="btn btn-outline" id="btnClearCart">清空</button>
                <button class="btn btn-primary" id="btnCheckout">下单（校内自提）</button>
              </div>
            </div>
          `}
        </div>
      </div>
    </main>
    ${createBottomNav()}
  `;

  bindCartEvents(items, user);
  initHeaderDropdown();
}

function bindCartEvents(items, user) {
  $$('.qty-minus').forEach(b => b.addEventListener('click', () => {
    const pid = b.closest('.cart-item').dataset.productId;
    const item = items.find(i => i.product.id === pid);
    if (item && item.quantity > 1) { Store.updateCartQuantity(user.id, pid, item.quantity - 1); renderCart(); }
  }));
  $$('.qty-plus').forEach(b => b.addEventListener('click', () => {
    const pid = b.closest('.cart-item').dataset.productId;
    const item = items.find(i => i.product.id === pid);
    Store.updateCartQuantity(user.id, pid, (item ? item.quantity : 0) + 1);
    renderCart();
  }));
  $$('.cart-item-del').forEach(b => b.addEventListener('click', () => {
    const pid = b.closest('.cart-item').dataset.productId;
    Store.removeFromCart(user.id, pid);
    showToast('已删除');
    renderCart();
  }));
  const btnClear = $('#btnClearCart');
  if (btnClear) btnClear.addEventListener('click', () => { Store.clearCart(user.id); renderCart(); showToast('已清空购物车'); });
  const btnCk = $('#btnCheckout');
  if (btnCk) btnCk.addEventListener('click', () => {
    if (items.length === 0) return;
    items.forEach(i => {
      Store.addOrder({
        id: generateId(),
        productId: i.product.id,
        buyerId: user.id,
        sellerId: i.product.sellerId,
        status: 'pending',
        createTime: new Date().toISOString(),
        price: i.product.price * i.quantity,
      });
    });
    Store.clearCart(user.id);
    showToast('下单成功！请按约定时间校内自提');
    router.navigate('/orders');
  });
}

// ========== 收藏夹 ==========
function renderFavorites() {
  const user = Store.getCurrentUser();
  if (!user) { router.navigate('/login'); return; }
  const favs = Store.getFavorites().filter(f => f.userId === user.id);
  const products = Store.getProducts();
  const items = favs.map(f => products.find(p => p.id === f.productId)).filter(Boolean);

  $('#app').innerHTML = `
    ${createHeader()}
    <main class="main-content">
      <div class="container">
        <h2>❤️ 收藏夹</h2>
        ${items.length === 0 ? '<div class="empty-state"><div class="empty-icon">❤️</div><p>还没有收藏任何商品</p><a href="#/home" class="btn btn-primary">去逛逛</a></div>' : ''}
        <div class="product-grid">
          ${items.map(p => createProductCard(p)).join('')}
        </div>
      </div>
    </main>
    ${createBottomNav()}
  `;
  initHeaderDropdown();
}

// ========== 消息 ==========
function renderChatList() {
  const user = Store.getCurrentUser();
  if (!user) { router.navigate('/login'); return; }
  const messages = Store.getMessages();
  const talkTo = new Set();
  messages.forEach(m => {
    if (m.fromUserId === user.id) talkTo.add(m.toUserId);
    if (m.toUserId === user.id) talkTo.add(m.fromUserId);
  });
  const users = Store.getUsers();
  const conversations = [...talkTo].map(uid => {
    const msgs = messages.filter(m =>
      (m.fromUserId === user.id && m.toUserId === uid) ||
      (m.toUserId === user.id && m.fromUserId === uid)
    ).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    return { userId: uid, user: users.find(u => u.id === uid), lastMsg: msgs[0] };
  }).sort((a, b) => new Date(b.lastMsg.timestamp) - new Date(a.lastMsg.timestamp));

  $('#app').innerHTML = `
    ${createHeader()}
    <main class="main-content">
      <div class="container">
        <h2>💬 消息</h2>
        ${conversations.length === 0 ? '<div class="empty-state"><div class="empty-icon">💬</div><p>暂无消息</p></div>' : `
          <div class="chat-list">
            ${conversations.map(c => `
              <a href="#/chat/${c.userId}" class="chat-item">
                <span class="chat-avatar">${(c.user ? c.user.username : 'U')[0].toUpperCase()}</span>
                <div class="chat-item-info">
                  <div class="chat-item-name">${c.user ? escapeHtml(c.user.username) : '未知用户'}</div>
                  <div class="chat-item-msg">${escapeHtml(c.lastMsg.content.slice(0, 40))}</div>
                </div>
                <div class="chat-item-time">${formatDate(c.lastMsg.timestamp)}</div>
              </a>
            `).join('')}
          </div>
        `}
      </div>
    </main>
    ${createBottomNav()}
  `;
  initHeaderDropdown();
}

function renderChatDetail(params) {
  const user = Store.getCurrentUser();
  if (!user) { router.navigate('/login'); return; }
  const targetUser = Store.getUser(params.id);
  if (!targetUser) { router.navigate('/chat'); return; }
  const messages = Store.getMessages().filter(m =>
    (m.fromUserId === user.id && m.toUserId === targetUser.id) ||
    (m.fromUserId === targetUser.id && m.toUserId === user.id)
  ).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

  $('#app').innerHTML = `
    ${createHeader()}
    <main class="main-content">
      <div class="container">
        <div class="chat-detail">
          <div class="chat-header-bar">
            <a href="#/chat" class="chat-back">← 返回</a>
            <span class="chat-avatar">${(targetUser.username || 'U')[0].toUpperCase()}</span>
            <div>
              <h3>${escapeHtml(targetUser.username)}</h3>
              <span class="text-muted">${escapeHtml(targetUser.campus || '')} · ${renderCreditBadge(targetUser)}</span>
            </div>
          </div>
          <div class="chat-messages" id="chatMessages">
            ${messages.length === 0 ? '<div class="empty-state"><p>暂无消息，发送第一条消息吧</p></div>' : ''}
            ${messages.map(m => `
              <div class="msg-bubble ${m.fromUserId === user.id ? 'msg-mine' : 'msg-their'}">
                <div class="msg-text">${escapeHtml(m.content)}</div>
                <div class="msg-time">${formatDate(m.timestamp)}</div>
              </div>
            `).join('')}
          </div>
          <div class="chat-input-bar">
            <input type="text" id="chatInput" placeholder="输入消息...">
            <button class="btn btn-primary" id="chatSend">发送</button>
          </div>
        </div>
      </div>
    </main>
  `;

  const sendMsg = () => {
    const content = $('#chatInput').value.trim();
    if (!content) return;
    Store.addMessage({
      id: generateId(),
      fromUserId: user.id,
      toUserId: targetUser.id,
      productId: '',
      content,
      timestamp: new Date().toISOString(),
    });
    renderChatDetail(params);
  };
  $('#chatSend').addEventListener('click', sendMsg);
  $('#chatInput').addEventListener('keydown', e => { if (e.key === 'Enter') sendMsg(); });
  const msgContainer = $('#chatMessages');
  if (msgContainer) msgContainer.scrollTop = msgContainer.scrollHeight;
  initHeaderDropdown();
}

// ========== 订单管理 ==========
function renderOrders() {
  const user = Store.getCurrentUser();
  if (!user) { router.navigate('/login'); return; }
  const allOrders = Store.getOrders().filter(o => o.buyerId === user.id || o.sellerId === user.id);
  const products = Store.getProducts();
  const users = Store.getUsers();

  const statusLabels = { all: '全部', pending: '待付款', shipped: '已发货', completed: '已完成', cancelled: '已取消' };
  const hash = location.hash.slice(1);
  const match = hash.match(/status=(\w+)/);
  const activeTab = match ? match[1] : 'all';
  let filtered = activeTab === 'all' ? allOrders : allOrders.filter(o => o.status === activeTab);

  $('#app').innerHTML = `
    ${createHeader()}
    <main class="main-content">
      <div class="container">
        <h2>📦 我的订单</h2>
        <div class="order-tabs">
          ${Object.entries(statusLabels).map(([s, label]) => `
            <a href="#/orders${s === 'all' ? '' : '?status=' + s}" class="order-tab ${activeTab === s ? 'active' : ''}">${label}</a>
          `).join('')}
        </div>
        ${filtered.length === 0 ? '<div class="empty-state"><div class="empty-icon">📦</div><p>暂无订单</p></div>' : `
          <div class="order-list">
            ${filtered.sort((a, b) => new Date(b.createTime) - new Date(a.createTime)).map(o => {
              const p = products.find(x => x.id === o.productId);
              const s = users.find(x => x.id === o.sellerId);
              const b = users.find(x => x.id === o.buyerId);
              const isBuyer = o.buyerId === user.id;
              return `
                <div class="order-card">
                  <div class="order-header">
                    <span class="order-status status-${o.status}">${statusLabels[o.status]}</span>
                    <span class="text-muted">${formatDate(o.createTime)}</span>
                  </div>
                  <div class="order-body">
                    <img src="${getProductImage(p || { id: 'order' }, '120/120')}" alt="" class="order-img">
                    <div class="order-info">
                      <h4>${p ? escapeHtml(p.title) : '商品已删除'}</h4>
                      <div>卖家：${s ? escapeHtml(s.username) : '未知'} | 买家：${b ? escapeHtml(b.username) : '未知'}</div>
                      <div>📍 ${p ? escapeHtml(p.campus + ' · ' + (p.pickupSpot || '校内自提')) : ''}</div>
                      <div class="order-price">${formatPrice(o.price)}</div>
                    </div>
                  </div>
                  <div class="order-actions">
                    ${o.status === 'pending' && isBuyer ? `<button class="btn btn-sm btn-primary pay-btn" data-oid="${o.id}">立即付款</button>` : ''}
                    ${o.status === 'shipped' && isBuyer ? `<button class="btn btn-sm btn-primary confirm-btn" data-oid="${o.id}">确认收货</button>` : ''}
                    ${o.status === 'pending' ? `<button class="btn btn-sm btn-outline cancel-btn" data-oid="${o.id}">取消订单</button>` : ''}
                    ${o.status === 'completed' ? `<button class="btn btn-sm btn-outline rate-btn" data-oid="${o.id}" data-target="${isBuyer ? o.sellerId : o.buyerId}">⭐ 评价</button>` : ''}
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        `}
      </div>
    </main>
    ${createBottomNav()}
  `;

  bindOrderEvents(user);
  initHeaderDropdown();
}

function bindOrderEvents(user) {
  $$('.pay-btn').forEach(b => b.addEventListener('click', () => {
    Store.updateOrder(b.dataset.oid, { status: 'shipped' });
    showToast('付款成功！请按时校内自提');
    renderOrders();
  }));
  $$('.confirm-btn').forEach(b => b.addEventListener('click', () => {
    const order = Store.getOrders().find(o => o.id === b.dataset.oid);
    Store.updateOrder(b.dataset.oid, { status: 'completed' });
    // 完成交易双方各加信用分
    if (order) {
      Store.updateUser(order.buyerId, { creditScore: (Store.getUser(order.buyerId).creditScore || 0) + 2 });
      Store.updateUser(order.sellerId, { creditScore: (Store.getUser(order.sellerId).creditScore || 0) + 2 });
    }
    showToast('已确认收货！双方信用+2');
    renderOrders();
  }));
  $$('.cancel-btn').forEach(b => b.addEventListener('click', () => {
    Store.updateOrder(b.dataset.oid, { status: 'cancelled' });
    showToast('订单已取消');
    renderOrders();
  }));
  $$('.rate-btn').forEach(b => b.addEventListener('click', () => {
    showRatingModal(b.dataset.oid, b.dataset.target);
  }));
}

function showRatingModal(orderId, targetUserId) {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal-content rating-modal">
      <h3>⭐ 评价交易</h3>
      <div class="star-rating" id="starRating">
        ${[1,2,3,4,5].map(n => `<span class="star" data-score="${n}">☆</span>`).join('')}
      </div>
      <textarea id="ratingComment" placeholder="说说这次交易的感受吧..." rows="3"></textarea>
      <div class="modal-actions">
        <button class="btn btn-outline" id="ratingCancel">取消</button>
        <button class="btn btn-primary" id="ratingSubmit">提交评价</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  let selectedScore = 0;
  $$('.star', modal).forEach(s => {
    s.addEventListener('click', () => {
      selectedScore = parseInt(s.dataset.score);
      $$('.star', modal).forEach(x => x.textContent = parseInt(x.dataset.score) <= selectedScore ? '★' : '☆');
    });
    s.addEventListener('mouseenter', () => {
      $$('.star', modal).forEach(x => x.textContent = parseInt(x.dataset.score) <= parseInt(s.dataset.score) ? '★' : '☆');
    });
  });

  modal.addEventListener('mouseleave', () => {
    $$('.star', modal).forEach(x => x.textContent = parseInt(x.dataset.score) <= selectedScore ? '★' : '☆');
  });

  $('#ratingCancel', modal).addEventListener('click', () => modal.remove());
  $('#ratingSubmit', modal).addEventListener('click', () => {
    if (selectedScore === 0) { showToast('请选择评分', 'error'); return; }
    const comment = $('#ratingComment', modal).value.trim();
    Store.addRating({
      id: generateId(),
      orderId,
      fromUserId: Store.getCurrentUser().id,
      toUserId: targetUserId,
      score: selectedScore,
      comment,
      timestamp: new Date().toISOString(),
    });
    // 更新信用分
    const target = Store.getUser(targetUserId);
    Store.updateUser(targetUserId, { creditScore: (target.creditScore || 0) + selectedScore });
    modal.remove();
    showToast('评价成功！');
    renderOrders();
  });
}

// ========== 管理员后台 ==========
function renderAdmin() {
  if (!Store.isAdmin()) { router.navigate('/home'); return; }
  const users = Store.getUsers();
  const products = Store.getProducts();
  const orders = Store.getOrders();
  const ratings = Store.getRatings();
  const pendingProducts = products.filter(p => p.status === 'pending');

  const tab = location.hash.match(/adminTab=(\w+)/)?.[1] || 'products';

  $('#app').innerHTML = `
    ${createHeader()}
    <main class="main-content">
      <div class="container">
        <h2>🛡️ 管理后台</h2>
        <div class="admin-tabs">
          <a href="#/admin?adminTab=products" class="admin-tab ${tab === 'products' ? 'active' : ''}">商品管理</a>
          <a href="#/admin?adminTab=users" class="admin-tab ${tab === 'users' ? 'active' : ''}">用户管理</a>
          <a href="#/admin?adminTab=orders" class="admin-tab ${tab === 'orders' ? 'active' : ''}">订单管理</a>
          <a href="#/admin?adminTab=stats" class="admin-tab ${tab === 'stats' ? 'active' : ''}">数据统计</a>
        </div>

        ${tab === 'products' ? `
          <div class="admin-section">
            <h3>全部商品（${products.length}）</h3>
            ${pendingProducts.length > 0 ? `<p class="text-muted">待审核：${pendingProducts.length} 件</p>` : ''}
            <table class="admin-table">
              <thead><tr><th>商品</th><th>卖家</th><th>价格</th><th>状态</th><th>日期</th><th>操作</th></tr></thead>
              <tbody>
                ${products.map(p => {
                  const s = users.find(u => u.id === p.sellerId);
                  return `
                    <tr>
                      <td>${escapeHtml(p.title.slice(0, 30))}</td>
                      <td>${s ? escapeHtml(s.username) : '?'}</td>
                      <td>${formatPrice(p.price)}</td>
                      <td><span class="status-tag status-${p.status}">${p.status}</span></td>
                      <td>${formatDate(p.postDate)}</td>
                      <td>
                        <button class="btn btn-sm btn-outline admin-delete-btn" data-pid="${p.id}">删除</button>
                        ${p.status === 'pending' ? `<button class="btn btn-sm btn-primary admin-approve-btn" data-pid="${p.id}">通过</button>` : ''}
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        ` : ''}

        ${tab === 'users' ? `
          <div class="admin-section">
            <h3>用户列表（${users.length}）</h3>
            <table class="admin-table">
              <thead><tr><th>用户名</th><th>学号</th><th>校区</th><th>信用分</th><th>注册日期</th></tr></thead>
              <tbody>
                ${users.map(u => `
                  <tr>
                    <td>${escapeHtml(u.username)}${u.role === 'admin' ? ' 👑' : ''}</td>
                    <td>${escapeHtml(u.studentId || '')}</td>
                    <td>${escapeHtml(u.campus || '')}</td>
                    <td>${u.creditScore || 0}</td>
                    <td>${u.joinDate}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        ` : ''}

        ${tab === 'orders' ? `
          <div class="admin-section">
            <h3>订单列表（${orders.length}）</h3>
            <table class="admin-table">
              <thead><tr><th>订单ID</th><th>买家</th><th>卖家</th><th>金额</th><th>状态</th><th>时间</th></tr></thead>
              <tbody>
                ${orders.map(o => {
                  const b = users.find(u => u.id === o.buyerId);
                  const s = users.find(u => u.id === o.sellerId);
                  return `
                    <tr>
                      <td>${o.id}</td>
                      <td>${b ? escapeHtml(b.username) : '?'}</td>
                      <td>${s ? escapeHtml(s.username) : '?'}</td>
                      <td>${formatPrice(o.price)}</td>
                      <td><span class="status-tag status-${o.status}">${o.status}</span></td>
                      <td>${formatDate(o.createTime)}</td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        ` : ''}

        ${tab === 'stats' ? `
          <div class="admin-section">
            <h3>数据统计</h3>
            <div class="stats-grid">
              <div class="stat-card"><strong>${users.length}</strong><span>注册用户</span></div>
              <div class="stat-card"><strong>${products.length}</strong><span>商品总数</span></div>
              <div class="stat-card"><strong>${orders.length}</strong><span>订单总数</span></div>
              <div class="stat-card"><strong>${ratings.length}</strong><span>评价数量</span></div>
              <div class="stat-card"><strong>${formatPrice(orders.reduce((s, o) => s + o.price, 0))}</strong><span>交易总额</span></div>
            </div>
          </div>
        ` : ''}
      </div>
    </main>
  `;

  $$('.admin-delete-btn').forEach(b => b.addEventListener('click', () => {
    Store.deleteProduct(b.dataset.pid);
    showToast('已删除商品');
    renderAdmin();
  }));
  $$('.admin-approve-btn').forEach(b => b.addEventListener('click', () => {
    Store.auditProduct(b.dataset.pid, 'active');
    showToast('已通过审核');
    renderAdmin();
  }));
  initHeaderDropdown();
}

// ========== 辅助 ==========

function initHeaderDropdown() {
  const dd = $('#userDropdown');
  if (!dd) return;
  dd.addEventListener('click', e => {
    e.stopPropagation();
    $('#dropdownMenu').classList.toggle('show');
  });
  document.addEventListener('click', () => {
    const menu = $('#dropdownMenu');
    if (menu) menu.classList.remove('show');
  });
  const logout = $('#logoutBtn');
  if (logout) logout.addEventListener('click', e => {
    e.preventDefault();
    Store.logout();
    router.navigate('/home');
  });
}

// ========== 路由注册 ==========

router
  .add('/home', renderHome)
  .add('/detail/:id', renderDetail)
  .add('/publish', renderPublish)
  .add('/login', renderLogin)
  .add('/profile', renderProfile)
  .add('/cart', renderCart)
  .add('/favorites', renderFavorites)
  .add('/chat', renderChatList)
  .add('/chat/:id', renderChatDetail)
  .add('/orders', renderOrders)
  .add('/admin', renderAdmin);

router.start();
