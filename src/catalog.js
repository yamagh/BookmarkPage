/**
 * Catalog: the query pipeline — filter, group, sort, count.
 * Pure: takes a normalized list and a query, returns grouped/sorted results.
 * Depends on window.Tags (loaded before this file) for tree-building.
 */
window.Catalog = {
  /**
   * Run the full pipeline: filter → group by tag → sort tags → count.
   * @param {Array} list  normalized bookmarks ({ label, url, tags[], keywords[], note })
   * @param {string} query raw search string
    * @returns {{ groups: Array<{tag, items, count, hasPath, root, leaf}>, tree: Array<{tag, display, items, count, depth, hasChildren, children?}>, total: number }}
   */
  index(list, query, tagOrder) {
    const scored = Catalog._filterAndScore(list, query);
    // Ranked by match quality when searching; source order for an empty query.
    if (query && query.trim()) scored.sort((a, b) => b.score - a.score);
    const filtered = scored.map(s => s.bm);
    const grouped = Catalog._groupByTag(filtered);
    const groups = Catalog._sortGroups(grouped, tagOrder);
    const total = groups.reduce((n, g) => n + g.count, 0);
    const tree = Tags.tree(groups, tagOrder);
    return { groups, tree, total };
   },

   // --- internal ----------------------------------------------------------------

   // Filter (AND across space-separated parts, OR across fields) and attach a
   // match-quality score per item — exact > prefix > substring, weighted
   // label > tags > keywords — so index() can rank results.
  _filterAndScore(list, query) {
    const q = (query || '').trim().toLowerCase();
    if (!q) return list.map(bm => ({ bm, score: 0 }));
    const parts = q.split(/\s+/);
    const out = [];
    for (const bm of list) {
      const label = (bm.label || '').toLowerCase();
      const tags = bm.tags || [];
      const keywords = bm.keywords || [];
      let allMatch = true;
      let score = 0;
      for (const part of parts) {
        // Best score per field, summed only for the winning field.
        let labelScore = 0;
        if (label === part) labelScore = 30;
        else if (label.startsWith(part)) labelScore = 15;
        else if (label.includes(part)) labelScore = 3;

        let tagScore = 0;
        for (const t of tags) {
          const s = (t || '').toLowerCase();
          const v = s === part ? 20 : s.startsWith(part) ? 10 : s.includes(part) ? 2 : 0;
          if (v > tagScore) tagScore = v;
         }

        let kwScore = 0;
        for (const k of keywords) {
          const s = (k || '').toLowerCase();
          const v = s === part ? 10 : s.startsWith(part) ? 5 : s.includes(part) ? 1 : 0;
          if (v > kwScore) kwScore = v;
         }

        const best = Math.max(labelScore, tagScore, kwScore);
        if (best === 0) { allMatch = false; break; }
        score += best;
       }
      if (allMatch) out.push({ bm, score });
     }
    return out;
   },

  _groupByTag(list) {
    const grouped = {};
    for (const bm of list) {
      // Group each bookmark under its full tag path only. Nested tags such
      // as "Foo / Bar / Baz" no longer fan out to parent prefixes ("Foo",
      // "Foo / Bar"); a bookmark appears under its full path and nowhere else.
      const seen = new Set();
      for (const tag of bm.tags || []) {
        const p = tag.trim();
        if (!p || seen.has(p)) continue;
        seen.add(p);
        if (!grouped[p]) grouped[p] = [];
        grouped[p].push(bm);
       }
       // Bookmarks with no tags fall into an "Untagged" group so they still appear.
      if (!seen.size) {
        const key = 'Untagged';
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(bm);
       }
      }
     return grouped;
   },

   // Order tag groups by the user's custom `tagOrder` (a list of top-level tag
   // names). Each group sorts by the position of its root segment; unknown roots
   // fall to the end, ties resolved alphabetically by full path.
  _sortGroups(grouped, tagOrder) {
    const order = tagOrder || [];
    const rootOf = (tag) => tag.split('/')[0].trim();
    const pos = (root) => {
      const i = order.indexOf(root);
      return i < 0 ? Infinity : i;
     };
    return Object.keys(grouped)
       .sort((a, b) => {
        const pa = pos(rootOf(a)), pb = pos(rootOf(b));
        if (pa !== pb) return pa - pb;
        return a.localeCompare(b);
       })
       .map(tag => {
        const parts = tag.split('/');
        const hasPath = parts.length > 1;
        return {
          tag,
          items: grouped[tag],
          count: grouped[tag].length,
          hasPath,
          root: hasPath ? parts.slice(0, -1).join('/') : null,
          leaf: hasPath ? parts[parts.length - 1] : tag
         };
       });
   }

}
