/**
 * Tags: the tag domain — tree, collection, suggestion, rename.
 * Pure: no DOM, no Vue, no I/O. Mirrors Catalog's precedent.
 */
window.Tags = {
/**
 * Build a nested, view-ready tree from a flat, sorted group list.
 * Each node carries `display` (last path segment), `depth`, and `hasChildren`.
 * A leaf group (e.g. "🌍 Web / Email") synthesizes any missing ancestor nodes
 * ("🌍 Web"); an ancestor that also exists as a flat tag merges into the same node.
 * Nodes are keyed by a canonical path (segments trimmed, " / "-joined) so a flat
 * "🌍 Web" tag and the parent of "🌍 Web / Email" become one node, not two.
 * This is purely for the index rail; .tag-groups renders the leaf-only groups.
 * Parent nodes' `count` is the unique-URL count of their whole subtree.
 * @param {Array<{tag, items, count}>} groups  sorted leaf/full-path groups
 * @returns {Array<{tag, display, items, count, depth, hasChildren, children?}>} root nodes
 */
  tree(groups) {
   const root = [];
  const map = new Map();            // canonical (trimmed, " / "-joined) path → node
  const canon = (tag) =>
      tag.split('/').map(s => s.trim()).filter(Boolean).join(' / ');
     // Find-or-create the node for fullPath, synthesizing any missing ancestors.
  const ensureNode = (fullPath) => {
     const key = canon(fullPath);
     if (map.has(key)) return map.get(key);
     const parts = key.split(' / ');
     const parentKey = parts.slice(0, -1).join(' / ');
     const parent = parentKey ? ensureNode(parentKey) : null;
     const node = {
        tag: fullPath,
        display: parts[parts.length - 1],
        items: [],
        count: 0,
        children: null,
        hasChildren: false,
        depth: parent ? parent.depth + 1 : 0
        };
     map.set(key, node);
     if (parent) {
        if (!parent.children) parent.children = [];
        parent.children.push(node);
        parent.hasChildren = true;
        } else {
        root.push(node);
        }
     return node;
     };
     // Attach each group's items to its node. A flat tag may share its canonical
    // key with a synthesized parent of a nested tag, so push (do not overwrite).
  for (const g of groups) ensureNode(g.tag).items.push(...g.items);
     // Recurse top-down: order children, then set counts (subtree or own items).
   const collectUrls = (node, urls) => {
      for (const item of node.items) urls.add(item.url);
      if (node.children) for (const c of node.children) collectUrls(c, urls);
      };
  const finalize = (list) => {
     for (const node of list) {
       if (node.children) {
        node.children.sort((a, b) => a.tag.localeCompare(b.tag));
        finalize(node.children);
        const urls = new Set();
        collectUrls(node, urls);
        node.count = urls.size;
        } else {
        node.count = node.items.length;
        }
       }
     };
  finalize(root);
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
