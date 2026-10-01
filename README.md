# Bookmark Search Application

This is a simple web app that allows you to search through a list of bookmarks using keywords or bookmark names. The app uses the Vue.js framework to implement the search functionality and display the results.

## Prerequisites

To run this application, you need to have the following installed on your system:

- [Vue.js](https://vuejs.org/)

## Installation

1. Clone the repository to your local machine:

    ```bash
    git clone https://github.com/example/bookmark-search-app.git
    ```

2. Navigate to the project directory:

    ```bash
    cd bookmark-search-app
    ```

3. Open the bookmarks.html file in your web browser.

## Usage

To use the app, simply start typing in the search box at the top of the page. The app will filter the list of bookmarks in real time based on your input.

You can also navigate to a bookmark by clicking on its name in the list. If the bookmark's URL includes the string "%s", you will be prompted to enter a value for the parameter before being taken to the URL.

### Sample Bookmarks

The application comes with a sample set of bookmarks, which are defined in the following format:

```js
const bookmarks = [
  {
    "label": "ChatGPT",
    "url": "https://chat.openai.com/chat",
    "tags": ["🧰 Tools"],
    "keywords": ["cg"]
  },
  {
    "label": "Google Search",
    "url": "https://www.google.com/search?q=%s",
    "tags": ["🔍 Search", "🌍 Web"],
    "keywords": ["gg", "search"]
  },
  {
    "label": "Wikipedia",
    "url": "https://en.wikipedia.org/wiki/%s",
    "tags": ["📚 Education", "🌍 Web"],
    "keywords": ["wiki", "education"]
  },
  {
    "label": "GitHub",
    "url": "https://github.com/",
    "tags": ["👨‍💻 Development", "📦 Tools"],
    "keywords": ["gh", "code"]
  },
  {
    "label": "Twitter",
    "url": "https://twitter.com/home",
    "tags": ["🧑 SNS"],
    "keywords": ["twitter", "social"]
  }
];
```

The `keywords` and `tags` fields can be either strings or arrays. The application will normalize them to arrays before using them.

You can modify or add bookmarks as needed.

## Tag settings (per-tag keywords)

Tags can carry their **own keywords**, separate from each bookmark's keywords —
useful for abbreviations (`cxl` → a `Cancel` tag) or other languages
(`english`/`英` → an `英語` tag). While searching, a result matches when the
query hits a bookmark's field **or** any keyword of a tag it belongs to.

Set them from the sidebar index: hover a tag and click the **⚙ (Tag settings)**
button to rename the tag and edit its keywords (comma separated) in one modal.
These settings live in the `meta.tagKeywords` array in `bookmarks.js` and are
persisted alongside the bookmark list, so they round-trip through
"Download bookmarks.js".


## License

This project is licensed under the [MIT License](https://chat.openai.com/LICENSE).
