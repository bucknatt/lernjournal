import { journalStore } from "../store/journal-store.js";
import { renderThemeSwitcher } from "../utils/theme.js";
import { decorateDisplayTitle, decorateCardTitle } from "../utils/font-decor.js";

/**
 * @param {string} message
 * @param {'info' | 'error'} [type]
 */
export function showToast(message, type = "info") {
  const existing = document.querySelector(".status-toast");
  if (existing) existing.remove();

  const el = document.createElement("div");
  el.className = `status-toast${type === "error" ? " status-toast--error" : ""}`;
  el.textContent = message;
  document.body.appendChild(el);

  setTimeout(() => el.remove(), 4000);
}

/**
 * @param {HTMLElement} container
 */
export function renderAppHeader(container, { title, subtitle, backHref, backLabel = "← Zurück" }) {
  if (backHref) {
    const back = document.createElement("a");
    back.className = "nav-back";
    back.href = backHref;
    back.textContent = backLabel;
    container.appendChild(back);
  }

  const header = document.createElement("header");
  header.className = "page-header";

  const text = document.createElement("div");
  const h1 = document.createElement("h1");
  h1.className = "page-title display-decor";
  h1.textContent = decorateDisplayTitle(title);
  text.appendChild(h1);

  if (subtitle) {
    const p = document.createElement("p");
    p.className = "page-subtitle";
    p.textContent = subtitle;
    text.appendChild(p);
  }

  header.appendChild(text);
  container.appendChild(header);
  return header;
}

/**
 * Global toolbar: theme switcher.
 * @param {HTMLElement} container
 */
export function renderAppToolbar(container) {
  const bar = document.createElement("div");
  bar.className = "app-toolbar";

  renderThemeSwitcher(bar, { compact: true });

  container.appendChild(bar);
  return bar;
}

/**
 * Banner when journal.json and localStorage draft differ.
 * @param {HTMLElement} container
 */
export function renderConflictBanner(container) {
  const existing = container.querySelector(".sync-conflict-banner");
  if (existing) existing.remove();

  if (!journalStore.getState().hasConflict) return null;

  const banner = document.createElement("section");
  banner.className = "sync-conflict-banner card";
  banner.setAttribute("role", "alert");

  const title = document.createElement("h3");
  title.textContent = "Datenquelle wählen";
  banner.appendChild(title);

  const text = document.createElement("p");
  text.textContent =
    "data/journal.json und der lokale Entwurf im Browser sind unterschiedlich. Standardmässig wird die Datei angezeigt.";
  banner.appendChild(text);

  const actions = document.createElement("div");
  actions.className = "btn-group";

  const keepFile = document.createElement("button");
  keepFile.type = "button";
  keepFile.className = "btn btn-primary btn-small";
  keepFile.textContent = "Datei behalten";
  keepFile.onclick = () => {
    journalStore.dismissPendingConflict();
    showToast("journal.json wird verwendet.");
  };

  const keepDraft = document.createElement("button");
  keepDraft.type = "button";
  keepDraft.className = "btn btn-small";
  keepDraft.textContent = "Entwurf laden";
  keepDraft.onclick = () => {
    journalStore.applyPendingDraft();
    showToast("Lokaler Entwurf geladen.");
  };

  actions.append(keepFile, keepDraft);
  banner.appendChild(actions);
  container.appendChild(banner);
  return banner;
}

/**
 * @param {HTMLElement} parent
 * @param {{ navigateTo: (hash: string) => void }} ctx
 */
