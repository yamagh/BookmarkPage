/**
 * Bootstrap: create the Vue application instance and mount it.
 * Depends on: Vue (CDN), window.AppComponent, global `bookmarks` array.
 *
 * Theme handling:
 * - Detect stored theme or system preference before render (see inline script in HTML)
 * - localStorage key: 'theme' ('light' | 'dark')
 */

// Expose theme helpers to component
window.ThemeManager = {
  get() {
    try {
      return localStorage.getItem('theme') ||
        (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    } catch (e) {
      return 'light';
    }
  },
  set(theme) {
    try {
      localStorage.setItem('theme', theme);
      document.documentElement.setAttribute('data-theme', theme);
    } catch (e) {
      /* ignore storage errors */
    }
  }
};

const app = Vue.createApp(window.AppComponent);

app.mount('#bookmark-app');
