/**
 * Bookmark utilities: normalization, serialization, and favicon.
 *
 * The one-shape contract lives in toBookmark: every path that produces or
 * consumes a bookmark -- load (normalize), save (serialize), and the
 * component's form -- routes through it, so a field can't be coerced
 * differently on one end than the other. toList is the single
 * "field to array" primitive both a comma string (the form) and a
 * stored array collapse onto.
 */
window.BookmarkUtils = {
   // Field to array: collapse a form field (comma string) or a stored
    // array onto one list, so tags/keywords agree everywhere.
  toList(value) {
    if (Array.isArray(value)) return value.slice();
    return String(value || '').split(',').map(s => s.trim()).filter(Boolean);
    },

   // The one place that knows the bookmark shape:
   //      { label, url, tags[], keywords[], note }
   // Coerce any raw record into that canonical in-memory bookmark.
  toBookmark(raw) {
    raw = raw || {};
    return {
      label: raw.label || '',
      url: raw.url || '',
      tags: BookmarkUtils.toList(raw.tags),
      keywords: BookmarkUtils.toList(raw.keywords),
      note: raw.note ? String(raw.note) : ''
       };
       },

  normalizeBookmarks(bookmarks) {
    return bookmarks.map(bm => BookmarkUtils.toBookmark(bm));
     },

  cloneBookmarks(bookmarks) {
    return JSON.parse(JSON.stringify(bookmarks));
   },

  serializeBookmarks(bookmarks) {
    const pad = '   ';
    const items = bookmarks.map(bm => {
      const b = BookmarkUtils.toBookmark(bm);
      const field = (key, val) => `${pad}${pad}"${key}": ${JSON.stringify(val)}`;
      const lines = [
        field('label', b.label),
        field('url', b.url),
        field('tags', b.tags),
        field('keywords', b.keywords)
        ];
      if (b.note) lines.push(field('note', b.note));
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
