# Repository Guidelines

## Project Overview

A static **bookmark search app**: a single-page UI that filters a personal
bookmark list by keyword/tag/name in real time, groups results by tag, and
navigates (or prompts for a search term) to a bookmark's URL.

Stack: **vanilla JavaScript + Vue 3 loaded from a CDN**. No build step, no
package manager, no bundler, no tests. The whole app is served as static files.

## Architecture & Data Flow

The app uses a **global-script (no-module) architecture**. There is no import/
export system; every unit attaches a PascalCase object to `window`, and
`bookmarks.html` wires them together by **script load order**. Reordering the
`<script>` tags in `bookmarks.html` breaks the app, because each script reads
the globals the previous one defined.

Load order (must stay this way — dependencies point downward):

```
Vue (CDN)
 → bookmarks.js                 (global `bookmarks` data array)
 → src/utils/bookmark-utils.js  (window.BookmarkUtils)
 → src/utils/toast-utils.js     (window.ToastUtils)
 → src/services/navigation-service.js   (window.NavigationService)
 → src/services/clipboard-service.js    (window.ClipboardService, needs ToastUtils)
 → src/AppComponent.js          (window.AppComponent, needs the three services + BookmarkUtils)
 → src/app.js                   (window.ThemeManager + Vue.createApp(...).mount('#bookmark-app'))
```

Runtime flow: `bookmarks.js` data → `AppComponent.data()` normalizes it via
`BookmarkUtils` → user types into `query` → `computed.filteredBookmarks`
filters → `computed.sortedGroupedBookmarks` groups/sorts → template renders
tag-grouped cards. Clicking a card calls `NavigationService.navigate` (handles
`%s` search placeholders via `prompt()`). Theme is a separate localStorage-backed
`ThemeManager`, applied as the `data-theme` attribute on `<html>`.

**Search semantics** (`AppComponent.filteredBookmarks`): query is trimmed,
lowercased, split on whitespace; every part must match *some* of
`label`/`tags`/`keywords` (case-insensitive `includes`) — i.e. AND across
space-separated parts, OR across fields.

## Key Directories

- `src/` — all application code (no sub-module loader; plain globals).
  - `src/services/` — side-effecting operations (`navigation-service.js`,
    `clipboard-service.js`).
  - `src/utils/` — pure helpers (`bookmark-utils.js`, `toast-utils.js`).
  - `src/AppComponent.js` — the Vue component (template + logic).
  - `src/app.js` — bootstrap / mount + `ThemeManager`.
- `tmp/` — scratch space; empty and gitignored. Safe to ignore.

## Development Commands

There is **no build and no package manager**. Serve the folder statically and
open it in a browser. Use a local HTTP server rather than `file://` — the
clipboard feature needs a secure context (`navigator.clipboard`), and favicons
are fetched from `t2.google.com`:

```bash
python3 -m http.server 8000        # or: npx serve .  /  bun --builtin ...
# then open http://localhost:8000/bookmarks.html
```

No `npm install`, `npm run build`, or lint/test scripts exist.

## Code Conventions & Common Patterns

- **Globals over modules.** Each file does `window.XxxName = { … }`. Names:
  `PascalCase` for the `window` object (`AppComponent`, `BookmarkUtils`,
  `NavigationService`, `ClipboardService`, `ToastUtils`, `ThemeManager`);
  `camelCase` for its methods (`normalizeBookmarks`, `groupBookmarksByTag`,
  `faviconUrl`, `navigate`, `copyBookmarksToClipboard`, `toggleTheme`).
- **Suffixed role naming:** `*Service` = side effects / I/O; `*Utils` = pure
  helpers. Add new units the same way, not via ES modules.
- **Load order is the dependency graph.** Anything you add that depends on a
  global must appear *after* it in `bookmarks.html`.
- **Data contract** — a bookmark is `{ label, url, tags, keywords }`. `tags`
  and `keywords` may be a string or array; `BookmarkUtils.normalizeBookmarks`
  coerces string → array at load. New bookmark entries in `bookmarks.js` should
  match this shape.
- **URL `%s` placeholder** — a `url` containing `%s` is a search template;
  `NavigationService` prompts for the term and `encodeURIComponent`s it before
  `window.location.href`.
- **Error handling** — best-effort `try/catch` with silent fallback for
  browser APIs that can throw (`localStorage`, `URL` parsing in `faviconUrl`);
  async clipboard uses `.catch()` with an `execCommand('copy')` fallback.
  Keep the try/catch-or-fallback pattern for new I/O.
- **Async** — no `async/await`; only promise `.then/.catch` (clipboard). No
  `fetch` — favicons come from a `<img src>` to Google's favicon service.
- **State** — Vue reactive component `data()` + `localStorage` key `theme`
  (`'light'|'dark'`, mirrored to `data-theme` on `<html>`). No global store.
- **Styling** — CSS custom properties (design tokens) in `styles.css`; light
  defaults in `:root`, dark overrides in `[data-theme="dark"]`. Responsive
  column counts via `--columns` media queries. Reuse tokens; don't hardcode
  colors/spacing.

## Important Files

- `bookmarks.html` — entry point; owns the script load order and the
  pre-render theme-detection inline script.
- `bookmarks.js` — the global `bookmarks` data array (add/edit entries here).
- `src/AppComponent.js` — all UI logic, search/grouping computeds, template.
- `src/app.js` — `ThemeManager` + app mount.
- `src/services/*.js`, `src/utils/*.js` — services and helpers.
- `styles.css` — theme tokens and layout.
- `README.md` — user-facing usage docs.
- `.gitignore` (ignores `tmp/`), `.gitattributes` (`* text=auto`, LF).

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
  navigation prompt, and clipboard export.
- When changing logic, smoke-test the affected path in the browser rather than
  writing a test suite. If a real test harness is ever introduced, it must run
  without a build step and load the existing global-script structure.
