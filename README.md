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

3. Open the index.html file in your web browser.

## Usage

To use the app, simply start typing in the search box at the top of the page. The app will filter the list of bookmarks in real time based on your input.

You can also navigate to a bookmark by clicking on its name in the list. If the bookmark's URL includes the string "%s", you will be prompted to enter a value for the parameter before being taken to the URL.

### Sample Bookmarks

The application comes with a sample set of bookmarks, which are defined in the following format:

```js
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
}
```

You can modify or add bookmarks as needed.

## License

This project is licensed under the [MIT License](https://chat.openai.com/LICENSE).
