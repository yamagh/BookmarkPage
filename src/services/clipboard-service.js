/**
 * Clipboard service: exports bookmarks as JSON to the clipboard.
 * Depends on window.ToastUtils (must be loaded before this script).
 */
window.ClipboardService = {
  copyBookmarksToClipboard(bookmarks) {
    const json = JSON.stringify(bookmarks, null, 2);
    navigator.clipboard.writeText(json)
      .then(() => window.ToastUtils.toast('Bookmarks copied'))
      .catch(() => {
        // Fallback for older browsers
        const ta = document.createElement('textarea');
        ta.value = json;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        window.ToastUtils.toast('Bookmarks copied');
      });
  }
};
