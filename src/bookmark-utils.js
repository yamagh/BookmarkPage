/**
 * Bookmark utilities: normalization, favicon, and tag rename.
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

  /**
   * Rename a tag across the entire bookmark list.
   * @param {Array} list     normalized bookmarks
   * @param {string} oldTag  exact tag string to replace
   * @param {string} newTag  replacement string (empty string = delete the tag)
   * @returns {number} count of bookmarks that were changed
   */
  renameTags(list, oldTag, newTag) {
    let changed = 0;
    for (const bm of list) {
      const tags = bm.tags || [];
      if (!tags.includes(oldTag)) continue;
      const newTags = tags.filter(t => t !== oldTag);
      if (newTag && !newTags.includes(newTag)) newTags.push(newTag);
      bm.tags = newTags;
      changed++;
     }
    return changed;
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
