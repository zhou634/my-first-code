// Hash 路由系统

class Router {
  constructor() {
    this.routes = [];
    this.params = {};
    window.addEventListener('hashchange', () => this._resolve());
  }

  add(pattern, handler) {
    this.routes.push({ pattern, handler });
    return this;
  }

  navigate(hash) {
    location.hash = hash;
  }

  _resolve() {
    const hash = location.hash.slice(1) || '/home';
    const [path, queryStr] = hash.split('?');
    const query = {};
    if (queryStr) {
      queryStr.split('&').forEach(p => {
        const [k, v] = p.split('=');
        query[decodeURIComponent(k)] = decodeURIComponent(v || '');
      });
    }

    for (const route of this.routes) {
      const match = this._matchRoute(route.pattern, path);
      if (match) {
        this.params = { ...match, query };
        route.handler(this.params);
        return;
      }
    }

    // 404 fallback
    document.getElementById('app').innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">404</div>
        <p>页面未找到</p>
        <a href="#/home" class="btn btn-primary">返回首页</a>
      </div>
    `;
  }

  _matchRoute(pattern, path) {
    const patternParts = pattern.split('/');
    const pathParts = path.split('/');

    if (patternParts.length !== pathParts.length) return null;

    const params = {};
    for (let i = 0; i < patternParts.length; i++) {
      if (patternParts[i].startsWith(':')) {
        params[patternParts[i].slice(1)] = decodeURIComponent(pathParts[i]);
      } else if (patternParts[i] !== pathParts[i]) {
        return null;
      }
    }
    return params;
  }

  start() {
    this._resolve();
  }
}
