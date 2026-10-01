/**
 * Vue component definition for the bookmark manager.
 * Relies on window.BookmarkUtils, window.Catalog, and window.SideEffects —
 * all exposed as globals via script load order.
 */
window.AppComponent = {
  data() {
    return {
      query: '',
      activeTag: '',
      theme: window.SideEffects.getTheme(),
      bookmarks: window.SideEffects.loadBookmarks(bookmarks),
      originalBookmarks: window.BookmarkUtils.normalizeBookmarks(
        window.BookmarkUtils.cloneBookmarks(bookmarks)
        ),
       // ---- overlay state: at most one overlay is open at a time.
       // 'editor' | 'rename' | 'code' | 'help'; null = none.
       // Per-overlay payloads follow (editing / renamingTag / codeViewText).
      activeOverlay: null,
       // editor payload
      isNew: false,
      editingIndex: -1,
      editing: { label: '', url: '', tags: '', keywords: '', note: '' },
      expandedTags: {},
       // tag picker state
      tagInput: '',
      tagPickerOpen: false,
       // rename payload
      renamingTag: '',
      newTag: '',
      focusIndex: -1,
       // tag-order state
      meta: window.SideEffects.loadMeta(),
      draggingTag: null,
      dragOverTag: null,
       // code-view payload
      codeViewText: ''
     };
  },

  computed: {
    catalog() {
      return window.Catalog.index(this.bookmarks, this.query, this.meta ? this.meta.tagOrder : undefined);
    },

    treeFlat() {
      const expanded = this.expandedTags;
      const result = [];
      const walk = (nodes) => {
        for (const node of nodes) {
          result.push({ ...node, expanded: !!expanded[node.tag] });
          if (expanded[node.tag] && node.children) walk(node.children);
         }
       };
      walk(this.catalog.tree);
      return result;
     },


    renameCount() {
      if (!this.renamingTag) return 0;
      return this.bookmarks.filter(bm => (bm.tags || []).includes(this.renamingTag)).length;
    },

    // --- tag picker computed ---
    allTags() {
      return window.Tags.collect(this.bookmarks);
     },

    editingTags() {
      return window.BookmarkUtils.toList(this.editing.tags);
    },

    tagSuggestions() {
      return window.Tags.suggest(
        this.allTags,
        this.editingTags,
        this.tagInput.trim().toLowerCase()
       );
      },
      flatItems() {
        const result = [];
        for (const group of this.catalog.groups) {
          for (const bm of group.items) result.push(bm);
            }
        return result;
      },

      flatGroups() {
        let offset = 0;
        return this.catalog.groups.map(g => {
          const entry = { ...g, flatStart: offset };
          offset += g.items.length;
          return entry;
            });
      }
  },


  watch: {
    query() {
      this.focusIndex = -1;
      },
     focusIndex(val) {
      this.$nextTick(() => {
        const items = document.querySelectorAll('.item');
        if (val >= 0 && items[val]) {
          items[val].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
             }
           });
         }
       },

  methods: {
    toggleTheme() {
      const next = this.theme === 'dark' ? 'light' : 'dark';
      this.theme = next;
      window.SideEffects.setTheme(next);
    },

    navigate(bookmark) {
      window.SideEffects.navigate(bookmark);
    },

    goToFirstBookmark() {
      const first = this.catalog.groups[0];
      if (first?.items?.[0]) this.navigate(first.items[0]);
    },

    focusQueryInput() {
      this.$refs.query?.focus();
    },

    scrollToTag(tag) {
      const i = this.catalog.groups.findIndex(e => e.tag === tag);
      if (i < 0) return;
      const el = document.querySelectorAll('li.tag')[i];
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      this.activeTag = tag;
    },

      toggleExpand(tag) {
        this.expandedTags[tag] = !this.expandedTags[tag];
        },

        // --- tag order: drag-and-drop reorder of top-level tags ---
        onTagDragStart(entry) {
          if (entry.depth !== 0) return;
          this.draggingTag = entry.tag;
          },
        onTagDragOver(target) {
          if (target.depth !== 0 || !this.draggingTag) return;
          this.dragOverTag = target.tag;
          },
        onTagDrop(target) {
          this.dragOverTag = null;
          const from = this.draggingTag;
          this.draggingTag = null;
          if (target.depth !== 0 || !from || from === target.tag) return;
          const topOrder = this.catalog.tree.map(n => n.tag);
          const fromIdx = topOrder.indexOf(from);
          const toIdx = topOrder.indexOf(target.tag);
          if (fromIdx < 0 || toIdx < 0 || fromIdx === toIdx) return;
          topOrder.splice(fromIdx, 1);
          const insertIdx = fromIdx < toIdx ? toIdx - 1 : toIdx;
          topOrder.splice(insertIdx, 0, from);
          this.meta.tagOrder = topOrder;
          window.SideEffects.saveBookmarks(this.bookmarks, this.meta);
          window.ToastUtils.toast('Tag order updated');
          },
        onTagDragEnd() {
          this.draggingTag = null;
          this.dragOverTag = null;
          },

    copyBookmarksToClipboard() {
      window.SideEffects.copyToClipboard(this.bookmarks);
    },

    faviconUrl(url) {
      return window.BookmarkUtils.faviconUrl(url);
    },

    // --- editor: open modal for an existing bookmark, or a blank one to add ---
    openEdit(bookmark) {
      const index = bookmark ? this.bookmarks.indexOf(bookmark) : -1;
      this.isNew = !bookmark;
      this.editingIndex = index;
      this.editing = bookmark ? {
        label: bookmark.label || '',
        url: bookmark.url || '',
        tags: (bookmark.tags || []).join(', '),
        keywords: (bookmark.keywords || []).join(', '),
        note: bookmark.note || ''
      } : { label: '', url: '', tags: '', keywords: '', note: '' };
      this.tagInput = '';
      this.activeOverlay = 'editor';
      this.$nextTick(() => {
        if (this.$refs.urlInput) this.$refs.urlInput.focus();
      });
    },

    closeEditor() {
      this.activeOverlay = null;
    },

    saveEdit() {
      const e = this.editing;
      const label = e.label.trim();
      const url = e.url.trim();
      if (!url) {
        window.ToastUtils.toast('URL is required');
        return;
      }
      const bm = window.BookmarkUtils.toBookmark({
        label,
        url,
        tags: window.BookmarkUtils.toList(e.tags),
        keywords: window.BookmarkUtils.toList(e.keywords),
        note: e.note.trim()
      });
      if (this.isNew) this.bookmarks.push(bm);
      else this.bookmarks.splice(this.editingIndex, 1, bm);
      this.activeOverlay = null;
      this.tagInput = '';
      this.tagPickerOpen = false;
      window.SideEffects.saveBookmarks(this.bookmarks, this.meta);
      window.ToastUtils.toast(this.isNew ? 'Bookmark added' : 'Bookmark saved');
    },

    addBookmark() {
      this.openEdit(null);
    },

     // Global keydown router — single entry point for all keyboard shortcuts.
     // Escape has highest priority (closes any open overlay). All other shortcuts
     // are inert while a modal (editor / rename) or the help overlay is open,
     // and inert when the user is actively typing in a text field.
    onKeydown(e) {
       // Escape: close whichever overlay is on screen (help > editor > rename)
      if (e.key === 'Escape') {
        this.closeAllModals();
        return;
         }

        // Editor / rename modal open — suppress all other global shortcuts
      if (window.Keyboard.isModalOpen(this.activeOverlay)) return;

        // Help overlay open — only ? can toggle it; all other keys ignored
      if (this.activeOverlay === 'help') {
        if (e.key === '?') { e.preventDefault(); this.toggleHelp(); }
        return;
         }

      const typing = window.Keyboard.isTyping(e.target);
      const hasMod = e.ctrlKey || e.metaKey;

        // Modifier combos — inert while the user is inside a text field
      if (hasMod) {
        if (typing) return;
        switch (e.key.toLowerCase()) {
          case 'e':
            e.preventDefault();
            this.editFocusedCard();
            break;
          case 'backspace':
            e.preventDefault();
            this.deleteFocusedCard();
            break;
            }
        return;
         }

        // Alt combos: leave to the browser (menu / search navigation)
      if (e.altKey) return;

        // Single-letter / arrow-key shortcuts
      switch (e.key) {
        case '/':
          if (!typing) { e.preventDefault(); this.focusQueryInput(); }
          break;
        case 'n':
        case 'N':
          if (!typing) { e.preventDefault(); this.addBookmark(); }
          break;
        case 't':
        case 'T':
          if (!typing) { e.preventDefault(); this.toggleTheme(); }
          break;
        case '?':
          if (!typing) { e.preventDefault(); this.toggleHelp(); }
          break;
        case 'j':
        case 'J':
        case 'ArrowDown':
          if (!typing) { e.preventDefault(); this.focusNextCard(); }
          break;
        case 'k':
        case 'K':
        case 'ArrowUp':
          if (!typing) { e.preventDefault(); this.focusPrevCard(); }
          break;
        case 'Enter':
           // Fires when no text field has focus; in-field Enter is handled by
           // @keydown.enter on the search input (onSearchEnter).
          if (!typing) { e.preventDefault(); this.openFocusedCard(); }
          break;
         }
    },

    deleteEditingBookmark() {
      if (this.isNew) return;
      const name = this.editing.label || this.editing.url;
      if (!confirm(`Delete "${name}"?`)) return;
      this.bookmarks.splice(this.editingIndex, 1);
      this.activeOverlay = null;
      window.SideEffects.saveBookmarks(this.bookmarks, this.meta);
      window.ToastUtils.toast('Bookmark deleted');
     },

    // Export the current list to a re-loadable bookmarks.js data file.
    downloadBookmarks() {
      const content = window.BookmarkUtils.serializeBookmarks(this.bookmarks, this.meta);
      window.SideEffects.downloadFile('bookmarks.js', content, 'text/javascript');
     },

    // --- code view ---
    openCodeView() {
      this.codeViewText = window.BookmarkUtils.serializeBookmarks(this.bookmarks, this.meta);
      this.activeOverlay = 'code';
     },
    closeCodeView() {
      this.activeOverlay = null;
     },
    copyCodeView() {
      navigator.clipboard?.writeText(this.codeViewText)
         .then(() => window.ToastUtils.toast('Copied'))
         .catch(() => {
          const ta = document.createElement('textarea');
          ta.value = this.codeViewText;
          document.body.appendChild(ta);
          ta.select();
          document.execCommand('copy');
          document.body.removeChild(ta);
          window.ToastUtils.toast('Copied');
         });
     },

    resetBookmarks() {
      if (!confirm('Reset to the original bookmarks? Your saved edits will be cleared.')) return;
      this.bookmarks = window.BookmarkUtils.cloneBookmarks(this.originalBookmarks);
      window.SideEffects.saveBookmarks(this.bookmarks, this.meta);
      window.ToastUtils.toast('Reset to original');
    },

    // --- tag picker methods ---
    addTag(tag) {
      const t = (tag || '').trim();
      if (!t) return;
      if (!this.editingTags.includes(t)) {
        this.editing.tags = this.editingTags.length
          ? this.editing.tags + ', ' + t
          : t;
      }
      this.tagInput = '';
    },

    removeTag(tag) {
      const remaining = this.editingTags.filter(t => t !== tag);
      this.editing.tags = remaining.join(', ');
    },

    onTagKeydown(e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        this.addTag(this.tagInput);
      } else if (e.key === 'Backspace' && !this.tagInput && this.editingTags.length) {
        // Remove last tag on empty backspace
        this.removeTag(this.editingTags[this.editingTags.length - 1]);
      }
    },

    selectTagFromList(tag) {
      this.addTag(tag);
      this.tagPickerOpen = false;
     },

    onTagBlur() {
      // Delay so mousedown on suggestion is captured before blur closes the list
      setTimeout(() => { this.tagPickerOpen = false; }, 150);
     },

    // --- bulk tag rename ---
    openRename(tag) {
      this.renamingTag = tag;
      this.newTag = '';
      this.activeOverlay = 'rename';
    },

    closeRename() {
      this.activeOverlay = null;
    },

    doRename() {
      const oldTag = this.renamingTag.trim();
      const newTag = this.newTag.trim();
      if (!newTag) {
        window.ToastUtils.toast('New tag name is required');
        return;
      }
      const count = window.Tags.rename(this.bookmarks, oldTag, newTag);
      if (count === 0) {
        window.ToastUtils.toast(`No bookmarks found with tag "${oldTag}"`);
        this.activeOverlay = null;
        return;
      }
      if (this.activeTag === oldTag) this.activeTag = newTag;
      this.activeOverlay = null;
      window.SideEffects.saveBookmarks(this.bookmarks, this.meta);
      window.ToastUtils.toast(`Renamed "${oldTag}" → "${newTag}" (${count})`);
     },

      // Delegate — same fallback logic as the global key handler's Enter case.
    onSearchEnter() {
      this.openFocusedCard();
    },

     // --- card cursor navigation ---

    focusNextCard() {
      const n = this.flatItems.length;
      if (!n) return;
      this.focusIndex = Math.min(this.focusIndex + 1, n - 1);
     },

    focusPrevCard() {
      this.focusIndex = Math.max(this.focusIndex - 1, 0);
     },

    // Fall back to the first result when no card is focused yet.
    openFocusedCard() {
      const bm = this.focusIndex >= 0
        ? this.flatItems[this.focusIndex]
        : this.catalog.groups[0]?.items?.[0];
      if (bm) this.navigate(bm);
    },

    editFocusedCard() {
      const bm = this.flatItems[this.focusIndex];
      if (bm) this.openEdit(bm);
     },

    deleteFocusedCard() {
      const fi = this.focusIndex;
      const bm = this.flatItems[fi];
      if (!bm) return;
      if (!confirm(`Delete "${bm.label || bm.url}"?`)) return;
      this.bookmarks.splice(this.bookmarks.indexOf(bm), 1);
      this.focusIndex = fi < this.flatItems.length ? fi : -1;
      window.SideEffects.saveBookmarks(this.bookmarks, this.meta);
      window.ToastUtils.toast('Bookmark deleted');
    },

     // --- overlay helpers ---

    toggleHelp() {
      this.activeOverlay = this.activeOverlay === 'help' ? null : 'help';
     },

      // Close whatever overlay is open — only one is ever open, so this is
      // just a reset (previously a priority stack over four independent flags).
    closeAllModals() {
      this.activeOverlay = null;
      }

  },

  mounted() {
    this.focusQueryInput();
    this._keyHandler = (e) => this.onKeydown(e);
    window.addEventListener('keydown', this._keyHandler);
    },

  beforeUnmount() {
    window.removeEventListener('keydown', this._keyHandler);
     },

  template: `
        <div class="app-root">

          <aside class="index-rail">
            <div class="masthead">
              <h1 class="masthead-title">Bookmarks</h1>
              <p class="masthead-sub">A Personal Index</p>
              <div class="masthead-rule"><span class="masthead-orn">✦</span></div>
            </div>

            <div class="rail-count">
              <span class="rail-count-num">{{ catalog.total }}</span>
              <span class="rail-count-label">entries</span>
            </div>

             <nav class="tag-index">
               <p class="tag-index-title">Index</p>
               <ul class="tag-index-list">
                  <li v-for="(entry, i) in treeFlat" :key="entry.tag"
                    class="tag-index-item"
                    :class="{ 'is-active': activeTag === entry.tag, 'has-children': entry.hasChildren, 'drag-over': dragOverTag === entry.tag, 'dragging': draggingTag === entry.tag }"
                    :style="{ paddingLeft: (entry.depth > 0 ? entry.depth * 14 : 0) + 'px' }"
                    :draggable="entry.depth === 0"
                    @dragstart="onTagDragStart(entry)"
                    @dragover.prevent="onTagDragOver(entry)"
                    @drop.prevent="onTagDrop(entry)"
                    @dragend="onTagDragEnd()"
                    :title="entry.depth === 0 ? 'Drag to reorder' : ''"
                    @click="entry.hasChildren ? toggleExpand(entry.tag) : scrollToTag(entry.tag)">
                     <span class="tag-index-chev" v-text="entry.hasChildren ? (entry.expanded ? '▾' : '▸') : ''"></span>
                     <span class="tag-index-name">{{ entry.display }}</span>
                     <span class="tag-index-count">{{ entry.count }}</span>
                     <button class="tag-index-rename" title="Rename tag" @click.stop="openRename(entry.tag)">✎</button>
                  </li>
               </ul>
             </nav>

            <div class="rail-meta">
              <span>{{ catalog.total }} bookmark{{ catalog.total !== 1 ? 's' : '' }}</span>
              <span class="rail-meta-dot">·</span>
              <span>{{ catalog.groups.length }} tags</span>
            </div>

              <div class="rail-actions">
                <button class="manage-btn" @click="downloadBookmarks">↓ bookmarks.js</button>
                <button class="manage-btn manage-btn--muted" @click="resetBookmarks">Reset</button>
                  <button class="manage-btn manage-btn--muted" @click="toggleHelp" title="Keyboard shortcuts (?)" aria-label="Show keyboard shortcuts">? Keys</button>
                 <button class="manage-btn manage-btn--muted" @click="openCodeView">⧉ View</button>
              </div>

            <button class="theme-toggle" :title="'Switch to ' + (theme === 'dark' ? 'light' : 'dark') + ' mode'" @click="toggleTheme">
              {{ theme === 'dark' ? '☀' : '☾' }}
            </button>
          </aside>

          <main class="main">
            <header class="search-bar">
                 <div class="search-bar-top">
                   <span class="query-label">Search</span>
                 </div>
              <div class="action-query">
                <div class="icon-search">⌕</div>
                <input ref="query" v-model="query" @keydown.enter="onSearchEnter"
                class="query" placeholder="Search bookmarks…" autocomplete="off" />
             </div>
            </header>

            <div class="empty-state" v-if="!query && catalog.total === 0">
              <div class="empty-icon">◇</div>
              <p class="empty-title">No bookmarks yet</p>
              <p class="empty-text">Add one to begin your index.</p>
            </div>

            <div class="empty-state" v-else-if="!!query && catalog.total === 0">
              <div class="empty-icon">↝</div>
              <p class="empty-title">Nothing matches</p>
              <p class="empty-text">Try different keywords.</p>
            </div>

            <div class="tag-groups" v-else>
              <ul>
                  <li v-for="(group, i) in flatGroups" :key="group.tag"
                class="tag" :id="'group-' + i">
                 <div class="tag-content">
                   <div class="tag-head">
                     <span class="tag-number">{{ String(i + 1).padStart(2, '0') }}</span>
                       <span class="tag-name">
                         <template v-if="group.hasPath">
                           <span class="tag-path-root">{{ group.root }}</span>
                           <span class="tag-path-sep"> / </span>
                           <span class="tag-path-leaf">{{ group.leaf }}</span>
                         </template>
                         <template v-else>{{ group.tag }}</template>
                       </span>
                     <span class="tag-count">{{ group.count }}</span>
                   </div>
                   <ul>
                     <li v-for="(bm, ii) in group.items" :key="bm.url" class="item"
                           :class="{ 'is-focused': focusIndex >= 0 && focusIndex === group.flatStart + ii }">
                        <a :href="bm.url" @click.prevent="navigate(bm)" class="item-link">
                          <img v-if="faviconUrl(bm.url)" class="bm-favicon" :src="faviconUrl(bm.url)" alt="" loading="lazy" />
                           <span class="item-label">{{ bm.label || bm.url }}</span>
                        </a>
                        <p v-if="bm.note" class="bm-note">{{ bm.note }}</p>
                        <div class="item-actions">
                          <button class="item-action" title="Edit" @click="openEdit(bm)">✎</button>
                        </div>
                      </li>
                    </ul>
                 </div>
                </li>
              </ul>
            </div>

            <!-- Editor modal -->
             <div class="modal-overlay" v-if="activeOverlay === 'editor'" @click.self="closeEditor">
              <div class="modal" role="dialog" aria-modal="true" @click.stop>
                <h2 class="modal-title">{{ isNew ? 'New bookmark' : 'Edit bookmark' }}</h2>
                <div class="modal-body">
                  <label class="field">
                    <span class="field-label">Label</span>
                    <input class="field-input" v-model="editing.label" autocomplete="off" />
                  </label>
                  <label class="field">
                    <span class="field-label">URL</span>
                     <input ref="urlInput" class="field-input" v-model="editing.url" placeholder="https://…        (%s = search term)" autocomplete="off" />
                  </label>
                  <!-- Tag picker -->
                  <div class="field">
                    <span class="field-label">Tags <em>(click to select, / for hierarchy)</em></span>
                    <div class="tag-picker">
                      <div class="tag-picker-chips" @click="tagPickerOpen = true">
                        <template v-for="tag in editingTags" :key="tag">
                          <span class="tag-chip">
                            {{ tag }}
                            <button type="button" class="tag-chip-remove" @click.stop="removeTag(tag)">×</button>
                          </span>
                        </template>
                      </div>
                       <input
                        class="field-input" ref="tagInput"
                        v-model="tagInput"
                         @keydown="onTagKeydown"
                         @focus="tagPickerOpen = true"
                         @blur="onTagBlur"
                        placeholder="Add tag or select from existing…"
                        autocomplete="off" />
                      <!-- Suggestions dropdown -->
                      <ul class="tag-suggestions" v-if="tagPickerOpen && tagSuggestions.length">
                        <li v-for="tag in tagSuggestions" :key="tag"
                            class="tag-suggestion"
                            @mousedown.prevent="selectTagFromList(tag)">
                          {{ tag }}
                        </li>
                      </ul>
                    </div>
                  </div>
                  <label class="field">
                    <span class="field-label">Keywords <em>(comma separated)</em></span>
                    <input class="field-input" v-model="editing.keywords" placeholder="cg, chatgpt" autocomplete="off" />
                  </label>
                  <label class="field">
                    <span class="field-label">Note</span>
                    <textarea class="field-input field-textarea" v-model="editing.note" rows="3" placeholder="Optional note"></textarea>
                  </label>
                </div>
                <div class="modal-actions">
                   <button v-if="!isNew" class="modal-btn modal-btn--danger" @click="deleteEditingBookmark">Delete</button>
                  <button class="modal-btn modal-btn--muted" @click="closeEditor">Cancel</button>
                  <button class="modal-btn modal-btn--primary" @click="saveEdit">Save</button>
                </div>
              </div>
            </div>

            <!-- Rename tag modal -->
             <div class="modal-overlay" v-if="activeOverlay === 'rename'" @click.self="closeRename">
              <div class="modal" role="dialog" aria-modal="true" @click.stop>
                <h2 class="modal-title">Rename tag</h2>
                <div class="modal-body">
                  <label class="field">
                    <span class="field-label">Current tag</span>
                    <input class="field-input" v-model="renamingTag" autocomplete="off" />
                  </label>
                  <label class="field">
                    <span class="field-label">New tag name</span>
                    <input class="field-input" v-model="newTag" @keyup.enter="doRename" placeholder="Enter new tag…" autocomplete="off" />
                  </label>
                  <p class="rename-hint" v-if="renamingTag">
                    {{ renameCount }} bookmark{{ renameCount !== 1 ? 's' : '' }} with this tag will be updated.
                  </p>
                </div>
                <div class="modal-actions">
                  <button class="modal-btn modal-btn--muted" @click="closeRename">Cancel</button>
                  <button class="modal-btn modal-btn--primary" @click="doRename" :disabled="!newTag.trim() || newTag.trim() === (renamingTag || '').trim()">Rename</button>
                </div>
              </div>
            </div>
               <!-- Keyboard shortcuts overlay -->
                <div class="modal-overlay" v-if="activeOverlay === 'help'" @click.self="activeOverlay = null">
                 <div class="modal" role="dialog" aria-modal="true" @click.stop>
                   <h2 class="modal-title">Keyboard shortcuts</h2>
                   <div class="modal-body">
                     <dl class="shortcut-list">
                       <div class="shortcut-row">
                         <span class="shortcut-keys"><kbd>/</kbd></span>
                         <span class="shortcut-desc">Focus search</span>
                       </div>
                       <div class="shortcut-row">
                         <span class="shortcut-keys"><kbd>j</kbd> · <kbd>↓</kbd></span>
                         <span class="shortcut-desc">Next result</span>
                       </div>
                       <div class="shortcut-row">
                         <span class="shortcut-keys"><kbd>k</kbd> · <kbd>↑</kbd></span>
                         <span class="shortcut-desc">Previous result</span>
                       </div>
                       <div class="shortcut-row">
                         <span class="shortcut-keys"><kbd>Enter</kbd></span>
                         <span class="shortcut-desc">Open focused</span>
                       </div>
                       <div class="shortcut-row">
                         <span class="shortcut-keys"><kbd>n</kbd></span>
                         <span class="shortcut-desc">New bookmark</span>
                       </div>
                       <div class="shortcut-row">
                         <span class="shortcut-keys"><kbd>t</kbd></span>
                         <span class="shortcut-desc">Toggle dark / light</span>
                       </div>
                       <div class="shortcut-row">
                         <span class="shortcut-keys"><kbd>⌘</kbd> / <kbd>Ctrl</kbd> + <kbd>e</kbd></span>
                         <span class="shortcut-desc">Edit focused</span>
                       </div>
                       <div class="shortcut-row">
                         <span class="shortcut-keys"><kbd>⌘</kbd> / <kbd>Ctrl</kbd> + <kbd>⌫</kbd></span>
                         <span class="shortcut-desc">Delete focused</span>
                       </div>
                       <div class="shortcut-row">
                         <span class="shortcut-keys"><kbd>Esc</kbd></span>
                         <span class="shortcut-desc">Close any dialog</span>
                       </div>
                       <div class="shortcut-row">
                         <span class="shortcut-keys"><kbd>?</kbd></span>
                         <span class="shortcut-desc">Show this panel</span>
                       </div>
                     </dl>
                     <p class="rename-hint">Press <kbd>?</kbd> at any time to open this panel.</p>
                   </div>
                   <div class="modal-actions">
                      <button class="modal-btn modal-btn--muted" @click="activeOverlay = null">Close</button>
                   </div>
                 </div>
               </div>

                <!-- Code view modal -->
                 <div class="modal-overlay" v-if="activeOverlay === 'code'" @click.self="closeCodeView">
                  <div class="modal modal--code" role="dialog" aria-modal="true" @click.stop>
                    <h2 class="modal-title">bookmarks.js</h2>
                    <div class="modal-body">
                      <pre class="code-view"><code>{{ codeViewText }}</code></pre>
                    </div>
                    <div class="modal-actions">
                      <button class="modal-btn" @click="copyCodeView">Copy</button>
                      <button class="modal-btn manage-btn--muted" @click="closeCodeView">Close</button>
                      <button class="modal-btn modal-btn--primary" @click="downloadBookmarks; closeCodeView()">Download</button>
                    </div>
                  </div>
                </div>

          </main>

           <button class="fab" type="button" @click="addBookmark"
             title="New bookmark (press n)" aria-label="New bookmark">
             +
           </button>
        </div>
    `
};
