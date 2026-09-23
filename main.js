/**
 * Bootstrap: create the Vue application instance and mount it.
 * Depends on: Vue (CDN), window.AppComponent, window.SideEffects, and the
 * global `bookmarks` array. Theme + bookmark persistence now live in
 * window.SideEffects, which is defined before this block.
 */

const app = Vue.createApp(window.AppComponent);

app.mount('#bookmark-app');
