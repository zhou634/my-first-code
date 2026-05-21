// 工具函数

function $(selector, parent = document) {
  return parent.querySelector(selector);
}

function $$(selector, parent = document) {
  return parent.querySelectorAll(selector);
}

function formatPrice(price) {
  return '¥' + Number(price).toFixed(2);
}

function formatDate(dateStr) {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now - d;
  if (diff < 60000) return '刚刚';
  if (diff < 3600000) return Math.floor(diff / 60000) + '分钟前';
  if (diff < 86400000) return Math.floor(diff / 3600000) + '小时前';
  if (diff < 604800000) return Math.floor(diff / 86400000) + '天前';
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function getProductImage(product, size = '400/300') {
  if (product.imageSeed) {
    return `https://picsum.photos/seed/${product.imageSeed}/${size}`;
  }
  return `https://picsum.photos/seed/${product.id}/${size}`;
}

function debounce(fn, delay = 300) {
  let timer;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function showToast(msg, type = 'success') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = msg;
  document.body.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('show'));
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 2000);
}

// 校园场景常量
const CATEGORIES = ['教材教辅', '电子数码', '生活用品', '考研考公', '运动健身', '宿舍好物', '服饰美妆', '其他'];

const CONDITION_MAP = { new: '全新未拆', likeNew: '几乎全新', good: '使用良好', normal: '正常使用' };

const CAMPUSES = ['主校区', '东校区', '西校区', '南校区'];

const PICKUP_SPOTS = {
  '主校区': ['图书馆门口', '一食堂', '二食堂', '教学楼A区', '教学楼B区', '宿舍1号楼', '宿舍3号楼'],
  '东校区': ['东门传达室', '东苑食堂', '体育馆', '实验楼'],
  '西校区': ['西门广场', '西苑食堂', '活动中心', '图书馆'],
  '南校区': ['南门', '南苑食堂', '综合楼', '操场'],
};

const SPECIAL_ZONES = [
  { id: 'graduation', name: '毕业季专区', icon: '🎓', desc: '学长学姐好物清仓' },
  { id: 'exam', name: '考研考公', icon: '📚', desc: '资料真题一站搞定' },
  { id: 'dorm', name: '宿舍好物', icon: '🏠', desc: '提升宿舍幸福感' },
  { id: 'digital', name: '电子数码', icon: '💻', desc: '高性价比电子产品' },
];

const CREDIT_LEVELS = [
  { min: 0, label: '新手', color: '#95a5a6' },
  { min: 10, label: '靠谱', color: '#3498db' },
  { min: 30, label: '优秀', color: '#27ae60' },
  { min: 60, label: '金牌', color: '#f39c12' },
];

function getCreditLevel(score) {
  const levels = [...CREDIT_LEVELS].reverse();
  return levels.find(l => score >= l.min) || CREDIT_LEVELS[0];
}
