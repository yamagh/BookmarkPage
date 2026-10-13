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

    // Normalize the per-tag settings registry (meta.tagKeywords): a list of
    // { name, keywords[], emoji } entries. Deduped by tag name, keywords coerced
    // via toList and emoji coerced to a trimmed string ('' = no icon), so a stored
    // array and an emoji-less legacy entry both round-trip.
  normalizeTagKeywords(raw) {
    if (!Array.isArray(raw)) return [];
    const out = [];
    const seen = new Set();
    for (const o of raw) {
      if (!o || typeof o !== 'object') continue;
      const name = String(o.name || '').trim();
      if (!name || seen.has(name)) continue;
      seen.add(name);
      out.push({
        name,
        keywords: BookmarkUtils.toList(o.keywords),
        emoji: o.emoji ? String(o.emoji).trim() : ''
      });
    }
    return out;
  },
  normalizeBookmarks(bookmarks) {
    return bookmarks.map(bm => BookmarkUtils.toBookmark(bm));
     },

  cloneBookmarks(bookmarks) {
    return JSON.parse(JSON.stringify(bookmarks));
   },

  serializeBookmarks(bookmarks, meta) {
    const pad = '    ';
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
    let out = `const bookmarks = [\n${items.join(',\n')}\n];\n`;
    // Emit a `const meta` block so a re-downloaded file round-trips the user's
    // custom tag order and per-tag keywords; omitted when both are empty.
    const tagOrder = (meta && Array.isArray(meta.tagOrder)) ? meta.tagOrder : [];
    // Emit per-tag settings entries, dropping one that has neither keywords
    // nor an icon (AC7). The `emoji` key is omitted when empty so keyword-only
    // entries round-trip as the legacy shape (a missing emoji loads as '' = none).
    const tagKeywords = (meta && Array.isArray(meta.tagKeywords) ? meta.tagKeywords : [])
      .map(o => {
        if (!o) return null;
        const name = String(o.name || '');
        if (!name) return null;
        const keywords = BookmarkUtils.toList(o.keywords);
        const emoji = o.emoji ? String(o.emoji).trim() : '';
        if (!keywords.length && !emoji) return null;
        const out = { name, keywords };
        if (emoji) out.emoji = emoji;
        return out;
      })
      .filter(Boolean);
    const metaOut = {};
    if (tagOrder.length) metaOut.tagOrder = tagOrder;
    if (tagKeywords.length) metaOut.tagKeywords = tagKeywords;
    // Carry the 'show other tags' display preference so a re-downloaded file
    // keeps it; omitted when off to keep the file clean.
    if (meta && meta.showOtherTags) metaOut.showOtherTags = true;
    if (Object.keys(metaOut).length) {
      out += `\nconst meta = ${JSON.stringify(metaOut, null, 2)};\n`;
    }
    return out;
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
