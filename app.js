const bookmarks = {
  "ChatGPT": {
    "url": "https://chat.openai.com/chat",
    "tags": ["🧰 Tools"],
    "keywords": ["cg"]
  },
  "Google": {
    "url": "https://www.google.com/search?q=%s",
    "tags": ["🔍 Search", "🌍 Web"],
    "keywords": ["gg", "search"]
  },
  "Wikipedia": {
    "url": "https://en.wikipedia.org/wiki/%s",
    "tags": ["📚 Education", "🌍 Web"],
    "keywords": ["wiki", "education"]
  },
  "GitHub": {
    "url": "https://github.com/",
    "tags": ["👨‍💻 Development", "📦 Tools"],
    "keywords": ["gh", "code"]
  },
  "Twitter": {
    "url": "https://twitter.com/home",
    "tags": ["🧑 SNS"],
    "keywords": ["twitter", "social"]
  }
};

const app = Vue.createApp({
  data() {
    return {
      query: "",
      bookmarks: bookmarks
    };
  },
  computed: {
    filteredBookmarks() {
      const query = this.query.toLowerCase();
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
      const url = bookmark.url.includes("%s")
        ? bookmark.url.replace("%s", this.query)
        : bookmark.url;
      window.location.href = url;
    },
    promptForParameter(bookmark) {
      const parameter = prompt("Enter a value:");
      if (parameter) {
        const url = bookmark.url.replace("%s", parameter);
        window.location.href = url;
      }
    }
  }
});

app.mount("#app");
