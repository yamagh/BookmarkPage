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
      // editor modal state
      showEditor: false,
      isNew: false,
      editingIndex: -1,
      editing: { label: '', url: '', tags: '', keywords: '', note: '' }
       };
    },

  computed: {
    catalog() {
      return window.Catalog.index(this.bookmarks, this.query);
      },
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
      this.showEditor = true;
       },

    closeEditor() {
      this.showEditor = false;
       },

    saveEdit() {
      const e = this.editing;
      const label = e.label.trim();
      const url = e.url.trim();
      if (!label || !url) {
        window.ToastUtils.toast('Label and URL are required');
        return;
         }
      const bm = {
        label,
        url,
        tags: this.toList(e.tags),
        keywords: this.toList(e.keywords),
        note: e.note.trim()
          };
      if (this.isNew) this.bookmarks.push(bm);
       else this.bookmarks.splice(this.editingIndex, 1, bm);
      this.showEditor = false;
      window.SideEffects.saveBookmarks(this.bookmarks);
      window.ToastUtils.toast(this.isNew ? 'Bookmark added' : 'Bookmark saved');
       },

    addBookmark() {
      this.openEdit(null);
       },

    deleteBookmark(bookmark) {
      const index = this.bookmarks.indexOf(bookmark);
      if (index < 0) return;
      if (!confirm(`Delete "${bookmark.label}"?`)) return;
      this.bookmarks.splice(index, 1);
      window.SideEffects.saveBookmarks(this.bookmarks);
      window.ToastUtils.toast('Bookmark deleted');
       },

    downloadBookmarks() {
       // Export the current list to a re-loadable bookmarks.js data file.
      const content = window.BookmarkUtils.serializeBookmarks(this.bookmarks);
      window.SideEffects.downloadFile('bookmarks.js', content, 'text/javascript');
     },

    resetBookmarks() {
      if (!confirm('Reset to the original bookmarks? Your saved edits will be cleared.')) return;
      this.bookmarks = window.BookmarkUtils.cloneBookmarks(this.originalBookmarks);
      window.SideEffects.saveBookmarks(this.bookmarks);
      window.ToastUtils.toast('Reset to original');
       },

    toList(value) {
      return String(value || '').split(',').map(s => s.trim()).filter(Boolean);
       }
     },

  mounted() {
    this.focusQueryInput();
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
               <li v-for="(entry, i) in catalog.groups" :key="entry.tag"
                class="tag-index-item" :class="{ 'is-active': activeTag === entry.tag }"
                @click="scrollToTag(entry.tag)">
                <span class="tag-index-name">{{ entry.tag }}</span>
                <span class="tag-index-count">{{ entry.count }}</span>
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
             </div>

           <button class="theme-toggle" :title="'Switch to ' + (theme === 'dark' ? 'light' : 'dark') + ' mode'" @click="toggleTheme">
             {{ theme === 'dark' ? '☀' : '☾' }}
           </button>
         </aside>

         <main class="main">
           <header class="search-bar">
                <div class="search-bar-top">
                  <span class="query-label">Search</span>
                  <button class="manage-btn" @click="addBookmark">+ New</button>
                </div>
             <div class="action-query">
               <div class="icon-search">⌕</div>
               <input ref="query" v-model="query" @keydown.enter="goToFirstBookmark"
                class="query" placeholder="Search bookmarks…" autocomplete="off" />
            </div>
           </header>

           <div class="results-line" v-if="!!query">
             <span class="results-count">{{ catalog.total }}</span>
             <span class="results-label">result{{ catalog.total !== 1 ? 's' : '' }} for "{{ query }}"</span>
           </div>

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
               <li v-for="(group, i) in catalog.groups" :key="group.tag"
                class="tag" :id="'group-' + i">
                <div class="tag-content">
                  <div class="tag-head">
                    <span class="tag-number">{{ String(i + 1).padStart(2, '0') }}</span>
                    <span class="tag-name">{{ group.tag }}</span>
                    <span class="tag-count">{{ group.count }}</span>
                  </div>
                  <ul>
                    <li v-for="bm in group.items" :key="bm.url" class="item">
                       <a :href="bm.url" @click.prevent="navigate(bm)" class="item-link">
                         <img v-if="faviconUrl(bm.url)" class="bm-favicon" :src="faviconUrl(bm.url)" alt="" loading="lazy" />
                         <span class="item-label">{{ bm.label }}</span>
                       </a>
                       <p v-if="bm.note" class="bm-note">{{ bm.note }}</p>
                       <div class="item-actions">
                         <button class="item-action" title="Edit" @click="openEdit(bm)">✎</button>
                         <button class="item-action item-action--danger" title="Delete" @click="deleteBookmark(bm)">✕</button>
                       </div>
                     </li>
                   </ul>
                </div>
               </li>
             </ul>
           </div>

           <!-- Editor modal -->
           <div class="modal-overlay" v-if="showEditor" @click.self="closeEditor">
             <div class="modal" role="dialog" aria-modal="true" @click.stop>
               <h2 class="modal-title">{{ isNew ? 'New bookmark' : 'Edit bookmark' }}</h2>
               <div class="modal-body">
                 <label class="field">
                   <span class="field-label">Label</span>
                   <input class="field-input" v-model="editing.label" autocomplete="off" />
                 </label>
                 <label class="field">
                   <span class="field-label">URL</span>
                   <input class="field-input" v-model="editing.url" placeholder="https://…      (%s = search term)" autocomplete="off" />
                 </label>
                 <label class="field">
                   <span class="field-label">Tags <em>(comma separated)</em></span>
                   <input class="field-input" v-model="editing.tags" placeholder="🧰 Tools, 🌍 Web" autocomplete="off" />
                 </label>
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
                 <button class="modal-btn modal-btn--muted" @click="closeEditor">Cancel</button>
                 <button class="modal-btn modal-btn--primary" @click="saveEdit">Save</button>
               </div>
             </div>
           </div>
         </main>
       </div>
    `
};
