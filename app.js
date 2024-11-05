const BookmarkApp = {
  app: Vue.createApp({
    data() {
      return {
        query: "",
        bookmarks: this.normalizeBookmarks(bookmarks)
      };
    },
    computed: {
      filteredBookmarks() {
        const queryParts = this.query.toLowerCase().split(" ");
        if (!this.bookmarks) return [];
        return this.bookmarks.filter(bookmark => {
          return queryParts.every(query => 
            bookmark.label.toLowerCase().includes(query) ||
            bookmark.tags.some(tag => tag.toLowerCase().includes(query)) ||
            bookmark.keywords.some(keyword => keyword.toLowerCase().includes(query))
          );
        });
      },
      sortedGroupedBookmarks() {
        const grouped = this.groupBookmarksByTag(this.filteredBookmarks);
        const sorted = {};
        Object.keys(grouped)
          .sort()
          .forEach(tag => {
            sorted[tag] = grouped[tag];
          });
        return sorted;
      }
    },
    methods: {
      normalizeBookmarks(bookmarks) {
        return bookmarks.map(bookmark => {
          if (typeof bookmark.keywords === 'string') {
            bookmark.keywords = [bookmark.keywords];
          }
          if (typeof bookmark.tags === 'string') {
            bookmark.tags = [bookmark.tags];
          }
          return bookmark;
        });
      },
      groupBookmarksByTag(bookmarks) {
        const grouped = {};
        for (const bookmark of bookmarks) {
          for (const tag of bookmark.tags) {
            if (!grouped[tag]) {
              grouped[tag] = [];
            }
            grouped[tag].push(bookmark);
          }
        }
        return grouped;
      },
      goToFirstBookmark() {
        const firstTagGroup = Object.values(this.sortedGroupedBookmarks)[0];
        const firstBookmark = firstTagGroup ? firstTagGroup[0] : null;
        if (firstBookmark) {
          this.navigate(firstBookmark);
        }
      },
      navigate(bookmark) {
        if (bookmark.url.includes("%s")) {
          this.promptForParameter(bookmark);
        } else {
          window.location.href = bookmark.url;
        }
      },
      promptForParameter(bookmark) {
        const parameter = prompt("Enter a value:");
        if (parameter) {
          const url = bookmark.url.replace("%s", parameter);
          window.location.href = url;
        }
      },
      focusQueryInput() {
        this.$refs.query.focus();
      },
      async fetchAndSetBackgroundImage() {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        const seed = `${year}${month}${day}`;
        const imageUrl = `https://picsum.photos/seed/${seed}/720/480.webp?blur=10`;
        const response = await fetch(imageUrl);
        const blob = await response.blob();
        const objectURL = URL.createObjectURL(blob);
        document.body.style.backgroundImage = `url(${objectURL})`;
        document.body.style.backgroundSize = 'cover';
        document.body.style.height = '100vh';
      },
      createBookmarklet() {
        const code = `
          (function() {
            const pageInfo = {
              label: document.title,
              url: window.location.href,
              tags: "",
              keywords: ""
            };
            const json = JSON.stringify(pageInfo, null, 2);
            const textarea = document.createElement('textarea');
            textarea.value = json + ',';
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
            alert('Page info copied to clipboard');
          })();
        `;
        return `javascript:${encodeURIComponent(code)}`;
      },
      copyToClipboard(text) {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
    },
    mounted() {
      this.focusQueryInput();
      this.fetchAndSetBackgroundImage();
    },
    template: `
      <div class="action-bar">
        <div class="action-left"></div>
        <div class="action-center">
          <div class="action-query">
            <div class="icon-search">🔍</div>
            <input
              ref="query"
              v-model="query"
              @keydown.enter="goToFirstBookmark"
              class="query"
            />
          </div>
        </div>
        <div class="action-right">
          <a :href="createBookmarklet()" title="Drag and drop to browser bookmark bar." class="bookarklet">🔖</a>
        </div>
      </div>
      <div class="tag-groups">
        <ul>
          <li
            v-for="(group, tag) in sortedGroupedBookmarks"
            :key="tag"
            class="tag"
          >
            <div class="tag-content">
              <div class="tag-name">{{ tag }}</div>
              <ul>
                <li v-for="bookmark in group" :key="bookmark.label" class="item">
                  <a :href="bookmark.url" @click.prevent="navigate(bookmark)"
                    >{{ bookmark.label }}</a
                  >
                  <template v-if="bookmark.url.includes('%s')">
                    <span style="display: none">
                      <button @click="promptForParameter(bookmark)">Go</button>
                    </span>
                  </template>
                </li>
              </ul>
            </div>
          </li>
        </ul>
      </div>
    `
  }),

  createApp(element) {
    if (!element) {
      element = document.createElement('div');
      element.id = 'bookmark-app';
      document.body.appendChild(element);
    }
    this.app.mount(element);
  }
};
