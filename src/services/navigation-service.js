/**
 * Navigation service: handles bookmark URL navigation, including `%s` placeholder resolution.
 */
window.NavigationService = {
  navigate(bookmark) {
    if (bookmark.url.includes('%s')) {
      this.promptForParameter(bookmark);
    } else {
      window.location.href = bookmark.url;
    }
  },

  promptForParameter(bookmark) {
    const value = prompt('Enter search term:', '');
    if (value) {
      window.location.href = bookmark.url.replace('%s', encodeURIComponent(value));
    }
  }
};
