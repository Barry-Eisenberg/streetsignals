// =====================================================================
// app.js — main entry: header/footer wiring, theme toggle, mobile menu.
// All routes are registered in routes-*.js files loaded earlier.
// =====================================================================

(function bootstrap() {
  // Init localStorage and restore saved persona + theme preference
  State._checkStorage();
  State._loadFromStorage();

  // Apply persisted theme (falls back to light if nothing stored)
  document.documentElement.setAttribute('data-theme', State.theme || 'light');

  document.addEventListener('DOMContentLoaded', () => {
    updateThemeToggleIcon();

    // Theme toggle
    const tt = document.getElementById('themeToggle');
    if (tt) tt.addEventListener('click', toggleTheme);

    // Mobile menu
    const mobToggle = document.getElementById('mobileMenuToggle');
    const nav = document.getElementById('appNav');
    if (mobToggle && nav) {
      mobToggle.addEventListener('click', () => {
        nav.classList.toggle('is-open');
      });
      // Close on link click
      nav.querySelectorAll('a').forEach(a => {
        a.addEventListener('click', () => nav.classList.remove('is-open'));
      });
    }

    // Smooth fade in on every route change handled by router
  });
})();
