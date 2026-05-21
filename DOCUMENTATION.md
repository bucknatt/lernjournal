# Software Documentation for Lernjournal Web App

Weekly apprenticeship reflection journal: a static Single-Page Application using Vanilla JS (no build step) with a Hatsune Miku-themed and dashboard-like UI, and JSON-based persistence.

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

| Layer | Responsibility |
|-------|----------------|
| **Models** | Data shapes, validation, German field labels |
| **Store** | Single source of truth in memory, dirty tracking, pub/sub |
| **API** | Load/save JSON file, GitHub Contents API |
| **Utils** | ISO weeks, themes, full-text search |
| **Views** | DOM rendering per screen (no framework) |
| **CSS** | Miku design tokens + layout + components |

There is **no backend server**. The app must be served over HTTP (`npm run dev`) so `fetch('./data/journal.json')` works.

---

## Data flow

### Startup (`journal-store.init`)

1. `fetchJournalFromRepo()` loads `data/journal.json`.
2. `syncedSnapshot` is set to that file’s JSON string (baseline for “dirty” detection).
3. The in-memory journal **always starts from the file** (file-first).
4. If `localStorage` draft differs from the file, a **conflict banner** appears; the user chooses **Datei behalten** or **Entwurf laden**.
5. `localStorage` is updated only after user edits (`_touch`) or when resolving sync (reload, GitHub save, dismiss conflict).

### Dirty state (`isDirty`)

`isDirty === true` when the in-memory journal differs from `syncedSnapshot` (last known `data/journal.json` state). This drives the **„Lokal geändert“** / **„Ungespeicherte lokale Änderungen“** badges.

Clearing dirty state:

- `markSyncedFromRepo()` — after reload from file or successful GitHub save
- `replaceJournal()` — replaces data and sets synced baseline to the new data

### Persistence paths

| Action | What happens |
|--------|----------------|
| Typing in editor | `upsertEntry` → `_touch` → `localStorage` draft (+ linked file if configured) |
| Link `data/journal.json` | File System Access API (Chromium, `localhost`) — `writeToLinkedFile` on each `_touch` |
| Export JSON | Downloads `journal.json`; user commits to git manually (all browsers) |
| Reload from file | `reloadFromFile()` → `replaceJournal` |
| GitHub load | API GET → `replaceJournal` |
| GitHub save | API PUT with `sha` → `markSyncedFromRepo` |

---

## Routing

Hash-based SPA (no server rewrites needed for GitHub Pages).

| Hash | View | Module |
|------|------|--------|
| `#/` or empty | Dashboard | `dashboard.js` |
| `#/week/2026-W20/edit` | Week editor | `week-editor.js` |
| `#/week/2026-W20/read` | Week read-only | `week-read.js` |
| `#/week/2026-W20` | Week editor (default) | `week-editor.js` |
| `#/new` or `#/new/2026-W20` | New/edit week | `week-editor.js` |
| `#/search/query+terms` | Search results | `search.js` |

`router.js` calls a **cleanup function** from the previous view before rendering the next (unsubscribe listeners, flush autosave).

---

## localStorage keys

| Key | Purpose |
|-----|---------|
| `lernjournal-draft-v1` | Full journal JSON cache (aligned with file after load; updated on edit) |
| `lernjournal-has-unsaved-edits` | Set when the user edits in the app (`_touch`) |
| `lernjournal-miku-theme` | Active theme: `MinimalMiku`, `Concert`, `NightNeon`, `SnowMiku` |
| `lernjournal-github-repo` | `owner/repo` for API sync |
| `lernjournal-github-token` | Fine-grained PAT (Contents read/write) |
| `lernjournal-github-sha` | Git blob SHA for optimistic updates on PUT |

---

## File reference

### Root

#### `index.html`

Entry HTML document.

| Part | Role |
|------|------|
| `<head>` fonts | Nunito from Google Fonts (body); Too Freakin Cute Demo self-hosted in `fonts/` (titles) |
| CSS links | `miku-tokens.css` → `layout.css` → `components.css` (cascade order) |
| `body[data-miku-theme="MinimalMiku"]` | Default theme; updated by `theme.js` |
| `#app.app-shell` | Mount point; all views render inside this div |
| `js/main.js` | ES module entry (deferred via `type="module"`) |

#### `package.json`

