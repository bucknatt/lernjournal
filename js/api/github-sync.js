import { normalizeJournalFile } from "../models/journal.js";
import { journalStore } from "../store/journal-store.js";

const JOURNAL_PATH = "data/journal.json";

/**
 * @param {string} repo owner/name
 * @param {string} token PAT
 */
async function githubFetch(repo, token, path, options = {}) {
  const url = `https://api.github.com/repos/${repo}/contents/${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
      ...(options.headers || {})
    }
  });

  if (!res.ok) {
    const body = await res.text();
    let msg = `GitHub API ${res.status}`;
    try {
      const j = JSON.parse(body);
      if (j.message) msg = j.message;
    } catch {
      /* ignore */
    }
    const err = new Error(msg);
    err.status = res.status;
    throw err;
  }

  return res.json();
}

/**
 * @returns {Promise<{ journal: import('../models/journal.js').JournalFile, sha: string }>}
 */
export async function loadJournalFromGithub() {
  const { repo, token } = journalStore.getGithubConfig();
  if (!repo || !token) {
    throw new Error("GitHub Repo und Token in den Einstellungen hinterlegen.");
  }

  const data = await githubFetch(repo, token, JOURNAL_PATH);
  if (!data.content) {
    throw new Error("Keine Datei-Inhalte von GitHub erhalten.");
  }

  const json = JSON.parse(atob(data.content.replace(/\n/g, "")));
  const journal = normalizeJournalFile(json);
  journalStore.setGithubSha(data.sha);
  return { journal, sha: data.sha };
}

/**
 * @param {import('../models/journal.js').JournalFile} journal
 */
export async function saveJournalToGithub(journal) {
  const { repo, token } = journalStore.getGithubConfig();
  if (!repo || !token) {
    throw new Error("GitHub Repo und Token in den Einstellungen hinterlegen.");
  }

  let sha = journalStore.getGithubConfig().sha;
  if (!sha) {
    try {
      const existing = await githubFetch(repo, token, JOURNAL_PATH);
      sha = existing.sha;
      journalStore.setGithubSha(sha);
    } catch (err) {
      if (/** @type {{ status?: number }} */ (err).status !== 404) throw err;
    }
  }

  const content = btoa(unescape(encodeURIComponent(JSON.stringify(journal, null, 2) + "\n")));

  const body = {
    message: `journal update ${new Date().toISOString().slice(0, 10)}`,
    content,
    ...(sha ? { sha } : {})
  };

  try {
    const data = await githubFetch(repo, token, JOURNAL_PATH, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    if (data.content?.sha) {
      journalStore.setGithubSha(data.content.sha);
    }
    journalStore.replaceJournal(journal);
    journalStore.markSyncedFromRepo();
    return data;
  } catch (err) {
    if (err.status === 409) {
      throw new Error(
        "Konflikt: journal.json wurde auf GitHub geändert. Zuerst „Von GitHub laden“, dann erneut speichern."
      );
    }
    throw err;
  }
}
