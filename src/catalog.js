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
  index(list, query) {
    const filtered = Catalog._filter(list, query);
    const grouped = Catalog._groupByTag(filtered);
    const groups = Catalog._sortGroups(grouped);
    const total = groups.reduce((n, g) => n + g.count, 0);
    const tree = Tags.tree(groups);
    return { groups, tree, total };
  },

  // --- internal ----------------------------------------------------------------

  _filter(list, query) {
    const q = (query || '').trim().toLowerCase();
    if (!q) return list;
    const parts = q.split(/\s+/);
    return list.filter(bm =>
      parts.every(part =>
        bm.label.toLowerCase().includes(part) ||
        (bm.tags || []).some(t => t.toLowerCase().includes(part)) ||
        (bm.keywords || []).some(kw => kw.toLowerCase().includes(part))
      )
    );
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
    }
    return grouped;
   },

   _sortGroups(grouped) {
      return Object.keys(grouped)
        .sort((a, b) => a.localeCompare(b))
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
    },

}
