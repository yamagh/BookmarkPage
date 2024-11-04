const BookmarkApp = {
  app: Vue.createApp({
    data() {
      return {
        query: "",
        bookmarks: bookmarks
      };
    },
    computed: {
      filteredBookmarks() {
        const query = this.query.toLowerCase();
        if (!this.bookmarks) return [];
        return Object.entries(this.bookmarks).filter(([name, bookmark]) => {
          return (
            name.toLowerCase().includes(query) ||
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
      groupBookmarksByTag(bookmarks) {
        const grouped = {};
        for (const [name, bookmark] of bookmarks) {
          for (const tag of bookmark.tags) {
            if (!grouped[tag]) {
              grouped[tag] = {};
            }
            grouped[tag][name] = bookmark;
          }
        }
        return grouped;
      },
      goToFirstBookmark() {
        const firstTagGroup = Object.values(this.sortedGroupedBookmarks)[0];
        const firstBookmark = firstTagGroup ? Object.values(firstTagGroup)[0] : null;
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
        <div class="action-right"></div>
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
                <li v-for="(bookmark, name) in group" :key="name" class="item">
                  <a :href="bookmark.url" @click.prevent="navigate(bookmark)"
                    >{{ bookmark.label || name }}</a
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
