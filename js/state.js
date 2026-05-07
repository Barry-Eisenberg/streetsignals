// =====================================================================
// state.js — global UI state (persona, theme, URL filter sync).
// Persists to localStorage (enabled in production Netlify deploy).
// =====================================================================

const State = {
  persona: 'all',
  theme: 'dark',
  // signal workspace filters
  filters: {
    theme: null,        // 'tokenized' | 'stablecoins' | 'dlt' | null
    tier: null,         // 'Structural' | 'Material' | 'Context' | null
    category: 'all',    // institution category id
    dateWindow: 30,     // days; 'all' for everything
    country: null,      // country string fragment
    search: '',
    sort: 'recency'     // recency | importance | institution
  },
  _listeners: [],
  _localStorageAvailable: false,
  _storageKey: 'sfts_state',

  // Check if localStorage is available and initialize
  _checkStorage() {
    try {
      const test = '__test__';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      this._localStorageAvailable = true;
    } catch (e) {
      this._localStorageAvailable = false;
    }
  },

  // Load persisted state from localStorage
  _loadFromStorage() {
    if (!this._localStorageAvailable) return;
    try {
      const stored = localStorage.getItem(this._storageKey);
      if (stored) {
        const saved = JSON.parse(stored);
        if (saved.persona) this.persona = saved.persona;
        if (saved.theme) this.theme = saved.theme;
        if (saved.filters) {
          this.filters = { ...this.filters, ...saved.filters };
        }
      }
    } catch (e) {
      console.warn('Failed to load state from localStorage:', e);
    }
  },

  // Save current state to localStorage
  _saveToStorage() {
    if (!this._localStorageAvailable) return;
    try {
      const state = {
        persona: this.persona,
        theme: this.theme,
        filters: this.filters
      };
      localStorage.setItem(this._storageKey, JSON.stringify(state));
    } catch (e) {
      console.warn('Failed to save state to localStorage:', e);
    }
  },

  on(fn) { this._listeners.push(fn); },
  emit() { this._listeners.forEach(fn => fn(this)); },
  setPersona(p) {
    this.persona = p;
    this._saveToStorage();
    this.emit();
  },
  setFilter(key, value) {
    this.filters[key] = value;
    this._saveToStorage();
    this.emit();
  },
  resetFilters() {
    this.filters = {
      theme: null, tier: null, category: 'all',
      dateWindow: 30, country: null, search: '', sort: 'recency'
    };
    this._saveToStorage();
    this.emit();
  },
  // Apply filters from URL query string (for deep links)
  applyFromQuery(qs) {
    const u = new URLSearchParams(qs);
    if (u.has('theme')) this.filters.theme = u.get('theme');
    if (u.has('tier')) this.filters.tier = u.get('tier');
    if (u.has('cat')) this.filters.category = u.get('cat');
    if (u.has('days')) {
      const d = u.get('days');
      this.filters.dateWindow = d === 'all' ? 'all' : parseInt(d, 10);
    }
    if (u.has('q')) this.filters.search = u.get('q');
    if (u.has('country')) this.filters.country = u.get('country');
    if (u.has('sort')) this.filters.sort = u.get('sort');
    if (u.has('persona')) this.persona = u.get('persona');
    this._saveToStorage();
  }
};

// Theme toggle
function toggleTheme() {
  const next = (document.documentElement.getAttribute('data-theme') || 'dark') === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  State.theme = next;
  updateThemeToggleIcon();
}
function updateThemeToggleIcon() {
  const btn = document.getElementById('themeToggle');
  if (!btn) return;
  const dark = document.documentElement.getAttribute('data-theme') === 'dark';
  btn.innerHTML = dark
    ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="4.5"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>'
    : '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';
}

window.SftSState = State;
window.toggleTheme = toggleTheme;
window.updateThemeToggleIcon = updateThemeToggleIcon;

// Initialize localStorage support and load persisted state on app init
State._checkStorage();
State._loadFromStorage();
