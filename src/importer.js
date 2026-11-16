/**
 * Importer — parse an import file's text into bookmarks, and plan how a
 * parsed list merges into the current one. Pure: no DOM, no Vue, no I/O
 * (reading the file itself is SideEffects' job; this module only ever
 * sees the text). Depends on window.BookmarkUtils, defined above.
 *
 * Supported formats (detected from the content, not the file name):
 *   bookmarks.js  this app's own export — `const bookmarks = [...]` with
 *                 an optional `const meta = {...}`. The literals must be
 *                 JSON-compatible, which is what Download produces; the
 *                 text is extracted and JSON.parsed, never evaluated.
 *   json          a bare array, or `{ "bookmarks": [...] }` (the shape
 *                 Copy-to-clipboard produces is the bare array). An
 *                 object's `meta` is honoured too.
 *   html          a Netscape Bookmark file (the browser-standard export):
 *                 folder nesting becomes a hierarchical tag ("A / B"),
 *                 SHORTCUTURL becomes a keyword, a <DD> description
 *                 becomes the note.
 *
 * Duplicates are detected by normalized URL (BookmarkUtils.normalizeUrl,
 * scheme/host lowercased, one trailing path slash ignored). plan() merges
 * under one of three strategies chosen by the user in the import dialog:
 *   'skip'      keep the existing entry, drop the incoming duplicate
 *   'overwrite' replace the existing entry with the incoming one
 *   'keep'      keep both (the list rendering keys items by url + index,
 *               so duplicate URLs no longer collide)
 */
