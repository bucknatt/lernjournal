# Lernjournal

Weekly learning journal for my Stagestelle including self-reflection, goals, and a journey-map like UI. But that's not enough. Everything is styled in my favourite futuristc Hatsune Mikue theme!

## Run locally

```bash
npm run dev
```

Opens [http://localhost:8765](http://localhost:8765). Do not open via `file://` or **fetch** for `data/journal.json` will fail.

**Port already in use?** An old server may still be running. Stop it:

```bash
kill $(lsof -t -i:8765)
```

Alternatively, use `npm run dev:5173` to run on port 5173.

## Weekly reflection data fields

Each entry covers one calendar week and includes:

- Date
- What did I do/implement this week?
- Which methods did I use?
- What did I learn (technical, personal)?
- What went well? / What did not go so well?
- Who or what helped me?
- What can I improve?
- 2 goals for next week

## Data

- **Source of truth:** [`data/journal.json`](data/journal.json) in the repository (versioned with Git).
- **Draft cache:** browser `localStorage` (autosave while typing). On startup the app loads the **file first**; if an older browser draft differs, choose **Datei behalten** or **Entwurf laden** in the banner.
- **Saving to disk:** `Speichern` does **not** update `data/journal.json` by itself. For local git workflow either:
  1. **Link the file** (Chrome/Edge on `localhost`): **Sync & Backup → data/journal.json verknüpfen** — then every save writes to that file, or
  2. **Export:** **Export für Git** / **JSON exportieren** → replace `data/journal.json` → commit.

## How to sync across multiple devices

1. **Before writing:** `git pull` (or **Load from GitHub** in the app).
2. Edit in the app (cached locally).
3. **After writing:**
   - **Git:** **Export JSON** → replace `data/journal.json` → `git add data/journal.json && git commit -m "journal W20" && git push`
   - **GitHub API:** configure repo + PAT in settings → **Save to GitHub**

### Optionally use GitHub API

1. Create a fine-grained Personal Access Token with **Contents: Read and write** for this repo only.
2. In the app under **GitHub API**: enter `owner/repo` and the token.
3. Use **Load from GitHub** / **Save to GitHub** in the UI.

On conflicts (409): load first, then save again.

## Privacy

The visibilty will be set to private GitHub repository. Journal content lives in `journal.json` and in Git history. During development phase, this repository is public.

### Optionally use GitHub Pages

Deploy static files (`index.html`, `css/`, `js/`, `data/journal.json`) via GitHub Pages. Writes still go through export/Git or the GitHub API.
