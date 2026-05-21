import { journalStore } from "../store/journal-store.js";

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
  h1.className = "page-title";
  h1.textContent = title;
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
 * @param {HTMLElement} parent
 * @param {{ navigateTo: (hash: string) => void }} ctx
 */
export function renderSettingsPanel(parent, ctx) {
  const panel = document.createElement("section");
  panel.className = "settings-panel";
  const title = document.createElement("h3");
  title.textContent = "Sync & Backup";
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
      const { fetchJournalFromRepo } = await import("../api/load-journal.js");
      const data = await fetchJournalFromRepo();
      journalStore.replaceJournal(data);
      journalStore.markSyncedFromRepo();
      showToast("Aus data/journal.json geladen.");
      ctx.navigateTo(location.hash || "#/");
    } catch (e) {
      showToast(/** @type {Error} */ (e).message, "error");
    }
  };

  btnRow.append(exportBtn, importBtn, reloadBtn);
  panel.appendChild(btnRow);

  const ghRow = document.createElement("div");
  ghRow.className = "btn-group";
  ghRow.style.marginTop = "0.5rem";

  const ghLoad = document.createElement("button");
  ghLoad.type = "button";
  ghLoad.className = "btn btn-small";
  ghLoad.textContent = "Von GitHub laden";
  ghLoad.onclick = async () => {
    try {
      const { loadJournalFromGithub } = await import("../api/github-sync.js");
      const { journal } = await loadJournalFromGithub();
      journalStore.replaceJournal(journal);
      showToast("Von GitHub geladen.");
      ctx.navigateTo(location.hash || "#/");
    } catch (e) {
      showToast(/** @type {Error} */ (e).message, "error");
    }
  };

  const ghSave = document.createElement("button");
  ghSave.type = "button";
  ghSave.className = "btn btn-primary btn-small";
  ghSave.textContent = "Nach GitHub speichern";
  ghSave.onclick = async () => {
    try {
      const { saveJournalToGithub } = await import("../api/github-sync.js");
      const { journal } = journalStore.getState();
      await saveJournalToGithub(journal);
      showToast("Auf GitHub gespeichert.");
    } catch (e) {
      showToast(/** @type {Error} */ (e).message, "error");
    }
  };

  ghRow.append(ghLoad, ghSave);
  panel.appendChild(ghRow);

  const details = document.createElement("details");
  const summary = document.createElement("summary");
  summary.textContent = "GitHub API (optional)";
  details.appendChild(summary);

  const cfg = journalStore.getGithubConfig();

  const repoLabel = document.createElement("label");
  repoLabel.textContent = "Repository (owner/name)";
  const repoInput = document.createElement("input");
  repoInput.type = "text";
  repoInput.placeholder = "mein-user/lernjournal";
  repoInput.value = cfg.repo;

  const tokenLabel = document.createElement("label");
  tokenLabel.textContent = "Fine-grained PAT (Contents read/write)";
  const tokenInput = document.createElement("input");
  tokenInput.type = "password";
  tokenInput.placeholder = "github_pat_…";
  tokenInput.value = cfg.token;

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
    "<strong>Git-Workflow:</strong> <code>git pull</code> → bearbeiten → Export oder „Nach GitHub speichern“ → <code>git push</code>. Privates Repo empfohlen.";
  details.appendChild(help);
  panel.appendChild(details);

  parent.appendChild(panel);
}
