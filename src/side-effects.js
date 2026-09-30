/**
 * SideEffects — the app's I/O boundary: the single module that touches the
 * browser. Navigation, clipboard, file download, and theme + bookmark
 * persistence all live here. Depends on window.ToastUtils and
 * window.BookmarkUtils, both defined above.
 *
 *   navigate(bm)              URL navigation; `%s` templates prompt for a term
 *   copyToClipboard(list)     export the list as JSON to the clipboard
 *   downloadFile(name,data,mime)  write content to a downloadable file
 *   getTheme() / setTheme()   read/write the light|dark theme, mirror data-theme
 *   loadBookmarks(src) / saveBookmarks(list, meta)  localStorage 'bookmarks'
 *                        (and 'meta'), falling back to the file's globals
 */
window.SideEffects = {
   // URL navigation. A `%s` in the URL means "prompt for a search term first."
  navigate(bm) {
    if (bm.url.includes('%s')) {
      const value = prompt('Enter search term:', '');
      if (value) window.location.href = bm.url.replace('%s', encodeURIComponent(value));
     } else {
      window.location.href = bm.url;
     }
   },

   // Clipboard: export as pretty JSON, fall back to execCommand on failure.
  copyToClipboard(list) {
    const json = JSON.stringify(list, null, 2);
    navigator.clipboard.writeText(json)
       .then(() => window.ToastUtils.toast('Bookmarks copied'))
       .catch(() => {
        const ta = document.createElement('textarea');
        ta.value = json;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        window.ToastUtils.toast('Bookmarks copied');
       });
   },

   // File download: a Blob + a temporary <a download>. Best-effort, toast-notified.
  downloadFile(filename, content, mime) {
    try {
      const blob = new Blob([content], { type: mime || 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      window.ToastUtils.toast(`Downloaded ${filename}`);
     } catch (e) {
      window.ToastUtils.toast('Download failed');
     }
   },

   // Theme persistence: localStorage 'theme' + mirror to <html data-theme>.
  getTheme() {
    try {
      return localStorage.getItem('theme') ||
         (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
     } catch (e) {
      return 'light';
     }
   },
  setTheme(theme) {
    try {
      localStorage.setItem('theme', theme);
      document.documentElement.setAttribute('data-theme', theme);
     } catch (e) {
       /* ignore storage errors */
     }
   },

   // Bookmark persistence: localStorage 'bookmarks'; when nothing is stored,
   // fall back to the file's global `bookmarks` array.
  loadBookmarks(source) {
    let data = source;
    try {
      const raw = localStorage.getItem('bookmarks');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) data = parsed;
       }
     } catch (e) {
       /* fall back to the file source */
     }
    return window.BookmarkUtils.normalizeBookmarks(
      window.BookmarkUtils.cloneBookmarks(data)
     );
   },
  saveBookmarks(list, meta) {
    try {
      localStorage.setItem('bookmarks', JSON.stringify(list));
    } catch (e) {
      /* ignore storage errors */
    }
    if (meta) {
      try {
        localStorage.setItem('meta', JSON.stringify(meta));
      } catch (e) {
        /* ignore storage errors */
      }
    }
  },

  // Meta persistence: localStorage 'meta', falling back to the file's global
  // `meta` (emitted as a const by serializeBookmarks). Always returns
  // { tagOrder: string[] }.
  loadMeta() {
    try {
      const raw = localStorage.getItem('meta');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          return { tagOrder: Array.isArray(parsed.tagOrder) ? parsed.tagOrder : [] };
        }
      }
    } catch (e) { /* fall back to the file source */ }
    if (typeof meta !== 'undefined' && meta && Array.isArray(meta.tagOrder)) {
      return { tagOrder: meta.tagOrder.slice() };
    }
    return { tagOrder: [] };
  }
};
