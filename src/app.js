/**
 * Vue component definition for the bookmark manager.
 * Relies on window.BookmarkUtils, window.Catalog, and window.SideEffects —
 * all exposed as globals via script load order.
 */
// Keyboard action → component method name.  Hoisted above the component so
// onKeydown stays a 5-line delegate and the mapping is trivially readable.
// Each value is the bare method name; onKeydown calls this[name]().
const _keyDispatch = Object.freeze({
  close:   'closeAllModals',
  search:  'focusQueryInput',
  new:     'addBookmark',
  theme:   'toggleTheme',
  help:    'toggleHelp',
  next:    'focusNextCard',
  prev:    'focusPrevCard',
  open:    'openFocusedCard',
  edit:    'editFocusedCard',
  delete:  'deleteFocusedCard',
  });

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
             // 'editor' | 'settings' | 'code' | 'help' | 'menu'; null = none.
           // Per-overlay payloads follow (editing / tagSettings / codeViewText).
      activeOverlay: null,
       // editor payload
      isNew: false,
      editingIndex: -1,
      editing: { label: '', url: '', tags: '', keywords: '', note: '' },
      expandedTags: {},
       // tag picker state
      tagInput: '',
      tagPickerOpen: false,
      tagSuggestionIndex: -1,
          // tag settings payload: the extensible per-tag form. Add a key here for
          // each new setting, then wire it through openTagSettings / saveTagSettings.
        activeTagSettings: '',
        tagSettings: { name: '', keywords: '' },
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
      return window.Catalog.index(
        this.bookmarks, this.query,
        this.meta ? this.meta.tagOrder : undefined,
        this.meta ? this.meta.tagKeywords : undefined
        );
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


    affectedTagCount() {
      if (!this.activeTagSettings) return 0;
      return this.bookmarks.filter(bm => (bm.tags || []).includes(this.activeTagSettings)).length;
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
    // Reset the suggestion highlight whenever the typed text changes so the
    // arrow-highlighted row matches what's on screen, and keep the highlighted row
    // scrolled into view as the user arrows through the list.
    tagInput() {
      this.tagSuggestionIndex = -1;
     },
    tagSuggestionIndex(val) {
      this.$nextTick(() => {
        const rows = this.$refs.tagSuggestions;
        if (val >= 0 && Array.isArray(rows)) rows[val]?.scrollIntoView({ block: 'nearest' });
       });
     },
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
          const next = window.Tags.reorder(topOrder, from, target.tag);
          if (next === topOrder) return;
          this.meta.tagOrder = next;
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

      // Global keydown router — all guard logic and the routing table live in
        // Keyboard.route; this thin entry point just dispatches the resulting
        // action.  Escape is not suppressed so the browser's native close
        // gesture is preserved; every other action calls preventDefault.
    onKeydown(e) {
       const action = window.Keyboard.route(e, {
          isTyping:  window.Keyboard.isTyping(e.target),
          overlay:   this.activeOverlay,
       });
      if (!action) return;
      if (action !== 'close') e.preventDefault();
      this[_keyDispatch[action]]();
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
      window.SideEffects.copyText(this.codeViewText, 'Copied');
     },

    resetBookmarks() {
      if (!confirm('Reset to the original bookmarks? Your saved edits will be cleared.')) return false;
      this.bookmarks = window.BookmarkUtils.cloneBookmarks(this.originalBookmarks);
      window.SideEffects.saveBookmarks(this.bookmarks, this.meta);
      window.ToastUtils.toast('Reset to original');
      return true;
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
      const sug = this.tagSuggestions;
      if (e.key === 'ArrowDown') {
        // Highlight the next suggestion; from 'none', start at the first.
        e.preventDefault();
        this.tagPickerOpen = true;
        if (!sug.length) return;
        this.tagSuggestionIndex = this.tagSuggestionIndex < 0
          ? 0
          : Math.min(this.tagSuggestionIndex + 1, sug.length - 1);
      } else if (e.key === 'ArrowUp') {
        // Highlight the previous suggestion; from 'none', start at the last.
        e.preventDefault();
        this.tagPickerOpen = true;
        if (!sug.length) return;
        this.tagSuggestionIndex = this.tagSuggestionIndex < 0
          ? sug.length - 1
          : Math.max(this.tagSuggestionIndex - 1, 0);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        // Prefer the highlighted suggestion; fall back to the typed text.
        if (this.tagSuggestionIndex >= 0 && sug.length) {
          this.selectTagFromList(sug[this.tagSuggestionIndex]);
        } else {
          this.addTag(this.tagInput);
        }
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

      // --- tag settings: rename + per-tag keyword configuration in one modal ---
      // openTagSettings loads a tag's entry into the `tagSettings` form,
      // saveTagSettings writes it back. Add a new setting by extending the
      // form here, rendering a `.field` below, and reading it back in saveTagSettings.
    openTagSettings(tag) {
      const entry = (this.meta.tagKeywords || []).find(o => o.name === tag);
      this.activeTagSettings = tag;
      this.tagSettings = { name: tag, keywords: (entry ? entry.keywords : []).join(', ') };
      this.activeOverlay = 'settings';
      this.$nextTick(() => {
        if (this.$refs.tagSettingsName) this.$refs.tagSettingsName.focus();
        });
      },
    closeTagSettings() {
      this.activeOverlay = null;
      },
    saveTagSettings() {
      const original = this.activeTagSettings;
      const newName = this.tagSettings.name.trim();
      if (!newName) {
        window.ToastUtils.toast('Tag name is required');
        return;
        }
        // Rename the tag across every bookmark (a no-op when the name is unchanged).
      if (newName !== original) {
        window.Tags.rename(this.bookmarks, original, newName);
        if (this.activeTag === original) this.activeTag = newName;
        }
        // Persist (or drop) this tag's keyword entry, keyed by the new name.
      const keywords = window.BookmarkUtils.toList(this.tagSettings.keywords);
      const list = this.meta.tagKeywords;
      const idx = list.findIndex(o => o.name === original);
      if (keywords.length) {
        if (idx >= 0) list.splice(idx, 1, { name: newName, keywords });
        else list.push({ name: newName, keywords });
        } else if (idx >= 0) {
        list.splice(idx, 1);
        }
      window.SideEffects.saveBookmarks(this.bookmarks, this.meta);
      this.activeOverlay = null;
      window.ToastUtils.toast('Tag settings saved');
      },
      // Unassign a tag from every bookmark and drop its keyword entry.
    deleteTagSettings() {
      const tag = this.activeTagSettings;
      const count = window.Tags.rename(this.bookmarks, tag, '');
      const list = this.meta.tagKeywords;
      const idx = list.findIndex(o => o.name === tag);
      if (idx >= 0) list.splice(idx, 1);
      this.activeOverlay = null;
      window.SideEffects.saveBookmarks(this.bookmarks, this.meta);
      window.ToastUtils.toast(`Unassigned "${tag}" from ${count} bookmark${count === 1 ? '' : 's'}`);
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

           // --- manage menu: the rail's secondary actions behind one trigger ---
         openMenu() {
           this.activeOverlay = 'menu';
            },

         menuOpenHelp() {
           this.activeOverlay = 'help';
            },

         menuOpenCode() {
           this.openCodeView();
            },

         menuDownload() {
           this.downloadBookmarks();
           this.activeOverlay = null;
            },

         menuReset() {
            // Keep the menu open when the user cancels the confirm; close on success.
            this.activeOverlay = this.resetBookmarks() ? null : 'menu';
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
                       <button class="tag-index-settings" title="Tag settings" @click.stop="openTagSettings(entry.tag)">⚙</button>
                  </li>
               </ul>
             </nav>

            <div class="rail-meta">
              <span>{{ catalog.total }} bookmark{{ catalog.total !== 1 ? 's' : '' }}</span>
              <span class="rail-meta-dot">·</span>
              <span>{{ catalog.groups.length }} tags</span>
            </div>

                <div class="rail-actions">
                   <button class="rail-more" @click="openMenu" title="Manage: view, export, reset, shortcuts" aria-label="Manage bookmark actions">
                       <span class="rail-more-icon">⋯</span>
                      Manage
                   </button>
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
                     <span class="field-label">Tags <em>(↑↓ to select, / for hierarchy)</em></span>
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
                         <li v-for="(tag, i) in tagSuggestions" :key="tag"
                            ref="tagSuggestions"
                            class="tag-suggestion"
                            :class="{ 'is-focused': i === tagSuggestionIndex }"
                            @mousedown.prevent="selectTagFromList(tag)"
                            @mousemove="tagSuggestionIndex = i">
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

                <!-- Tag settings modal — the extensible per-tag settings surface.
                 Opened from each index row's gear button; currently handles rename
                 and keyword configuration. To add a setting later: add a key to the
                 tagSettings form, render a new .field inside the SETTINGS FIELDS
                 markers, and read it back in saveTagSettings. -->
              <div class="modal-overlay" v-if="activeOverlay === 'settings'" @click.self="closeTagSettings">
                <div class="modal" role="dialog" aria-modal="true" @click.stop>
                  <h2 class="modal-title">Tag settings</h2>
                  <div class="modal-body">
                    <!-- SETTINGS FIELDS -->
                    <label class="field">
                      <span class="field-label">Tag name</span>
                      <input ref="tagSettingsName" class="field-input" v-model="tagSettings.name"
                        @keyup.enter="saveTagSettings" placeholder="Tag name…" autocomplete="off" />
                    </label>
                    <label class="field">
                      <span class="field-label">Keywords <em>(comma separated — abbreviations, other languages)</em></span>
                      <input class="field-input" v-model="tagSettings.keywords"
                        placeholder="cxl, 取消 · english, 英" autocomplete="off" />
                    </label>
                    <!-- /SETTINGS FIELDS -->
                    <p class="rename-hint" v-if="activeTagSettings">
                      {{ affectedTagCount }} bookmark{{ affectedTagCount !== 1 ? 's' : '' }} carry this tag.
                    </p>
                  </div>
                  <div class="modal-actions">
                    <button v-if="affectedTagCount > 0" class="modal-btn modal-btn--danger" @click="deleteTagSettings">Unassign</button>
                    <button class="modal-btn modal-btn--muted" @click="closeTagSettings">Cancel</button>
                    <button class="modal-btn modal-btn--primary" :disabled="!tagSettings.name.trim()" @click="saveTagSettings">Save</button>
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

                    <!-- Manage menu modal — the rail's secondary actions, one trigger -->
                    <div class="modal-overlay" v-if="activeOverlay === 'menu'" @click.self="closeAllModals">
                     <div class="modal modal--menu" role="dialog" aria-modal="true" @click.stop>
                       <h2 class="modal-title">Manage</h2>
                       <div class="modal-menu">
                         <button class="modal-menu-item" @click="menuOpenCode">
                           <span class="modal-menu-icon">⧉</span>
                           <span class="modal-menu-text">
                             <span class="modal-menu-label">View bookmarks.js</span>
                             <span class="modal-menu-hint">Inspect the raw data file</span>
                           </span>
                         </button>
                         <button class="modal-menu-item" @click="menuDownload">
                           <span class="modal-menu-icon">↓</span>
                           <span class="modal-menu-text">
                             <span class="modal-menu-label">Download bookmarks.js</span>
                             <span class="modal-menu-hint">Export a re-loadable copy</span>
                           </span>
                         </button>
                         <button class="modal-menu-item" @click="menuOpenHelp">
                           <span class="modal-menu-icon">?</span>
                           <span class="modal-menu-text">
                             <span class="modal-menu-label">Keyboard shortcuts</span>
                             <span class="modal-menu-hint">Show the shortcut list</span>
                           </span>
                         </button>
                         <button class="modal-menu-item modal-menu-item--danger" @click="menuReset">
                           <span class="modal-menu-icon">↺</span>
                           <span class="modal-menu-text">
                             <span class="modal-menu-label">Reset to original</span>
                             <span class="modal-menu-hint">Discard saved edits</span>
                           </span>
                         </button>
                       </div>
                       <div class="modal-actions">
                         <button class="modal-btn modal-btn--muted" @click="closeAllModals">Close</button>
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
