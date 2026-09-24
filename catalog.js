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
   * @returns {{ groups: Array<{tag, items, count}>, tree: Array<{tag, items, count, children}>, total: number }}
   */
  index(list, query) {
    const filtered = Catalog._filter(list, query);
    const grouped = Catalog._groupByTag(filtered);
    const groups = Catalog._sortGroups(grouped);
    const total = groups.reduce((n, g) => n + g.count, 0);
    const tree = Catalog._buildTree(groups);
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

   _buildTree(groups) {
    // Convert the flat, sorted group list into a nested tree of {tag, items, count, children}
    const root = [];
    const map = new Map();
    for (const g of groups) {
      map.set(g.tag, { tag: g.tag, items: g.items, count: g.count, children: null });
    }
    // Attach each group to its parent (if the parent path is also a group)
    for (const [key, node] of map.entries()) {
      const parts = key.split('/');
      if (parts.length === 1) {
        root.push(node);
      } else {
        const parentKey = parts.slice(0, -1).join('/');
        const parent = map.get(parentKey);
        if (parent) {
          if (!parent.children) parent.children = [];
          parent.children.push(node);
        } else {
          root.push(node);
        }
      }
    }
    // Overwrite count on parent nodes so it reflects unique URLs in the whole subtree
    const collectUrls = (node, urls) => {
      for (const item of node.items) urls.add(item.url);
      if (node.children) for (const c of node.children) collectUrls(c, urls);
    };
    for (const node of root) {
      if (node.children) {
        // Sort children alphabetically by full path
        node.children.sort((a, b) => a.tag.localeCompare(b.tag));
        const urls = new Set();
        collectUrls(node, urls);
        node.count = urls.size;
      }
    }
    return root;
   }
}
