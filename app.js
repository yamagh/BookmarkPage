const BookmarkApp = {
  app: Vue.createApp({
    data() {
      return {
        query: "",
        bookmarks: bookmarks,
        buttonGroup: [1, 2, 3, 4]
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
        const firstBookmark = this.filteredBookmarks[0];
        if (firstBookmark) {
          this.navigate(firstBookmark[1]);
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
      handleButtonClick(buttonLabel) {
        console.log(`Button ${buttonLabel} clicked`);
      }
    },
    mounted() {
      this.focusQueryInput();
    },
    template: `
      <div class="query-container">
        <input
          ref="query"
          v-model="query"
          @keydown.enter="goToFirstBookmark"
          class="query"
        />
      </div>
      <div class="button-group">
        <button
          v-for="button in buttonGroup"
          :key="button"
          @click="handleButtonClick(button)"
        >
          {{ button }}
        </button>
      </div>
      <div class="tag-groups">
        <ul>
          <li
            v-for="(group, tag) in sortedGroupedBookmarks"
            :key="tag"
            class="tag-group"
          >
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