window.Importer = {

  /** The duplicate identity of a URL: normalized, case-folded where safe. */
  duplicateKey(url) {
    const n = window.BookmarkUtils.normalizeUrl(url);
    try {
      const u = new URL(n);
      u.protocol = u.protocol.toLowerCase();
      u.hostname = u.hostname.toLowerCase();
      if (u.pathname.length > 1 && u.pathname.endsWith('/')) {
        u.pathname = u.pathname.slice(0, -1);
      }
      return u.toString();
    } catch (e) {
      return n.toLowerCase();
    }
  },

  /**
   * Parse import text into { bookmarks, meta, format, skipped }.
   * bookmarks are canonical (BookmarkUtils.toBookmark); entries without a
   * URL are dropped and counted in `skipped`. meta is the raw imported
   * meta object, or null when the file carries none. Throws an Error with
   * a user-readable message when nothing parseable is found.
   */
  parse(text) {
    const src = String(text || '');
    if (!src.trim()) throw new Error('The file is empty.');
    if (/<!DOCTYPE\s+NETSCAPE/i.test(src) || (/<DL/i.test(src) && /<A\s[^>]*HREF\s*=/i.test(src))) {
      return Importer._fromHtml(src);
    }
    if (/const\s+bookmarks\s*=/.test(src)) return Importer._fromJs(src);
    return Importer._fromJson(src);
  },

  _finish(rawList, rawMeta, format) {
    const bookmarks = [];
    let skipped = 0;
    for (const raw of Array.isArray(rawList) ? rawList : []) {
      const bm = window.BookmarkUtils.toBookmark(raw);
      if (!bm.url) { skipped++; continue; }
      if (!bm.label) bm.label = bm.url;
      bookmarks.push(bm);
    }
    if (!bookmarks.length) throw new Error('No bookmarks with a URL were found in the file.');
    return {
      bookmarks,
      meta: (rawMeta && typeof rawMeta === 'object') ? rawMeta : null,
      format,
      skipped
    };
  },

  _fromJson(src) {
    let parsed;
    try {
      parsed = JSON.parse(src);
    } catch (e) {
      throw new Error('The file is not a bookmarks.js, JSON, or browser bookmark HTML file.');
    }
    if (Array.isArray(parsed)) return Importer._finish(parsed, null, 'json');
    if (parsed && Array.isArray(parsed.bookmarks)) {
      return Importer._finish(parsed.bookmarks, parsed.meta, 'json');
    }
    throw new Error('No bookmark list was found in the JSON.');
  },

  // Extract a balanced [...] or {...} literal starting at `start` (the
  // index of the opening bracket), honouring quoted strings and escapes,
  // so nested arrays/objects and brackets inside strings don't end it
  // early. Returns the literal text, or null when unbalanced.
  _extractLiteral(src, start) {
    const open = src[start];
    const close = open === '[' ? ']' : '}';
    let depth = 0;
    let quote = null;
    for (let i = start; i < src.length; i++) {
      const ch = src[i];
      if (quote) {
        if (ch === '\\') i++;
        else if (ch === quote) quote = null;
        continue;
      }
      if (ch === '"' || ch === "'") quote = ch;
      else if (ch === open) depth++;
      else if (ch === close) {
        depth--;
        if (depth === 0) return src.slice(start, i + 1);
      }
    }
    return null;
  },

  _fromJs(src) {
    const bmAt = src.indexOf('[', src.search(/const\s+bookmarks\s*=/));
    const listText = bmAt >= 0 ? Importer._extractLiteral(src, bmAt) : null;
    if (!listText) throw new Error('Could not find the bookmarks array in the file.');
    let list;
    try {
      list = JSON.parse(listText);
    } catch (e) {
      throw new Error('The bookmarks array is not JSON-compatible, so it cannot be imported safely.');
    }
    let meta = null;
    const metaMatch = /const\s+meta\s*=/.exec(src);
    if (metaMatch) {
      const metaAt = src.indexOf('{', metaMatch.index);
      const metaText = metaAt >= 0 ? Importer._extractLiteral(src, metaAt) : null;
      if (metaText) {
        try { meta = JSON.parse(metaText); } catch (e) { meta = null; }
      }
    }
    return Importer._finish(list, meta, 'bookmarks.js');
  },

  _decodeEntities(s) {
    return String(s || '')
      .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
      .replace(/&#x([0-9a-fA-F]+);/g, (_, n) => String.fromCodePoint(parseInt(n, 16)))
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&');
  },

  _stripTags(s) {
    return Importer._decodeEntities(String(s || '').replace(/<[^>]*>/g, '')).trim();
  },

  _attr(attrs, name) {
    const m = new RegExp(name + '\\s*=\\s*"([^"]*)"', 'i').exec(attrs)
      || new RegExp(name + "\\s*=\\s*'([^']*)'", 'i').exec(attrs);
    return m ? Importer._decodeEntities(m[1]) : '';
  },

  _fromHtml(src) {
    const tokenRe = /<H3\b[^>]*>([\s\S]*?)<\/H3>|<DL\b[^>]*>|<\/DL\s*>|<A\b([^>]*)>([\s\S]*?)<\/A>|<DD>([^\n<]*)/gi;
    const out = [];
    let skipped = 0;
    const stack = [];       // folder names, outermost first ('' = root list)
    let pendingFolder = null;
    let last = null;
    let m;
    while ((m = tokenRe.exec(src)) !== null) {
      if (m[1] !== undefined) {
        pendingFolder = Importer._stripTags(m[1]);
      } else if (/^<DL/i.test(m[0])) {
        stack.push(pendingFolder || '');
        pendingFolder = null;
      } else if (/^<\/DL/i.test(m[0])) {
        stack.pop();
      } else if (m[2] !== undefined) {
        const url = Importer._attr(m[2], 'HREF');
        if (!url || /^place:/i.test(url)) { skipped++; last = null; continue; }
        const keyword = Importer._attr(m[2], 'SHORTCUTURL');
        const folders = stack.filter(Boolean);
        last = {
          label: Importer._stripTags(m[3]) || url,
          url,
          tags: folders.length ? [folders.join(' / ')] : [],
          keywords: keyword ? [keyword] : [],
          note: ''
        };
        out.push(last);
      } else if (m[4] !== undefined && last && !last.note) {
        last.note = Importer._decodeEntities(m[4]).trim();
      }
    }
    const done = Importer._finish(out, null, 'html');
    done.skipped += skipped;
    return done;
  },

  /** How many incoming entries duplicate an existing or earlier incoming URL. */
  countDuplicates(existing, incoming) {
    const seen = new Set((existing || []).map(bm => Importer.duplicateKey(bm.url)));
    let count = 0;
    for (const bm of incoming || []) {
      const key = Importer.duplicateKey(bm.url);
      if (seen.has(key)) count++;
      else seen.add(key);
    }
    return count;
  },

  /**
   * Merge `incoming` into a copy of `existing` under `strategy`
   * ('skip' | 'overwrite' | 'keep'). Neither input is mutated.
   * Returns { list, added, skipped, overwritten, kept } — the counts sum
   * to incoming.length.
   */
  plan(existing, incoming, strategy) {
    const list = window.BookmarkUtils.cloneBookmarks(existing || []);
    const indexByKey = new Map();
    list.forEach((bm, i) => {
      const key = Importer.duplicateKey(bm.url);
      if (!indexByKey.has(key)) indexByKey.set(key, i);
    });
    const result = { list, added: 0, skipped: 0, overwritten: 0, kept: 0 };
    for (const raw of incoming || []) {
      const bm = window.BookmarkUtils.toBookmark(raw);
      const key = Importer.duplicateKey(bm.url);
      if (!indexByKey.has(key)) {
        indexByKey.set(key, list.length);
        list.push(bm);
        result.added++;
      } else if (strategy === 'overwrite') {
        list.splice(indexByKey.get(key), 1, bm);
        result.overwritten++;
      } else if (strategy === 'keep') {
        list.push(bm);
        result.kept++;
      } else {
        result.skipped++;
      }
    }
    return result;
  },

  /**
   * Merge an imported meta into the current one without clobbering it:
   * existing tag settings win by name, the tag order keeps its current
   * sequence and gains any imported names it lacks, and showOtherTags is
   * on when either side has it on. Returns a fresh meta object; with no
   * imported meta, returns a normalized copy of the current one.
   */
  mergeMeta(current, imported) {
    const cur = {
      tagOrder: Array.isArray(current && current.tagOrder) ? current.tagOrder.slice() : [],
      tagKeywords: window.BookmarkUtils.normalizeTagKeywords(current ? current.tagKeywords : []),
      showOtherTags: !!(current && current.showOtherTags)
    };
    if (!imported || typeof imported !== 'object') return cur;
    const have = new Set(cur.tagKeywords.map(o => o.name));
    for (const entry of window.BookmarkUtils.normalizeTagKeywords(imported.tagKeywords)) {
      if (!have.has(entry.name)) cur.tagKeywords.push(entry);
    }
    for (const name of Array.isArray(imported.tagOrder) ? imported.tagOrder : []) {
      if (name && !cur.tagOrder.includes(name)) cur.tagOrder.push(name);
    }
    cur.showOtherTags = cur.showOtherTags || !!imported.showOtherTags;
    return cur;
  }
};
