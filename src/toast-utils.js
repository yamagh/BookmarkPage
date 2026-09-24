/**
 * Toast notification utility.
 * Displays a brief, non-blocking message at the bottom-center of the viewport.
 * Uses CSS classes with design tokens for theme-aware styling.
 */
window.ToastUtils = {
  toast(msg) {
    const el = document.createElement('div');
    el.className = 'toast-notification';
    el.textContent = msg;
    document.body.appendChild(el);
    requestAnimationFrame(() => {
      el.style.opacity = '1';
      el.style.transform = 'translateX(-50%) translateY(0)';
     });
    setTimeout(() => {
      el.style.opacity = '0';
      el.style.transform = 'translateX(-50%) translateY(20px)';
      setTimeout(() => el.remove(), 400);
     }, 2200);
   }
};
