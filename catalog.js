/**
 * Catalog: the query pipeline — filter, group, sort, count.
 * Pure: takes a normalized bookmark list and a query string,
 * returns grouped, sorted, indexed results. No DOM, no Vue.
 */
window.Catalog = {
  /**
   * Run the full pipeline: filter → group by tag → sort tags → count.
   * @param {Array} list  normalized bookmarks ({ label, url, tags[], keywords[], note })
   * @param {string} query raw search string
   * @returns {{ groups: Array<{tag: string, items: Array, count: number}>, total: number }}
   */
  index(list, query) {
    const filtered = Catalog._filter(list, query);
    const grouped = Catalog._groupByTag(filtered);
    const groups = Catalog._sortGroups(grouped);
    const total = groups.reduce((n, g) => n + g.count, 0);
    return { groups, total };
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
      for (const tag of bm.tags || []) {
        if (!grouped[tag]) grouped[tag] = [];
        grouped[tag].push(bm);
      }
    }
    return grouped;
  },

  _sortGroups(grouped) {
    return Object.keys(grouped)
      .sort((a, b) => a.localeCompare(b))
      .map(tag => ({ tag, items: grouped[tag], count: grouped[tag].length }));
  }
}
