# Repository Guidelines

## Project Overview

A static **bookmark search app**: a single-page UI that filters a personal
bookmark list by keyword/tag/name in real time, groups results by tag, and
navigates (or prompts for a search term) to a bookmark's URL. The list can
also be edited in-page (add / edit / delete, with an optional per-bookmark
`note`) and exported back to a new `bookmarks.js` file for download.

Stack: **vanilla JavaScript + Vue 3 loaded from a CDN**. No build step, no
package manager, no bundler, no tests. The app is split into a thin `bookmarks.html`
plus a sibling `style.css` and dependency-ordered classic `.js` files (no modules),
all openable straight from disk via `file://`.

## Requirements

- `bookmarks.html` **must open and run when opened directly via `file://`** —
  no web server, no build step, no package manager. After any change the app
  must still work when the folder is opened straight from disk.
- A local HTTP server is **optional** (see Development Commands): it only improves
  clipboard copy and remote favicons, so it must never become a prerequisite. Keep
  the split files loading purely from `https://` CDNs (Vue 3, Google Fonts) and
  **relative classic `file://` resources** (the sibling `.js` / `.css` files);
  ES modules / `import` (static or dynamic), `fetch`/XHR, or bundler output would
  break `file://` and must be avoided.

## Architecture & Data Flow

The app uses a **global-script (no-module) architecture**. There is no
import/export system; every unit attaches a PascalCase object to `window`,
and `bookmarks.html` wires them together by the **order of its `<script src>`
tags**. Because a top-level `const`/`let` in a classic script lives in the
shared global lexical scope, the `bookmarks.js` data array is visible to every
later module. Reordering the scripts in `bookmarks.html` breaks the app, because
each file reads the globals the previous one defined.

Order (must stay this way — dependencies point downward):

```
vue.global.js (CDN — <script src="https://unpkg.com/vue@3/dist/vue.global.js">)
 → bookmarks.js        `const bookmarks = [...]`                  (global data array)
 → bookmark-utils.js   `window.BookmarkUtils`                     (pure helpers)
 → toast-utils.js      `window.ToastUtils`
 → side-effects.js     `window.SideEffects`                       (needs ToastUtils + BookmarkUtils)
 → app.js              `window.AppComponent`                      (needs SideEffects + BookmarkUtils)
 → main.js            Vue.createApp(...).mount('#bookmark-app')
```

Runtime flow: `const bookmarks` data → `AppComponent.data()` normalizes it via
`BookmarkUtils` → user types into `query` → `computed.filteredBookmarks`
filters → `computed.sortedGroupedBookmarks` groups/sorts → template renders
tag-grouped cards. Clicking a card calls `SideEffects.navigate` (handles
`%s` search placeholders via `prompt()`). Theme + the edited list live in
`SideEffects`, applied as the `data-theme` attribute on `<html>`.

Editing uses a modal: add / edit / delete a bookmark (label, url, tags,
keywords, note). Every change auto-saves to the `localStorage` key `bookmarks`
via `window.SideEffects` (`loadBookmarks` falling back to the `bookmarks` data
array in `bookmarks.js` when nothing is stored); "Download bookmarks.js" serializes the current list with
`BookmarkUtils.serializeBookmarks` and saves it via `SideEffects.downloadFile`.

**Search semantics** (`AppComponent.filteredBookmarks`): query is trimmed,
lowercased, split on whitespace; every part must match *some* of
`label`/`tags`/`keywords` (case-insensitive `includes`) — i.e. AND across
space-separated parts, OR across fields.

## Project Files

- `bookmarks.html` — the thin entry point. In `<head>` it keeps a pre-render
  theme-detection inline script (runs before paint, to avoid a flash of the wrong
  theme) plus the font `preconnect`/`<link>` and `style.css`; in `<body>` it loads
  the Vue CDN then the six sibling scripts in dependency order (see Architecture).
  The one remaining piece of inline JS is that theme snippet.
- `style.css` — all CSS: design tokens, light (`:root`) + dark
   (`[data-theme="dark"]`) themes, responsive `--columns` queries. No `@import`.
- `bookmarks.js` — the `const bookmarks = [...]` data array (the most-edited file;
   re-loadable from the "Download bookmarks.js" button).
- `bookmark-utils.js` — `window.BookmarkUtils` (normalization, grouping, favicon,
   `serializeBookmarks`).
- `toast-utils.js` — `window.ToastUtils` (toast notifications).
- `side-effects.js` — `window.SideEffects`, the single I/O boundary (nav / clipboard /
   download / storage); the five former shallow I/O modules
   (NavigationService/ClipboardService/DownloadService/ThemeManager/BookmarkStore) are now one `SideEffects`.
