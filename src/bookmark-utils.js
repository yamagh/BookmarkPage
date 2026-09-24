/**
 * Bookmark utilities: normalization, favicon, and serialization.
 */
window.BookmarkUtils = {
  normalizeBookmarks(bookmarks) {
    return bookmarks.map(bm => {
      if (typeof bm.keywords === 'string') bm.keywords = [bm.keywords];
      if (typeof bm.tags === 'string')     bm.tags = [bm.tags];
      if (bm.note == null) bm.note = '';
      return bm;
     });
   },

  cloneBookmarks(bookmarks) {
    return JSON.parse(JSON.stringify(bookmarks));
   },

  serializeBookmarks(bookmarks) {
    const asArray = v => Array.isArray(v) ? v
        : (typeof v === 'string' && v.trim()) ? [v]
        : [];
    const pad = '   ';
    const items = bookmarks.map(bm => {
      const field = (key, val) => `${pad}${pad}"${key}": ${JSON.stringify(val)}`;
      const lines = [
        field('label', bm.label || ''),
        field('url', bm.url || ''),
        field('tags', asArray(bm.tags)),
        field('keywords', asArray(bm.keywords))
        ];
      if (bm.note) lines.push(field('note', bm.note));
      return `${pad}{\n${lines.join(',\n')}\n${pad}}`;
      });
    return `const bookmarks = [\n${items.join(',\n')}\n];\n`;
   },



  faviconUrl(url) {
    try {
      const u = new URL(url.startsWith('http') ? url : `https://${url}`);
      return `https://t2.google.com/favicon?sz=16&domain=${u.hostname}`;
    } catch {
      return null;
     }
  }
};