export function renderSettingsPanel(parent, ctx) {
  const panel = document.createElement("section");
  panel.className = "settings-panel";
  const title = document.createElement("h3");
  title.className = "display-decor";
  title.textContent = decorateCardTitle("Sync & Backup");
  panel.appendChild(title);

  if (journalStore.getState().isDirty) {
    const warn = document.createElement("p");
    warn.className = "badge badge-warn";
    warn.textContent = "Ungespeicherte lokale Änderungen";
    warn.style.marginBottom = "0.75rem";
    panel.appendChild(warn);
  }

  const btnRow = document.createElement("div");
  btnRow.className = "btn-group";

  const exportBtn = document.createElement("button");
  exportBtn.type = "button";
  exportBtn.className = "btn btn-ghost btn-small";
  exportBtn.textContent = "JSON exportieren";
  exportBtn.onclick = () => {
    journalStore.exportJson();
    showToast("journal.json heruntergeladen — in data/ ersetzen und git commit.");
  };

  const importBtn = document.createElement("button");
  importBtn.type = "button";
  importBtn.className = "btn btn-ghost btn-small";
  importBtn.textContent = "JSON importieren";
  importBtn.onclick = async () => {
    try {
      await journalStore.importJson();
      showToast("Journal importiert.");
      ctx.navigateTo("#/");
    } catch (e) {
      showToast(/** @type {Error} */ (e).message, "error");
    }
  };

  const reloadBtn = document.createElement("button");
  reloadBtn.type = "button";
  reloadBtn.className = "btn btn-ghost btn-small";
  reloadBtn.textContent = "Von Datei neu laden";
  reloadBtn.onclick = async () => {
    try {
      await journalStore.reloadFromFile();
      showToast("Aus data/journal.json geladen.");
      ctx.navigateTo(location.hash || "#/");
    } catch (e) {
      showToast(/** @type {Error} */ (e).message, "error");
    }
  };

  btnRow.append(exportBtn, importBtn, reloadBtn);
  panel.appendChild(btnRow);

  const state = journalStore.getState();
  const fileRow = document.createElement("div");
  fileRow.className = "btn-group";
  fileRow.style.marginTop = "0.5rem";

  if (state.fileSyncSupported) {
    const linkHint = document.createElement("p");
    linkHint.className = "muted";
    linkHint.style.fontSize = "0.85rem";
    linkHint.style.margin = "0 0 0.5rem";
    linkHint.textContent = state.linkedFileName
      ? `Verknüpft mit: ${state.linkedFileName} — Speichern schreibt direkt in die Datei (git push).`
      : "Verknüpfe data/journal.json, damit Speichern die Projektdatei aktualisiert (Chrome/Edge, localhost).";
    panel.appendChild(linkHint);

    const linkBtn = document.createElement("button");
    linkBtn.type = "button";
    linkBtn.className = "btn btn-small";
    linkBtn.textContent = state.linkedFileName ? "Andere Datei wählen" : "data/journal.json verknüpfen";
    linkBtn.onclick = async () => {
      try {
        const name = await journalStore.linkLocalFile();
        showToast(`Verknüpft mit ${name}.`);
        ctx.navigateTo(location.hash || "#/");
      } catch (e) {
        showToast(/** @type {Error} */ (e).message, "error");
      }
    };

    const unlinkBtn = document.createElement("button");
    unlinkBtn.type = "button";
    unlinkBtn.className = "btn btn-ghost btn-small";
    unlinkBtn.textContent = "Verknüpfung lösen";
    unlinkBtn.disabled = !state.linkedFileName;
    unlinkBtn.onclick = async () => {
      await journalStore.unlinkLocalFile();
      showToast("Dateiverknüpfung entfernt.");
      ctx.navigateTo(location.hash || "#/");
    };

    fileRow.append(linkBtn, unlinkBtn);
  } else {
    const fileHint = document.createElement("p");
    fileHint.className = "muted";
    fileHint.style.fontSize = "0.85rem";
    fileHint.textContent =
      "Direktes Schreiben in data/journal.json ist in diesem Browser nicht möglich — nutze «JSON exportieren» und ersetze die Datei manuell.";
    panel.appendChild(fileHint);
  }

  panel.appendChild(fileRow);

  const cfg = journalStore.getGithubConfig();

  const repoLabel = document.createElement("label");
  repoLabel.textContent = "Repository (owner/name)";
  const repoInput = document.createElement("input");
  repoInput.type = "text";
  repoInput.placeholder = "bucknatt/lernjournal";
  repoInput.value = cfg.repo;

  const tokenLabel = document.createElement("label");
  tokenLabel.textContent = "Fine-grained PAT (Contents read/write)";
  const tokenInput = document.createElement("input");
  tokenInput.type = "password";
  tokenInput.placeholder = "github_pat_…";
  tokenInput.value = cfg.token;

  function applyGithubInputsFromForm() {
    if (repoInput.value.trim() || tokenInput.value.trim()) {
      journalStore.setGithubConfig({
        repo: repoInput.value,
        token: tokenInput.value
      });
    }
  }

  const ghHint = document.createElement("p");
  ghHint.className = "muted";
  ghHint.style.fontSize = "0.85rem";
  ghHint.style.margin = "0.75rem 0 0.5rem";
  ghHint.textContent =
    "Repository und Token unten ausfüllen; beim Laden/Speichern werden sie automatisch übernommen.";
  panel.appendChild(ghHint);

  const ghRow = document.createElement("div");
  ghRow.className = "btn-group";

  const ghLoad = document.createElement("button");
  ghLoad.type = "button";
  ghLoad.className = "btn btn-small";
  ghLoad.textContent = "Von GitHub laden";
  ghLoad.onclick = async () => {
    const loadLabel = ghLoad.textContent;
    ghLoad.disabled = true;
    ghLoad.textContent = "Lädt…";
    try {
      applyGithubInputsFromForm();
      const { loadJournalFromGithub } = await import("../api/github-sync.js");
      const { journal } = await loadJournalFromGithub();
      journalStore.replaceJournal(journal);
      showToast("Von GitHub geladen.");
      ctx.navigateTo(location.hash || "#/");
    } catch (e) {
      showToast(/** @type {Error} */ (e).message, "error");
    } finally {
      ghLoad.disabled = false;
      ghLoad.textContent = loadLabel;
    }
  };

  const ghSave = document.createElement("button");
  ghSave.type = "button";
  ghSave.className = "btn btn-primary btn-small";
  ghSave.textContent = "Nach GitHub speichern";
  ghSave.onclick = async () => {
    const saveLabel = ghSave.textContent;
    ghSave.disabled = true;
    ghSave.textContent = "Speichert…";
    try {
      applyGithubInputsFromForm();
      const { saveJournalToGithub } = await import("../api/github-sync.js");
      const { journal } = journalStore.getState();
      await saveJournalToGithub(journal);
      showToast("Auf GitHub gespeichert.");
    } catch (e) {
      showToast(/** @type {Error} */ (e).message, "error");
    } finally {
      ghSave.disabled = false;
      ghSave.textContent = saveLabel;
    }
  };

  ghRow.append(ghLoad, ghSave);
  panel.appendChild(ghRow);

  const details = document.createElement("details");
  const summary = document.createElement("summary");
  summary.textContent = "GitHub API (optional)";
  details.appendChild(summary);

  const saveCfg = document.createElement("button");
  saveCfg.type = "button";
  saveCfg.className = "btn btn-ghost btn-small";
  saveCfg.textContent = "Einstellungen speichern";
  saveCfg.onclick = () => {
    journalStore.setGithubConfig({
      repo: repoInput.value,
      token: tokenInput.value
    });
    showToast("GitHub-Einstellungen gespeichert (lokal).");
  };

  details.append(repoLabel, repoInput, tokenLabel, tokenInput, saveCfg);

  const help = document.createElement("p");
  help.className = "muted";
  help.style.fontSize = "0.82rem";
  help.style.marginTop = "0.75rem";
  help.innerHTML =
    "<strong>Git-Workflow:</strong> <code>git pull</code> → bearbeiten → Export oder „Nach GitHub speichern“ → <code>git push</code>.";
  details.appendChild(help);
  panel.appendChild(details);

  parent.appendChild(panel);
}
