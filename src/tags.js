/**
 * Tags: the tag domain — tree, collection, suggestion, rename.
 * Pure: no DOM, no Vue, no I/O. Mirrors Catalog's precedent.
 */
window.Tags = {
   /**
    * Build a nested, view-ready tree from a flat, sorted group list.
    * Each node carries `display` (last path segment), `depth`, and `hasChildren`.
    * Parent nodes' `count` is overwritten with the unique-URL count of their subtree.
    * @param {Array<{tag: string, items: Array, count: number}>} groups sorted flat groups
    * @returns {Array<{tag, display, items, count, depth, hasChildren, children?: Array}>} root nodes
    */
  tree(groups) {
    const root = [];
    const map = new Map();
    for (const g of groups) {
      const parts = g.tag.split('/');
      map.set(g.tag, {
        tag: g.tag,
        display: parts[parts.length - 1],
        items: g.items,
        count: g.count,
        children: null
      });
    }
    // Attach each group to its parent (if the parent path exists in the map)
    for (const [key, node] of map.entries()) {
      const parts = key.split('/');
      if (parts.length === 1) {
        node.depth = 0;
        root.push(node);
      } else {
        const parentKey = parts.slice(0, -1).join('/');
        const parent = map.get(parentKey);
        if (parent) {
          if (!parent.children) parent.children = [];
          parent.hasChildren = true;
          node.depth = parent.depth + 1;
          parent.children.push(node);
        } else {
          node.depth = 0;
          root.push(node);
        }
      }
    }
    // Overwrite parent count with unique-URL count of the whole subtree
    const collectUrls = (node, urls) => {
      for (const item of node.items) urls.add(item.url);
      if (node.children) for (const c of node.children) collectUrls(c, urls);
    };
    for (const node of root) {
      if (node.children) {
        node.children.sort((a, b) => a.tag.localeCompare(b.tag));
        const urls = new Set();
        collectUrls(node, urls);
        node.count = urls.size;
      }
    }
    return root;
  },

  /**
   * Collect unique tag names from a normalized bookmark list, sorted.
   * @param {Array} list normalized bookmarks
   * @returns {string[]} sorted unique tag names
   */
  collect(list) {
    const set = new Set();
    for (const bm of list) {
      for (const t of (bm.tags || [])) set.add(t);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  },

  /**
   * Filter available tag suggestions, excluding already-selected tags.
   * @param {string[]} all      available tag names
   * @param {string[]} selected tags already selected (will be excluded)
   * @param {string} [q]        optional substring filter
   * @returns {string[]} filtered suggestions, max 30
   */
  suggest(all, selected, q = '') {
    let tags = all;
    if (q) tags = tags.filter(t => t.toLowerCase().includes(q.toLowerCase()));
    const sel = new Set(selected);
    return tags.filter(t => !sel.has(t)).slice(0, 30);
  },

  /**
   * Rename a tag across the entire bookmark list (mutates in place).
   * Pass an empty `newTag` to delete the tag.
   * @param {Array}  list    normalized bookmarks
   * @param {string} oldTag  exact tag string to replace
   * @param {string} [newTag] replacement (empty = delete)
   * @returns {number} count of bookmarks changed
   */
  rename(list, oldTag, newTag) {
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
  }
};
