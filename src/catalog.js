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
   * @returns {{ groups: Array<{tag, items, count}>, tree: Array<{tag, items, count, children}>, total: number }}
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
      // Collect all path prefixes per bookmark (dedupe via Set)
      const paths = new Set();
      for (const tag of bm.tags || []) {
        let prefix = '';
        for (const part of tag.split('/')) {
          if (!part) continue;
          prefix = prefix ? prefix + '/' + part : part;
          paths.add(prefix);
        }
      }
      for (const p of paths) {
        if (!grouped[p]) grouped[p] = [];
        grouped[p].push(bm);
      }
    }
    return grouped;
   },

  _sortGroups(grouped) {
    return Object.keys(grouped)
      .sort((a, b) => a.localeCompare(b))
      .map(tag => ({ tag, items: grouped[tag], count: grouped[tag].length }));
   },
  
}
