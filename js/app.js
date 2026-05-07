// =====================================================================
// app.js — main entry: header/footer wiring, theme toggle, mobile menu.
// All routes are registered in routes-*.js files loaded earlier.
// =====================================================================

(function bootstrap() {
  // Theme — default dark, no localStorage in iframe sandbox
  document.documentElement.setAttribute('data-theme', 'dark');

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
