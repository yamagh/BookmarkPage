# Repository Guidelines

## Project Overview

A static **bookmark search app**: a single-page UI that filters a personal
bookmark list by keyword/tag/name in real time, groups results by tag, and
navigates (or prompts for a search term) to a bookmark's URL. The list can
also be edited in-page (add / edit / delete, with an optional per-bookmark
`note`) and exported back to a new `bookmarks.js` file for download.

Stack: **vanilla JavaScript + Vue 3 loaded from a CDN**. No build step, no
package manager, no bundler, no tests. The entire app lives in a single
self-contained file.

## Requirements

- `bookmarks.html` **must open and run when opened directly via `file://`** —
  no web server, no build step, no package manager. After any change the file must
  still work when opened straight from disk.
- A local HTTP server is **optional** (see Development Commands): it only improves
  clipboard copy and remote favicons, so it must never become a prerequisite. Keep
  the single self-contained file loading purely from `https://` CDNs (Vue 3,
  Google Fonts); a local import/ES module, fetch/XHR, or bundler output would break
  `file://` and must be avoided.

## Architecture & Data Flow

The app uses a **global-script (no-module) architecture**. There is no
import/export system; every unit attaches a PascalCase object to `window`,
and `bookmarks.html` wires them together by the **order of its inline
`<script>` blocks**. Reordering those blocks in `bookmarks.html` breaks the
app, because each block reads the globals the previous one defined.

Order (must stay this way — dependencies point downward):

```
Vue (CDN — external <script src="https://unpkg.com/vue@3/dist/vue.global.js">)
 → inline block 1: `const bookmarks = [...]`   (global `bookmarks` data array)
 → inline block 2: `window.BookmarkUtils`
 → inline block 3: `window.ToastUtils`
 → inline block 4: `window.NavigationService`
 → inline block 5: `window.ClipboardService`   (needs ToastUtils)
 → inline block 6: `window.DownloadService`    (needs ToastUtils)
 → inline block 7: `window.AppComponent`       (needs the services + BookmarkUtils + BookmarkStore)
 → inline block 8: `window.ThemeManager` + `window.BookmarkStore` + Vue.createApp(...).mount('#bookmark-app')
```

Runtime flow: `const bookmarks` data → `AppComponent.data()` normalizes it via
`BookmarkUtils` → user types into `query` → `computed.filteredBookmarks`
filters → `computed.sortedGroupedBookmarks` groups/sorts → template renders
tag-grouped cards. Clicking a card calls `NavigationService.navigate` (handles
`%s` search placeholders via `prompt()`). Theme is a separate localStorage-backed
`ThemeManager`, applied as the `data-theme` attribute on `<html>`.

Editing uses a modal: add / edit / delete a bookmark (label, url, tags,
keywords, note). Every change auto-saves to the `localStorage` key `bookmarks`
via `window.BookmarkStore` (falling back to the in-file `bookmarks` array when
nothing is stored); "Download bookmarks.js" serializes the current list with
`BookmarkUtils.serializeBookmarks` and saves it via `window.DownloadService`.

**Search semantics** (`AppComponent.filteredBookmarks`): query is trimmed,
lowercased, split on whitespace; every part must match *some* of
`label`/`tags`/`keywords` (case-insensitive `includes`) — i.e. AND across
space-separated parts, OR across fields.

## Project Files

- `bookmarks.html` — the single entry point and the **only code file**. It
  contains everything, inlined:
  - a pre-render theme-detection inline script (top of `<head>`);
  - all CSS in a single `<style>` block (design tokens, light + dark themes);
  - the `const bookmarks = [...]` data array;
  - eight inline `<script>` blocks (BookmarkUtils, ToastUtils, NavigationService,
    ClipboardService, DownloadService, AppComponent, ThemeManager + BookmarkStore
    + Vue mount).
  - external resources only: Vue 3 CDN + Google Fonts.
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

- **Globals over modules.** Each inline `<script>` block does
  `window.XxxName = { … }`. Names: `PascalCase` for the `window` object
  (`AppComponent`, `BookmarkUtils`, `NavigationService`, `ClipboardService`,
  `ToastUtils`, `ThemeManager`); `camelCase` for its methods
  (`normalizeBookmarks`, `groupBookmarksByTag`, `faviconUrl`, `navigate`,
  `copyBookmarksToClipboard`, `toggleTheme`).
- **Suffixed role naming:** `*Service` = side effects / I/O; `*Utils` = pure
  helpers. Add new units the same way — a new inline block — not via ES modules.
- **Order is the dependency graph.** Anything you add that depends on a
  global must appear *after* it in `bookmarks.html`.
- **Data contract** — a bookmark is `{ label, url, tags, keywords, note? }`.
  `tags` and `keywords` may be a string or array and `note` is an optional
  string (defaults to `''`); `BookmarkUtils.normalizeBookmarks` coerces string
  → array and fills `note` at load. New entries in the `const bookmarks` array
  should match.
- **URL `%s` placeholder** — a `url` containing `%s` is a search template;
  `NavigationService` prompts for the term and `encodeURIComponent`s it before
  `window.location.href`.
- **Error handling** — best-effort `try/catch` with silent fallback for
  browser APIs that can throw (`localStorage`, `URL` parsing in `faviconUrl`);
  async clipboard uses `.catch()` with an `execCommand('copy')` fallback.
  Keep the try/catch-or-fallback pattern for new I/O.
- **Async** — no `async/await`; only promise `.then/.catch` (clipboard). No
  `fetch` — favicons come from a `<img src>` to Google's favicon service.
- **State** — Vue reactive component `data()` + `localStorage` keys `theme`
  (`'light'|'dark'`, mirrored to `data-theme` on `<html>`) and `bookmarks`
  (the edited list, persisted by `window.BookmarkStore`). No global store object.
- **Styling** — CSS custom properties (design tokens) in the `<style>` block
  of `bookmarks.html`; light defaults in `:root`, dark overrides in
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
