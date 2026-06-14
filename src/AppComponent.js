/**
 * Vue component definition for the bookmark manager.
 * Relies on window.BookmarkUtils, window.NavigationService,
 * window.ClipboardService — all exposed as globals via script load order.
 */
window.AppComponent = {
  data() {
    return {
      query: '',
      theme: window.ThemeManager.get(),
      bookmarks: window.BookmarkUtils.normalizeBookmarks(bookmarks)
     };
   },

  computed: {
    filteredBookmarks() {
      const q = this.query.trim().toLowerCase();
      if (!q) return this.bookmarks;
      const parts = q.split(/\s+/);
      return this.bookmarks.filter(bm => {
        return parts.every(part =>
          bm.label.toLowerCase().includes(part) ||
          bm.tags.some(t => t.toLowerCase().includes(part)) ||
          bm.keywords.some(kw => kw.toLowerCase().includes(part))
           );
         });
     },

    sortedGroupedBookmarks() {
      const grouped = window.BookmarkUtils.groupBookmarksByTag(this.filteredBookmarks);
      const sorted = {};
      Object.keys(grouped)
        .sort((a, b) => a.localeCompare(b))
        .forEach(tag => { sorted[tag] = grouped[tag]; });
      return sorted;
     },

    totalCount() {
      return Object.values(this.sortedGroupedBookmarks)
         .flat().length;
     }
   },

  methods: {
    toggleTheme() {
      const next = this.theme === 'dark' ? 'light' : 'dark';
      this.theme = next;
      window.ThemeManager.set(next);
     },

    navigate(bookmark) {
      window.NavigationService.navigate(bookmark);
     },

    goToFirstBookmark() {
      const groups = Object.values(this.sortedGroupedBookmarks);
      if (groups[0]?.[0]) this.navigate(groups[0][0]);
     },

    focusQueryInput() {
      this.$refs.query?.focus();
     },

    copyBookmarksToClipboard() {
      window.ClipboardService.copyBookmarksToClipboard(this.bookmarks);
     },

    faviconUrl(url) {
      return window.BookmarkUtils.faviconUrl(url);
     }
   },

  mounted() {
    this.focusQueryInput();
   },

  template: `
     <div class="app-root">

       <!-- Header -->
       <header class="action-bar">
          <button class="theme-toggle" :title="'Switch to ' + (theme === 'dark' ? 'light' : 'dark') + ' mode'" @click="toggleTheme">
             {{ theme === 'dark' ? '☀' : '☾' }}
          </button>
          <div class="action-center">
             <div class="action-query">
                 <div class="icon-search">⌕</div>
                 <input ref="query" v-model="query" @keydown.enter="goToFirstBookmark"
                     class="query" placeholder="Search bookmarks…" autocomplete="off" />
              </div>
          </div>
       </header>

       <!-- Results counter -->
       <div class="results-line" v-if="!!query">
          <span class="results-count">{{ totalCount }}</span>
          <span class="results-label">result{{ totalCount !== 1 ? 's' : '' }} for "{{ query }}"</span>
       </div>

       <!-- Empty: no bookmarks -->
       <div class="empty-state" v-if="!query && totalCount === 0">
          <div class="empty-icon">◇</div>
          <p class="empty-text">No bookmarks yet. Add some to get started.</p>
       </div>

       <!-- Empty: no results -->
       <div class="empty-state" v-else-if="!!query && totalCount === 0">
          <div class="empty-icon">◇</div>
          <p class="empty-text">Nothing matches. Try different keywords.</p>
       </div>

       <!-- Bookmark grid -->
       <div class="tag-groups" v-else>
          <ul>
             <li v-for="(group, tag) in sortedGroupedBookmarks" :key="tag" class="tag">
               <div class="tag-content">
                  <div class="tag-name">{{ tag }} — {{ group.length }}</div>
                  <ul>
                    <li v-for="bm in group" :key="bm.url" class="item">
                      <a :href="bm.url" @click.prevent="navigate(bm)">
                        <img v-if="faviconUrl(bm.url)" class="bm-favicon" :src="faviconUrl(bm.url)" alt="" loading="lazy" />
                        {{ bm.label }}
                      </a>
                    </li>
                  </ul>
               </div>
             </li>
          </ul>
       </div>

     </div>
   `
};
