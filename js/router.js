// =====================================================================
// router.js — hash-based routing for the SPA.
// Routes:
//   #/                      → Hub
//   #/signals               → Signals workspace
//   #/signals/:id           → Signal detail
//   #/playbooks             → Playbooks index
//   #/playbooks/:themeId    → Playbook detail
//   #/radar                 → Positioning Radar
//   #/methodology           → Methodology
//   #/about                 → About
// =====================================================================

const ROUTES = [];

function defineRoute(pattern, handler) {
  // pattern like "/signals/:id" → regex capture of segments
  const segs = pattern.split('/').filter(Boolean);
  const params = [];
  const re = new RegExp('^/' + segs.map(s => {
    if (s.startsWith(':')) { params.push(s.slice(1)); return '([^/]+)'; }
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }).join('/') + '/?$');
  ROUTES.push({ pattern, re, params, handler });
}

function parseHash() {
  const raw = (window.location.hash || '#/').slice(1);
  const [path, query] = raw.split('?');
  return { path: path || '/', query: query || '' };
}

async function dispatch() {
  const { path, query } = parseHash();
  for (const route of ROUTES) {
    const m = path.match(route.re);
    if (m) {
      const params = {};
      route.params.forEach((p, i) => params[p] = decodeURIComponent(m[i + 1]));
      // wait for data
      await SftSData.load();
      // apply persona/filter overrides from query
      if (query) {
        const u = new URLSearchParams(query);
        if (u.has('persona')) SftSState.persona = u.get('persona');
      }
      const root = document.getElementById('routeRoot');
      root.classList.remove('route-mount');
      // Force reflow
      void root.offsetWidth;
      root.classList.add('route-mount');
      try {
        await route.handler({ params, query, root });
      } catch (e) {
        console.error('Route error:', e);
        root.innerHTML = `<div class="container"><div class="empty-state">
          <h3>Something went off the rails</h3>
          <p>We couldn't render this page. Try refreshing or returning to the hub.</p>
          <a class="btn btn--primary" href="#/">Back to hub</a>
        </div></div>`;
      }
      window.scrollTo(0, 0);
      updateActiveNav(path);
      return;
    }
  }
  // 404
  const root = document.getElementById('routeRoot');
  root.innerHTML = `<div class="container site-section"><div class="empty-state">
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><path d="M9 9h.01M15 9h.01M9 16s1.5-1 3-1 3 1 3 1"/></svg>
    <h3>Route not found</h3>
    <p>That URL doesn't match any known route.</p>
    <a class="btn btn--primary" href="#/">Back to hub</a>
  </div></div>`;
}

function updateActiveNav(path) {
  document.querySelectorAll('.app-nav .nav-link').forEach(a => {
    const h = (a.getAttribute('href') || '').replace('#', '');
    a.classList.toggle('is-active',
      (h === '/' && path === '/') ||
      (h !== '/' && path.startsWith(h)));
  });
}

window.addEventListener('hashchange', dispatch);
window.addEventListener('DOMContentLoaded', () => {
  if (!window.location.hash || window.location.hash === '#') {
    history.replaceState(null, '', '#/');
  }
  dispatch();
});

window.SftSRouter = { defineRoute, dispatch, parseHash };
