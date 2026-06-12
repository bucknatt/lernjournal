# Software Documentation for Lernjournal Web App

Weekly apprenticeship reflection journal: a static Single-Page Application using Vanilla JS with a Hatsune Miku-themed and dashboard-like UI, and JSON-based persistence.

---

## Table of contents

1. [Architecture overview](#architecture-overview)
2. [Data flow](#data-flow)
3. [Routing](#routing)
4. [localStorage keys](#localstorage-keys)
5. [File reference](#file-reference)
6. [Data schema](#data-schema)

---

## Architecture overview

```
┌─────────────────────────────────────────────────────────────┐
│  index.html                                                  │
│  └── js/main.js (bootstrap)                                  │
│       ├── utils/theme.js      → body[data-miku-theme]        │
│       ├── store/journal-store.js → in-memory journal state   │
│       └── router.js           → hash SPA, mounts views       │
│            ├── views/dashboard.js                            │
│            ├── views/week-editor.js                          │
│            ├── views/week-read.js                            │
│            └── views/search.js                               │
└─────────────────────────────────────────────────────────────┘
         │ fetch                    │ export / GitHub API
         ▼                          ▼
   data/journal.json          Git remote (optional)
```

| Layer      | Responsibility                                            |
|------------|-----------------------------------------------------------|
| **Models** | Data shapes, validation, German field labels              |
| **Store**  | Single source of truth in memory, dirty tracking, pub/sub |
| **API**    | Load/save JSON file, GitHub Contents API                  |
| **Utils**  | ISO weeks, themes, full-text search                       |
| **Views**  | DOM rendering per screen (no framework)                   |
| **CSS**    | Miku design tokens + layout + components                  |

There is no backend server. The app must be served over HTTP (`npm run dev`) so `fetch('./data/journal.json')` works.

---

## Data flow

### Startup (`journalStore.prepare` + `journalStore.init`)

1. `journalStore.prepare()` restores an optional linked `data/journal.json` file handle from IndexedDB.
2. `fetchJournalFromRepo()` loads `data/journal.json`.
3. `syncedSnapshot` is set to that file’s JSON string (baseline for “dirty” detection).
4. The in-memory journal **always starts from the file** (file-first).
5. If `localStorage` draft differs from the file, a **conflict banner** appears. The user then can choose **Datei behalten** or **Entwurf laden**.
6. `localStorage` is updated only after user edits (`_touch`) or when resolving sync (reload, GitHub save, dismiss conflict, linked-file write success).

### Dirty state (`isDirty`)

`isDirty === true` when the in-memory journal differs from `syncedSnapshot` (last acknowledged persisted state). This drives the **„Lokal geändert“** / **„Ungespeicherte lokale Änderungen“** badges.

Clearing dirty state:

- `markSyncedFromRepo()`: after reload from file or successful GitHub save
- `replaceJournal()`: replaces data and sets synced baseline to the new data
- `writeToLinkedFile()`: on successful write, marks current data as synced (when file is linked)

### Persistence paths

| Action                   | What happens                                                                         |
|--------------------------|--------------------------------------------------------------------------------------|
| Typing in editor         | `upsertEntry` → `_touch` → `localStorage` draft (+ linked file if configured)        |
| Link `data/journal.json` | File System Access API (Chromium, `localhost`), `writeToLinkedFile` on each `_touch` |
| Export JSON              | Downloads `journal.json`, user commits to git manually                               |
| Reload from file         | `reloadFromFile()` → `replaceJournal`                                                |
| GitHub load              | API GET → `replaceJournal`                                                           |
| GitHub save              | API PUT with `sha` → `markSyncedFromRepo`                                            |

---

## Routing

| Hash                        | View                  | Module           |
|-----------------------------|-----------------------|------------------|
| `#/` or empty               | Dashboard             | `dashboard.js`   |
| `#/week/2026-W20/edit`      | Week editor           | `week-editor.js` |
| `#/week/2026-W20/read`      | Week read-only        | `week-read.js`   |
| `#/week/2026-W20`           | Week editor (default) | `week-editor.js` |
| `#/new` or `#/new/2026-W20` | New/edit week         | `week-editor.js` |
| `#/search/query+terms`      | Search results        | `search.js`      |

`router.js` calls a cleanup function from the previous view before rendering the next (unsubscribe listeners, flush autosave).

---

## localStorage keys

| Key                             | Purpose                                                                 |
|---------------------------------|-------------------------------------------------------------------------|
| `lernjournal-draft-v1`          | Full journal JSON cache (aligned with file after load, updated on edit) |
| `lernjournal-has-unsaved-edits` | Set when the user edits in the app (`_touch`)                           |
| `lernjournal-miku-theme`        | Active theme: `MinimalMiku`, `Concert`, `NightNeon`, `SnowMiku`         |
| `lernjournal-github-repo`       | `owner/repo` for API sync                                               |
| `lernjournal-github-token`      | Fine-grained Access Token (Contents read/write)                         |
| `lernjournal-github-sha`        | Git blob SHA for optimistic updates on PUT                              |

Linked local-file sync metadata is stored in **IndexedDB** (`lernjournal-fs-v1`, store `kv`, key `journal-file-handle`), not in `localStorage`.

---

## File reference

### Root

#### `index.html`

Entry HTML document.

| Part                                  | Role                                                                                    |
|---------------------------------------|-----------------------------------------------------------------------------------------|
| `<head>` fonts                        | Nunito from Google Fonts (body), Too Freakin Cute Demo self-hosted in `fonts/` (titles) |
| CSS links                             | `miku-tokens.css` → `layout.css` → `components.css` (cascade order)                     |
| `body[data-miku-theme="MinimalMiku"]` | Default theme, updated by `theme.js`                                                    |
| `#app.app-shell`                      | Mount point, all views render inside this div                                           |
| `js/main.js`                          | ES module entry (deferred via `type="module"`)                                          |

#### `package.json`

npm metadata and dev scripts only (no runtime dependencies).

| Script     | Command                     | Purpose                                 |
|------------|-----------------------------|-----------------------------------------|
| `dev`      | `npx --yes serve . -p 8765` | Local static server (default port 8765) |
| `dev:5173` | `npx --yes serve . -p 5173` | Alternative port                        |
| `start`    | `npm run dev`               | Alias for default dev server            |

#### `README.md`

User-facing quick start: run locally, sync, privacy, features.

#### `DOCUMENTATION.md`

Serves as a minimal software documentation and technical reference for developers.

#### `.gitignore`

Excludes `node_modules/`, IDE files (`.idea/`, `*.iml`), `out/`, logs.

---

### `fonts/`

#### `fonts/TooFreakinCuteDemo.ttf`

Display font for titles (`--font-display`). Sourced from [1001fonts: Too Freakin Cute](https://www.1001fonts.com/too-freakin-cute-demo-font.html) (Misti's Fonts).

#### `fonts/README.md`

License and attribution notes for bundled fonts.

---

### `data/`

#### `data/journal.json`

**Source of truth** for journal content in git.

```json
{
  "version": 1,
  "entries": [
    {
      "weekKey": "2026-W20",
      "status": "draft",
      "datum": "2026-05-18",
      "done": "Diese Woche habe ich an meinem Lernjournal gearbeitet.",
      "methods": "Vanilla JS, GitHub Pages, File System Access API",
      "learned": "Wie man eine einfache Webanwendung mit Vanilla JS erstellt und auf GitHub Pages bereitstellt."
    }
  ]
}
```

Committed to the repository. As this is personal content, I should consider to make this repo private.

---

### `css/`

#### `css/miku-tokens.css`

Miku Hybrid color system (derived from my [Obsidian Miku Hybrid](https://community.obsidian.md/plugins/miku-plugin-hybrid) theme/plugin style source). CHECK IT OUT!!! :)

| Section                               | Role                                                                                                              |
|---------------------------------------|-------------------------------------------------------------------------------------------------------------------|
| `@font-face`                          | Self-hosted **Too Freakin Cute** for `--font-display`                                                             |
| `:root`                               | Base palette (`--palette-19601-*`, `--palette-pop-*`) and default `--miku-*` variables, fonts, radii, glow shadow |
| `body[data-miku-theme="MinimalMiku"]` | Softer teal/pink gradient                                                                                         |
| `body[data-miku-theme="Concert"]`     | Brighter neon, higher contrast text                                                                               |
| `body[data-miku-theme="NightNeon"]`   | Darker bg, radial cyan glow, strong neon                                                                          |
| `body[data-miku-theme="SnowMiku"]`    | Cooler, lighter winter-style palette                                                                              |
Theme switching only changes CSS variables via `document.body.dataset.mikuTheme`.

#### `css/layout.css`

Page structure and typography.

| Selector                       | Role                                  |
|--------------------------------|---------------------------------------|
| `body`                         | Font, text color, gradient background |
| `.app-shell`                   | Centered column, max-width 1100px     |
| `.page-header` / `.page-title` | Gradient title text                   |
| `.page-subtitle`, `.muted`     | Secondary text                        |
| `.week-range-label`            | `KW … · date – date` lines            |
| `.nav-back`                    | Back link styling                     |
| `.error-panel`                 | Bootstrap failure UI from `main.js`   |
| `code`                         | Inline code in help text              |

#### `css/components.css`

Reusable UI components.

| Section                                   | Role                                                   |
|-------------------------------------------|--------------------------------------------------------|
| `.btn`, `.btn-primary`, `.btn-ghost`      | Buttons with Miku glow                                 |
| `.card`, `.card-grid`, `.hero`            | Content containers                                     |
| `.badge`, `.badge-warn`, `.badge-success` | Status pills („Abgeschlossen“ uses sun-tinted success) |
| `.journey-*`                              | Horizontal week timeline nodes                         |
| `.goal-chips`                             | Previous week’s goals display                          |
| `.form-section`                           | Editor labels + inputs                                 |
| `.settings-panel`                         | Sync/backup/GitHub UI                                  |
| `.app-toolbar`, `.theme-switcher`         | Theme name + cycle button                              |
| `.search-*`                               | Search form, results list, `<mark>` highlights         |
| `.status-toast`                           | Temporary feedback messages                            |

---

### `js/`

#### `js/main.js`

Application bootstrap.

1. `initTheme()`: restore theme from `localStorage`
2. `journalStore.prepare()`: restore linked file handle (if supported)
3. `journalStore.init()`: load JSON + reconcile draft conflict state
4. `initRouter()`: start hash navigation

If a failure occurs, it renders `.error-panel` with instructions.

---

#### `js/router.js`

Client-side router.

| Export / symbol                | Role                                                     |
|--------------------------------|----------------------------------------------------------|
| `parseRoute()`                 | Parses `location.hash` into `{ name, weekKey?, query? }` |
| `navigateTo(hash)`             | Sets hash or re-renders if already on same hash          |
| `renderCurrentRouteNow()`      | Runs previous view cleanup, then mounts matching view    |
| `scheduleRenderCurrentRoute()` | Coalesced route render via `requestAnimationFrame`       |
| `initRouter()`                 | Registers `hashchange` listener, initial render          |
| `currentCleanup`               | Teardown from active view (subscriptions, timers)        |

---

### `js/models/`

#### `js/models/journal.js`

Domain types and normalization.

| Export                       | Role                                     |
|------------------------------|------------------------------------------|
| `JOURNAL_VERSION`            | Schema version constant (`1`)            |
| `FIELD_LABELS`               | UI labels for each field                 |
| `REFLECTION_FIELDS`          | Keys for the seven reflection text areas |
| `createEmptyEntry(weekKey)`  | New draft entry with today’s date        |
| `normalizeJournalFile(data)` | Safe parse of root JSON object           |
| `normalizeEntry(entry)`      | Coerce one entry, invalid → `null`       |
| `isEntryComplete(entry)`     | All required fields non-empty            |

**WeeklyEntry fields:** `weekKey`, `status` (`draft`|`complete`), `datum`, `done`, `methods`, `learned`, `wentWell`, `wentPoorly`, `helpedBy`, `improvements`, `goal1`, `goal2`, `createdAt`, `updatedAt`.

---

### `js/store/`

#### `js/store/journal-store.js`

Central state module (singleton `journalStore`).

| Method                                                 | Role                                                                                               |
|--------------------------------------------------------|----------------------------------------------------------------------------------------------------|
| `prepare()`                                            | Restore linked file handle from IndexedDB                                                          |
| `init()`                                               | Load file + draft, set `syncedSnapshot`                                                            |
| `getState()`                                           | `{ journal, isDirty, hasConflict, dataSource, linkedFileName, fileSyncSupported, currentWeekKey }` |
| `linkLocalFile()` / `unlinkLocalFile()`                | Manage File System Access link                                                                     |
| `writeToLinkedFile()`                                  | Persist current journal into linked file                                                           |
| `subscribe(fn)`                                        | Listen for changes, returns unsubscribe                                                            |
| `getEntry(weekKey)`                                    | Find one entry or `null`                                                                           |
| `getAllEntries()`                                      | Sorted copy of entries                                                                             |
| `getTimelineWeekKeys()`                                | Week keys for journey map                                                                          |
| `getPreviousEntry(weekKey)`                            | Prior week’s entry (goal carry-over context)                                                       |
| `getOrCreateEntry(weekKey)`                            | Get or insert empty draft                                                                          |
| `upsertEntry(entry)`                                   | Insert/update with fresh `updatedAt`                                                               |
| `markComplete(weekKey)`                                | Set `status: complete`                                                                             |
| `getCompletedCount()`                                  | Count completed weeks                                                                              |
| `getStreak()`                                          | Consecutive completed weeks ending at current                                                      |
| `_touch()`                                             | Persist to `localStorage` + notify listeners                                                       |
| `replaceJournal(data)`                                 | Replace all data, mark as synced                                                                   |
| `markSyncedFromRepo()`                                 | Current data matches file baseline                                                                 |
| `reloadFromFile()`                                     | Reload `data/journal.json` and replace state                                                       |
| `applyPendingDraft()` / `dismissPendingConflict()`     | Resolve startup file-vs-draft conflict                                                             |
| `exportJson()`                                         | Trigger download                                                                                   |
| `importJson()`                                         | File picker → replace journal                                                                      |
| `getGithubConfig` / `setGithubConfig` / `setGithubSha` | GitHub API credentials                                                                             |

---

### `js/api/`

#### `js/api/load-journal.js`

File-based I/O (no network except `fetch` to same origin).

| Function                       | Role                                      |
|--------------------------------|-------------------------------------------|
| `fetchJournalFromRepo()`       | GET `./data/journal.json`, normalize      |
| `downloadJournalJson(journal)` | Browser download of pretty-printed JSON   |
| `importJournalFromFile()`      | Hidden `<input type="file">` → parse JSON |

#### `js/api/github-sync.js`

GitHub [Contents API](https://docs.github.com/en/rest/repos/contents) for `data/journal.json`.

| Function                       | Role                                                   |
|--------------------------------|--------------------------------------------------------|
| `githubFetch()`                | Authenticated request helper, attaches error `.status` |
| `loadJournalFromGithub()`      | GET file, base64-decode, store `sha`                   |
| `saveJournalToGithub(journal)` | PUT with `sha`, handles 409 conflict message           |

#### `js/api/local-file-sync.js`

File System Access integration for direct writes to local `data/journal.json`.

> **Browser support:** This feature relies on the `showOpenFilePicker` API, which is **Chromium-only** (Chrome, Edge). It does **not** exist in Firefox or Safari. `isLocalFileSyncSupported()` detects availability at runtime, all related UI (link/unlink buttons) is hidden and `restoreLinkedJournalFile()` returns early on unsupported browsers. Users on Firefox/Safari must use the **JSON export** workflow instead.

| Function                                    | Role                                                               |
|---------------------------------------------|--------------------------------------------------------------------|
| `isLocalFileSyncSupported()`                | Feature detection for `showOpenFilePicker` (Chromium only)         |
| `restoreLinkedJournalFile()`                | Restore saved file handle from IndexedDB (fallback if unsupported) |
| `getLinkedFileName()`                       | Expose linked file name for UI                                     |
| `linkJournalFile()` / `unlinkJournalFile()` | Link or clear selected JSON file                                   |
| `writeJournalToLinkedFile(journal)`         | Request permission and write pretty-printed JSON                   |

##### How to link a file

The link button is only visible on **Chrome/Edge** (`localhost`). It appears in the **Sync & Backup** panel at the bottom of the Dashboard (`#/`):

1. Scroll to **Sync & Backup** on the dashboard.
2. Click **„data/journal.json verknüpfen"** (or **„Andere Datei wählen"** if already linked).
3. The OS file picker opens (filtered to `.json`). Navigate to the local repo folder and select `data/journal.json`.
4. Chromium stores the file handle permanently in IndexedDB and immediately overwrites the selected file with the current in-memory journal (see known issues below).
5. A toast confirms: *„Verknüpft mit journal.json."*

From this point, every autosave (2 s after typing stops) and every explicit **Speichern** click writes directly to that file on disk.

To remove the link: click **„Verknüpfung lösen"**, the IndexedDB entry is then deleted and future saves go to `localStorage` only.

##### How the permission model works

`writeJournalToLinkedFile()` requests `{ mode: "readwrite" }`, the **File System Access API write permission** for the specific file. This is a Chromium-managed per-origin permission, separate from `localStorage` or OS-level file permissions.

Two distinct concepts apply:

| Concept              | Persistence           | What it means                                                     |
|----------------------|-----------------------|-------------------------------------------------------------------|
| **File handle**      | Permanent (IndexedDB) | Which file was selected, survives browser restarts                |
| **Write permission** | Session-scoped        | Whether the app may write to it, reset when the browser is closed |

Every write attempt calls `queryPermission({ mode: "readwrite" })`. If the result is not `"granted"` (e.g. after a browser restart), it calls `requestPermission({ mode: "readwrite" })`, which shows a browser-native prompt asking the user to allow write access.

##### Known issues and trade-offs

The logic to store the handle in IndexedDB permanently while requiring a per-session permission re-grant is kinda trade-off. The idea is, that users do not need to re-pick the file after every restart, but they do need to confirm write access once per session. Anyhow, the downside is that this split creates several edge-case problems in the current implementation:

| Problem                                     | Root cause                                                                                                                                       | Effect                                                                                                                                                        |
|---------------------------------------------|--------------------------------------------------------------------------------------------------------------------------------------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------|
| **Silent write failures**                   | `_touch()` calls `void journalStore.writeToLinkedFile()`  the returned Promise is discarded                                                      | If the write fails (permission denied, disk full, stale handle), the error is swallowed. The UI shows no feedback and the dirty badge may not reflect reality |
| **Unexpected permission prompt mid-typing** | After a browser restart, the first autosave (2 s after typing starts) triggers `requestPermission()`: a blocking native dialog                   | The user is interrupted unexpectedly while writing their journal entry                                                                                        |
| **Multiple stacked permission prompts**     | Rapid typing fires several `_touch()` calls in sequence, each fires `writeToLinkedFile()` before the previous `requestPermission()` has resolved | Chromium queues the prompts: the user may see the dialog appear several times in a row                                                                        |
| **Immediate overwrite on linking**          | `linkLocalFile()` calls `writeToLinkedFile()` right after the file is picked, with no content comparison                                         | If the selected file contains newer content than the in-memory journal (e.g. edited on another device), it is silently overwritten                            |
| **No stale-handle detection**               | If the linked file is deleted or moved on disk, `writeJournalToLinkedFile()` returns `{ ok: false, reason: "denied" }`                           | The user sees a generic "write denied" message with no hint that the file no longer exists, the fix is to re-link                                             |
| **Dirty flag may be cleared prematurely**   | `syncedSnapshot` is set to `snapshot(journal)` when the write resolves, but the user may have typed more since the write started                 | Changes made between the write starting and finishing are marked as synced even though they were not written to disk                                          |

---

### `js/utils/`

#### `js/utils/dates.js`

ISO week calendar helpers (UTC-based).

| Function                              | Role                                                  |
|---------------------------------------|-------------------------------------------------------|
| `getWeekKey(date?)`                   | e.g. `"2026-W20"` for current or given date           |
| `parseWeekKey(weekKey)`               | `{ year, week }` or `null`                            |
| `weekKeyToDate(weekKey)`              | Monday of that ISO week                               |
| `formatWeekLabel(weekKey)`            | German range label for UI                             |
| `getPreviousWeekKey(weekKey)`         | One week earlier                                      |
| `buildTimelineWeekKeys(existingKeys)` | Ordered list from earliest entry through current week |
| `formatDateDe(date?)`                 | `de-CH` date formatting                               |

#### `js/utils/theme.js`

Theme persistence and UI.

| Export                                       | Role                                                 |
|----------------------------------------------|------------------------------------------------------|
| `THEME_MODES`                                | `MinimalMiku`, `Concert`, `NightNeon`, `SnowMiku`    |
| `THEME_LABELS`                               | Human-readable names for current theme label         |
| `getTheme()` / `setTheme()` / `cycleTheme()` | Read/write `body.dataset.mikuTheme` + `localStorage` |
| `initTheme()`                                | Apply saved theme on load                            |
| `renderThemeSwitcher(parent, opts)`          | Current theme text + ↻ cycle button                  |

#### `js/utils/dom.js`

DOM cleanup and render-scheduling helpers.

| Function                        | Role                                                                  |
|---------------------------------|-----------------------------------------------------------------------|
| `releasePointerFocus(root)`     | Blur focused element before teardown (prevents stuck pointer capture) |
| `clearContainer(container)`     | Safe clear with focus release                                         |
| `scheduleAfterPointer(key, fn)` | Coalesce rerenders in `requestAnimationFrame`                         |

#### `js/utils/font-decor.js`

Title decorators for the Too Freakin Cute glyph mapping.

| Export                       | Role                                   |
|------------------------------|----------------------------------------|
| `TFC_HEART` / `TFC_SMILE`    | Font-specific symbol keys (`*` / `     |`) |
| `decorateDisplayTitle(text)` | Decorate page/section display headings |
| `decorateCardTitle(text)`    | Decorate compact card headings         |
| `decorateWithHearts(text)`   | Optional inline heart-only decoration  |

#### `js/utils/search.js`

Full-text search across entries.

| Function                        | Role                                              |
|---------------------------------|---------------------------------------------------|
| `searchEntries(query, entries)` | Returns `SearchMatch[]` (min 2 chars, multi-word) |
| `highlightSnippet(text, query)` | Wraps matches in `<mark>` for results HTML        |

Searches: all reflection fields, goals, `datum`, and `weekKey`. One best match per `weekKey:field`, sorted by score.

**Scoring:** The score for a match equals the number of query words found in that field. Example: searching `"git push"` gives a field containing both words `score = 2`, while a field containing only `"git"` gets `score = 1`. Every field with at least one match is returned (OR semantics), but results are sorted descending by score so fields that satisfy more words float to the top.

---

### `js/views/`

#### `js/views/ui.js`

Shared UI building blocks.

| Export                      | Role                                                     |
|-----------------------------|----------------------------------------------------------|
| `showToast(message, type?)` | Fixed bottom-right notification (4s)                     |
| `renderAppHeader(...)`      | Title, subtitle, optional back link                      |
| `renderAppToolbar(...)`     | Theme switcher (current name + cycle button)             |
| `renderSettingsPanel(...)`  | Export/import/reload, GitHub sync, Access Token settings |

#### `js/views/dashboard.js`

Main **journey map** screen (`#/`).

| Section        | Role                                                                                        |
|----------------|---------------------------------------------------------------------------------------------|
| Hero           | Current week label, Call To Action (write/continue/view), dirty badge                       |
| Card grid      | Streak (number of consecutive completed weeks), last week summary, goals from previous week |
| Schnellsuche   | Large search form (navigates to `#/search/<query>`)                                         |
| Journey track  | Clickable week nodes: empty / draft / complete / current                                    |
| Settings panel | Sync & backup (from `ui.js`)                                                                |

Subscribes to `journalStore` to re-render on changes (with unsubscribe guard).

#### `js/views/week-editor.js`

**Weekly reflection form** (`#/week/…/edit`).

| Behavior          | Role                                                      |
|-------------------|-----------------------------------------------------------|
| Goal context card | Shows previous week’s `goal1`/`goal2` (read-only context) |
| Section cards     | One card per field (German labels from `FIELD_LABELS`)    |
| Autosave          | Debounced 2s → `upsertEntry` → `localStorage`             |
| Actions           | Save, mark complete, export, preview read view            |

Cleanup on leave: final flush to store.

#### `js/views/week-read.js`

**Read-only week view** (`#/week/…/read`).

Displays all fields as text blocks, **Bearbeiten** → editor, draft/complete badge.

#### `js/views/search.js`

**Search results page** (`#/search/…`).

| Behavior    | Role                                                     |
|-------------|----------------------------------------------------------|
| Search form | Live debounced search (280ms) + submit                   |
| URL sync    | Updates hash with encoded query                          |
| Results     | Week label, field name, highlighted snippet, open button |
| Toolbar     | Theme switcher only (search form is on this page)        |

---

### `.github/workflows/`

#### `.github/workflows/pages.yml`

CI: on push to `main`/`master`, deploys the **entire repo root** as GitHub Pages (static site + `data/journal.json`).

---

### IDE / generated files

| Path              | Note                                     |
|-------------------|------------------------------------------|
| `.idea/`          | IntelliJ project settings (gitignored)   |
| `lernjournal.iml` | IntelliJ module file (gitignored)        |
| `node_modules/`   | Only if `npx serve` is used (gitignored) |

---

## Data schema

### `JournalFile`

```typescript
{
  version: number;      // currently 1
  entries: WeeklyEntry[];
}
```

### `WeeklyEntry`

| Field          | Type                      | Reflection question (DE)                    |
|----------------|---------------------------|---------------------------------------------|
| `weekKey`      | string                    | ISO week id `YYYY-Www`                      |
| `status`       | `"draft"` \| `"complete"` | —                                           |
| `datum`        | string                    | Datum (ISO date `YYYY-MM-DD`)               |
| `done`         | string                    | Was habe ich diese Woche gemacht/umgesetzt? |
| `methods`      | string                    | Welche Methoden habe ich verwendet?         |
| `learned`      | string                    | Was habe ich dabei gelernt?                 |
| `wentWell`     | string                    | Was ging gut?                               |
| `wentPoorly`   | string                    | Was ging nicht so gut?                      |
| `helpedBy`     | string                    | Wer oder was hat mir weitergeholfen?        |
| `improvements` | string                    | Was kann ich verbessern?                    |
| `goal1`        | string                    | Ziel 1 für nächste Woche                    |
| `goal2`        | string                    | Ziel 2 für nächste Woche                    |
| `createdAt`    | string                    | ISO 8601 timestamp                          |
| `updatedAt`    | string                    | ISO 8601 timestamp                          |

---

## Search UI

There are two search inputs implemented, but only one appears on the screen.

| Location         | File                                            | Screen                | Purpose                                                                                 |
|------------------|-------------------------------------------------|-----------------------|-----------------------------------------------------------------------------------------|
| **Schnellsuche** | `dashboard.js` → `renderDashboardSearchPreview` | Dashboard (`#/`)      | Submit navigates to `#/search/<query>`                                                  |
| **Search page**  | `search.js` → `renderSearch`                    | Search (`#/search/…`) | Input is pre-filled from URL, live debounced re-search updates results and URL in place |

Typing in Schnellsuche and pressing Enter navigates the user away from the dashboard to the search page, where the same query is already loaded. The dashboard searchbar is replaced by the search page UI (using different searchbar).