npm metadata and dev scripts only (no runtime dependencies).

| Script | Command | Purpose |
|--------|---------|---------|
| `dev` / `start` | `python3 -m http.server 8765` | Local static server (default port 8765) |
| `dev:5173` | Python server on 5173 | Alternative port |
| `dev:npx` | `npx serve` | Optional; needs npm registry |

#### `README.md`

User-facing quick start: run locally, sync, privacy, features.

#### `DOCUMENTATION.md`

This file — technical reference for developers.

#### `.gitignore`

Excludes `node_modules/`, IDE files (`.idea/`, `*.iml`), `out/`, logs.

---

### `fonts/`

#### `fonts/TooFreakinCuteDemo.ttf`

Display font for titles (`--font-display`). Sourced from [1001fonts – Too Freakin Cute Demo](https://www.1001fonts.com/too-freakin-cute-demo-font.html) (Misti's Fonts). Week ranges use `.week-range-label` (Nunito) instead.

#### `fonts/README.md`

License and attribution notes for bundled fonts.

---

### `data/`

#### `data/journal.json`

**Source of truth** for journal content in git.

```json
{
  "version": 1,
  "entries": [ /* WeeklyEntry objects */ ]
}
```

Committed to the repository. Personal content — use a **private** repo.

---

### `css/`

#### `css/miku-tokens.css`

Miku Hybrid color system (ported from [mitsu-plugin](https://github.com/...) `styles.css`).

| Section | Role |
|---------|------|
| `@font-face` | Self-hosted **Too Freakin Cute Demo** for `--font-display` |
| `:root` | Base palette (`--palette-19601-*`, `--palette-pop-*`) and default `--miku-*` variables, fonts, radii, glow shadow |
| `body[data-miku-theme="MinimalMiku"]` | Softer teal/pink gradient (default) |
| `body[data-miku-theme="Concert"]` | Brighter neon, higher contrast text |
| `body[data-miku-theme="NightNeon"]` | Darker bg, radial cyan glow, strong neon |
| `body[data-miku-theme="SnowMiku"]` | Cooler, lighter “winter” palette |
Theme switching only changes CSS variables via `document.body.dataset.mikuTheme`.

#### `css/layout.css`

Page structure and typography.

| Selector | Role |
|----------|------|
| `body` | Font, text color, gradient background |
| `.app-shell` | Centered column, max-width 1100px |
| `.page-header` / `.page-title` | Gradient title text |
| `.page-subtitle`, `.muted` | Secondary text |
| `.week-range-label` | `KW … · date – date` lines (body font, not display font) |
| `.nav-back` | Back link styling |
| `.error-panel` | Bootstrap failure UI from `main.js` |
| `code` | Inline code in help text |

#### `css/components.css`

Reusable UI components.

| Section | Role |
|---------|------|
| `.btn`, `.btn-primary`, `.btn-ghost` | Buttons with Miku glow |
| `.card`, `.card-grid`, `.hero` | Content containers |
| `.badge`, `.badge-warn`, `.badge-success` | Status pills (incl. „Lokal geändert“) |
| `.journey-*` | Horizontal week timeline nodes |
| `.goal-chips` | Previous week’s goals display |
| `.form-section` | Editor labels + inputs |
| `.settings-panel` | Sync/backup/GitHub UI |
| `.app-toolbar`, `.toolbar-search` | Top search + theme row |
| `.theme-switcher` | Theme dropdown + cycle button |
| `.search-*` | Search form, results list, `<mark>` highlights |
| `.status-toast` | Temporary feedback messages |

---

### `js/`

#### `js/main.js`

Application bootstrap.

1. `initTheme()` — restore theme from `localStorage`
2. `journalStore.init()` — load JSON + merge draft
3. `initRouter()` — start hash navigation

On failure (e.g. `file://`, missing JSON), renders `.error-panel` with instructions.

---

#### `js/router.js`

Client-side router.

| Export / symbol | Role |
|-----------------|------|
| `parseRoute()` | Parses `location.hash` into `{ name, weekKey?, query? }` |
| `navigateTo(hash)` | Sets hash or re-renders if already on same hash |
| `renderCurrentRoute()` | Runs previous view’s cleanup, mounts matching view |
| `initRouter()` | Registers `hashchange` listener, initial render |
| `currentCleanup` | Teardown from active view (subscriptions, timers) |

---

### `js/models/`

#### `js/models/journal.js`

Domain types and normalization (framework-agnostic).

| Export | Role |
|--------|------|
| `JOURNAL_VERSION` | Schema version constant (`1`) |
| `FIELD_LABELS` | German UI labels for each field |
| `REFLECTION_FIELDS` | Keys for the seven reflection text areas |
| `createEmptyEntry(weekKey)` | New draft entry with today’s date |
| `normalizeJournalFile(data)` | Safe parse of root JSON object |
| `normalizeEntry(entry)` | Coerce one entry; invalid → `null` |
| `isEntryComplete(entry)` | All required fields non-empty (optional helper) |

**WeeklyEntry fields:** `weekKey`, `status` (`draft`|`complete`), `datum`, `done`, `methods`, `learned`, `wentWell`, `wentPoorly`, `helpedBy`, `improvements`, `goal1`, `goal2`, `createdAt`, `updatedAt`.

---

### `js/store/`

#### `js/store/journal-store.js`

Central state module (singleton `journalStore`).

| Method | Role |
|--------|------|
| `init()` | Load file + draft; set `syncedSnapshot` |
| `getState()` | `{ journal, isDirty, currentWeekKey }` |
| `subscribe(fn)` | Listen for changes; returns unsubscribe |
| `getEntry(weekKey)` | Find one entry or `null` |
| `getAllEntries()` | Sorted copy of entries |
| `getTimelineWeekKeys()` | Week keys for journey map |
| `getPreviousEntry(weekKey)` | Prior week’s entry (goal carry-over context) |
| `getOrCreateEntry(weekKey)` | Get or insert empty draft |
| `upsertEntry(entry)` | Insert/update with fresh `updatedAt` |
| `markComplete(weekKey)` | Set `status: complete` |
| `getCompletedCount()` | Count completed weeks |
| `getStreak()` | Consecutive completed weeks ending at current |
| `_touch()` | Persist to `localStorage` + notify listeners |
| `replaceJournal(data)` | Replace all data; mark as synced |
| `markSyncedFromRepo()` | Current data matches file baseline |
| `exportJson()` | Trigger download |
| `importJson()` | File picker → replace journal |
| `getGithubConfig` / `setGithubConfig` / `setGithubSha` | GitHub API credentials |

---

### `js/api/`

#### `js/api/load-journal.js`

File-based I/O (no network except `fetch` to same origin).

| Function | Role |
|----------|------|
| `fetchJournalFromRepo()` | GET `./data/journal.json`, normalize |
| `downloadJournalJson(journal)` | Browser download of pretty-printed JSON |
| `importJournalFromFile()` | Hidden `<input type="file">` → parse JSON |

#### `js/api/github-sync.js`

GitHub [Contents API](https://docs.github.com/en/rest/repos/contents) for `data/journal.json`.

| Function | Role |
|----------|------|
| `githubFetch()` | Authenticated request helper; attaches error `.status` |
| `loadJournalFromGithub()` | GET file, base64-decode, store `sha` |
| `saveJournalToGithub(journal)` | PUT with `sha`; handles 409 conflict message |

---

### `js/utils/`

#### `js/utils/dates.js`

ISO week calendar helpers (UTC-based).

| Function | Role |
|----------|------|
| `getWeekKey(date?)` | e.g. `"2026-W20"` for current or given date |
| `parseWeekKey(weekKey)` | `{ year, week }` or `null` |
| `weekKeyToDate(weekKey)` | Monday of that ISO week |
| `formatWeekLabel(weekKey)` | German range label for UI |
| `getPreviousWeekKey(weekKey)` | One week earlier |
| `buildTimelineWeekKeys(existingKeys)` | Ordered list from earliest entry through current week |
| `formatDateDe(date?)` | `de-CH` date formatting |

#### `js/utils/theme.js`

Theme persistence and UI (matches Miku Hybrid Plugin modes).

| Export | Role |
|--------|------|
| `THEME_MODES` | `MinimalMiku`, `Concert`, `NightNeon`, `SnowMiku` |
| `THEME_LABELS` | Human-readable names in dropdown |
| `getTheme()` / `setTheme()` / `cycleTheme()` | Read/write `body.dataset.mikuTheme` + `localStorage` |
| `initTheme()` | Apply saved theme on load |
| `renderThemeSwitcher(parent, opts)` | `<select>` + ↻ cycle button |

#### `js/utils/search.js`

Full-text search across entries.

| Function | Role |
|----------|------|
| `searchEntries(query, entries)` | Returns `SearchMatch[]` (min 2 chars, multi-word AND) |
| `highlightSnippet(text, query)` | Wraps matches in `<mark>` for results HTML |

Searches: all reflection fields, goals, `datum`, and `weekKey`. One best match per `weekKey:field`; sorted by score.

---

### `js/views/`

#### `js/views/ui.js`

Shared UI building blocks.

| Export | Role |
|--------|------|
| `showToast(message, type?)` | Fixed bottom-right notification (4s) |
| `renderAppHeader(...)` | Title, subtitle, optional back link |
| `renderAppToolbar(...)` | Toolbar search (optional) + theme switcher |
| `renderSettingsPanel(...)` | Export/import/reload, GitHub sync, PAT settings |

#### `js/views/dashboard.js`

Main **journey map** screen (`#/`).

| Section | Role |
|---------|------|
| Hero | Current week label, CTA (write/continue/view), dirty badge |
| Card grid | Streak, last week summary, goals from previous week |
| Schnellsuche | Large search form (same destination as toolbar search) |
| Journey track | Clickable week nodes: empty / draft / complete / current |
| Settings panel | Sync & backup (from `ui.js`) |

Subscribes to `journalStore` to re-render on changes (with unsubscribe guard).

#### `js/views/week-editor.js`

**Weekly reflection form** (`#/week/…/edit`).

| Behavior | Role |
|----------|------|
| Goal context card | Shows previous week’s `goal1`/`goal2` (read-only context) |
| Section cards | One card per field (German labels from `FIELD_LABELS`) |
| Autosave | Debounced 2s → `upsertEntry` → `localStorage` |
| Actions | Save, mark complete, export, preview read view |

Cleanup on leave: final flush to store.

#### `js/views/week-read.js`

**Read-only week view** (`#/week/…/read`).

Displays all fields as text blocks; **Bearbeiten** → editor; draft/complete badge.

#### `js/views/search.js`

**Search results page** (`#/search/…`).

| Behavior | Role |
|----------|------|
| Search form | Live debounced search (280ms) + submit |
| URL sync | Updates hash with encoded query |
| Results | Week label, field name, highlighted snippet, open button |
| Toolbar | Theme only (`showSearch: false` to avoid duplicate bar) |

---

### `.github/workflows/`

#### `.github/workflows/pages.yml`

CI: on push to `main`/`master`, deploys the **entire repo root** as GitHub Pages (static site + `data/journal.json`).

---

### IDE / generated (not part of app runtime)

| Path | Note |
|------|------|
| `.idea/` | IntelliJ project settings (gitignored) |
| `lernjournal.iml` | IntelliJ module file (gitignored) |
| `node_modules/` | Only if `npx serve` is used (gitignored) |

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

| Field | Type | Reflection question (DE) |
|-------|------|---------------------------|
| `weekKey` | string | ISO week id `YYYY-Www` |
| `status` | `"draft"` \| `"complete"` | — |
| `datum` | string | Datum (ISO date `YYYY-MM-DD`) |
| `done` | string | Was habe ich diese Woche gemacht/umgesetzt? |
| `methods` | string | Welche Methoden habe ich verwendet? |
| `learned` | string | Was habe ich dabei gelernt? |
| `wentWell` | string | Was ging gut? |
| `wentPoorly` | string | Was ging nicht so gut? |
| `helpedBy` | string | Wer oder was hat mir weitergeholfen? |
| `improvements` | string | Was kann ich verbessern? |
| `goal1` | string | Ziel 1 für nächste Woche |
| `goal2` | string | Ziel 2 für nächste Woche |
| `createdAt` | string | ISO 8601 timestamp |
| `updatedAt` | string | ISO 8601 timestamp |

---

## Duplicate UI note (search)

Two search inputs exist by design:

| Location | File | Purpose |
|----------|------|---------|
| **Toolbar** | `ui.js` → `renderAppToolbar` | Quick search from any main screen |
| **Schnellsuche** | `dashboard.js` → `renderDashboardSearchPreview` | Prominent entry on home page |

Both navigate to `#/search/<query>` and use the same `searchEntries()` logic.
