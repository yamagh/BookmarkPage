/**
 * Bookmark utilities: normalization, grouping, and favicon resolution.
 */
window.BookmarkUtils = {
  normalizeBookmarks(bookmarks) {
    return bookmarks.map(bm => {
      if (typeof bm.keywords === 'string') bm.keywords = [bm.keywords];
      if (typeof bm.tags === 'string')     bm.tags = [bm.tags];
      return bm;
    });
  },

  groupBookmarksByTag(bookmarks) {
    const grouped = {};
    for (const bm of bookmarks) {
      for (const tag of bm.tags) {
        if (!grouped[tag]) grouped[tag] = [];
        grouped[tag].push(bm);
      }
    }
    return grouped;
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
