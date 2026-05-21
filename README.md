# Lernjournal

Wöchentliches Lernjournal für die Lehre — Reflexion, Ziele und eine Journey-Map-Oberfläche im Miku-Hybrid-Theme.

## Starten (lokal)

```bash
npm run dev
# oder: python3 -m http.server 5173
```

Öffne [http://localhost:5173](http://localhost:5173). **Nicht** per `file://` öffnen (`fetch` für `data/journal.json` schlägt sonst fehl).

Falls `npm run dev:npx` (mit `serve`) gewünscht ist, wird dafür ein Zugriff auf registry.npmjs.org benötigt.

## Wochenrückblick-Felder

Jeder Eintrag pro Kalenderwoche (ISO) enthält:

- Datum
- Was habe ich diese Woche gemacht/umgesetzt?
- Welche Methoden habe ich verwendet?
- Was habe ich dabei gelernt (fachlich, persönlich)?
- Was ging gut? / Was ging nicht so gut?
- Wer oder was hat mir weitergeholfen?
- Was kann ich verbessern?
- 2 Ziele für nächste Woche

## Daten

- **Quelle:** [`data/journal.json`](data/journal.json) im Repository (versioniert mit Git).
- **Entwurf:** Browser-`localStorage` (Autosave beim Tippen).

## Mehrere Geräte (Sync)

1. **Vor dem Schreiben:** `git pull` (oder in der App „Von GitHub laden“).
2. App bearbeiten (lokal zwischengespeichert).
3. **Nach dem Schreiben:**
   - **Git:** „JSON exportieren“ → `data/journal.json` ersetzen → `git add data/journal.json && git commit -m "journal Wxx" && git push`
   - **GitHub API:** Repo + PAT in Einstellungen → „Nach GitHub speichern“

### GitHub API (optional)

1. Fine-grained Personal Access Token mit **Contents: Read and write** nur für dieses Repo.
2. In der App unter „GitHub API“: `owner/repo` und Token eintragen.
3. „Von GitHub laden“ / „Nach GitHub speichern“ nutzen.

Bei Konflikten (409): zuerst laden, dann erneut speichern.

## Privatsphäre

Nutze ein **privates** GitHub-Repository — der Journal-Inhalt liegt in `journal.json` und in der Git-Historie.

## GitHub Pages (optional)

Statische Dateien (`index.html`, `css/`, `js/`, `data/journal.json`) können auf GitHub Pages deployed werden. Schreiben erfolgt weiterhin per Export/Git oder GitHub API.

## Struktur

```
index.html
css/          # Miku-Theme
js/
  models/     # Datenmodell
  store/      # Journal-State
  api/        # Laden, GitHub-Sync
  views/      # Dashboard, Editor, Lesen
data/journal.json
```

Später möglich: Angular-Port der Views bei gleichem JSON-Schema.