- `app.js` — `window.AppComponent` (the Vue component + its template string).
- `main.js` — bootstrap: `Vue.createApp(window.AppComponent).mount('#bookmark-app')`.
- external resources only beyond the above: Vue 3 CDN + Google Fonts.
- `README.md` — user-facing usage docs.
- `.gitignore` (ignores `tmp/`, `.pi/`), `.gitattributes` (`* text=auto`, LF).

## Development Commands

There is **no build and no package manager**. The app opens by **opening
`bookmarks.html` directly via `file://`** — no server needed (see Requirements).
A local HTTP server is **optional**: it only helps the clipboard copy feature
(preferred in a secure context) and remote favicons from `t2.google.com`. If you
run one anyway:

```bash
python3 -m http.server 8000        # or: npx serve .  /  bun --builtin ...
# then open http://localhost:8000/bookmarks.html
```

No `npm install`, `npm run build`, or lint/test scripts exist.

## Code Conventions & Common Patterns

- **Globals over modules.** Each `.js` module — a classic `<script src>` loaded in
   dependency order — does `window.XxxName = { … }`. Names: `PascalCase` for
   the `window` object
   (`AppComponent`, `BookmarkUtils`, `SideEffects`, `ToastUtils`); `camelCase`
   for its methods (`normalizeBookmarks`, `groupBookmarksByTag`, `faviconUrl`,
   `navigate`, `copyToClipboard`, `downloadFile`, `getTheme`/`setTheme`,
   `loadBookmarks`/`saveBookmarks`).
- **Role naming:** `SideEffects` is the single I/O boundary (nav / clipboard /
  download / storage); `*Utils` are pure helpers. New I/O goes in `SideEffects`, never its own block.
- **Order is the dependency graph.** Anything you add that depends on a
  global must appear *after* it in the script order of `bookmarks.html`; a new
  module becomes a new `file.js` added after the one it depends on.
- **Data contract** — a bookmark is `{ label, url, tags, keywords, note? }`.
  `tags` and `keywords` may be a string or array and `note` is an optional
  string (defaults to `''`); `BookmarkUtils.normalizeBookmarks` coerces string
  → array and fills `note` at load. New entries in the `const bookmarks` array
  should match.
- **URL `%s` placeholder** — a `url` containing `%s` is a search template;
  `SideEffects.navigate` prompts for the term and `encodeURIComponent`s it before
  `window.location.href`.
- **Error handling** — best-effort `try/catch` with silent fallback for
  browser APIs that can throw (`localStorage`, `URL` parsing in `faviconUrl`);
  async clipboard uses `.catch()` with an `execCommand('copy')` fallback.
  Keep the try/catch-or-fallback pattern for new I/O.
- **Async** — no `async/await`; only promise `.then/.catch` (clipboard). No
  `fetch` — favicons come from a `<img src>` to Google's favicon service.
- **State** — Vue reactive component `data()` + `localStorage` keys `theme`
  (`'light'|'dark'`, mirrored to `data-theme` on `<html>`) and `bookmarks`
   (the edited list, persisted by `window.SideEffects`). No global store object.
- **Styling** — CSS custom properties (design tokens) in `style.css`; light
  defaults in `:root`, dark overrides in
  `[data-theme="dark"]`. Responsive column counts via `--columns` media
  queries. Reuse tokens; don't hardcode colors/spacing.

## Runtime / Tooling Preferences

- **No Node/Bun/pnpm requirement** for running or editing the app — it is
  static. A modern browser that supports Vue 3 and `navigator.clipboard` is all
  that's needed at runtime.
- **No package manager, lockfile, or CI config** exists. Don't add one without
  explicit direction.
- **No linter/formatter config** (no Prettier/ESLint/TS). Match the existing
  style: 2-space indent, `const`/arrow functions, single quotes, template
  literals for markup.
- Keep the app dependency-free beyond the Vue 3 CDN — avoid introducing a
  build tool, modules, or a framework migration.

## Testing & QA

- **No test framework, no test files, no coverage, no CI.**
- QA is manual: serve the folder (see Development Commands) and verify in a
  browser — search filtering, tag grouping, theme toggle persistence, `%s`
  navigation prompt, clipboard export, the add/edit/delete modal, note
  rendering, and "Download bookmarks.js" producing a valid, re-loadable file.
- When changing logic, smoke-test the affected path in the browser rather than
  writing a test suite. If a real test harness is ever introduced, it must run
  without a build step and load the existing global-script structure.
