import {
  createEmptyEntry,
  normalizeJournalFile,
  normalizeEntry
} from "../models/journal.js";
import { fetchJournalFromRepo, downloadJournalJson, importJournalFromFile } from "../api/load-journal.js";
import { getWeekKey, getPreviousWeekKey, buildTimelineWeekKeys } from "../utils/dates.js";

const DRAFT_STORAGE_KEY = "lernjournal-draft-v1";
const UNSAVED_EDITS_KEY = "lernjournal-has-unsaved-edits";
const GITHUB_SHA_KEY = "lernjournal-github-sha";
const GITHUB_REPO_KEY = "lernjournal-github-repo";
const GITHUB_TOKEN_KEY = "lernjournal-github-token";

/** @type {import('../models/journal.js').JournalFile} */
let journal = { version: 1, entries: [] };
/** @type {string | null} */
let syncedSnapshot = null;
/** @type {'file' | 'draft'} */
let dataSource = "file";
/** @type {{ file: import('../models/journal.js').JournalFile, draft: import('../models/journal.js').JournalFile } | null} */
let pendingConflict = null;
/** @type {Set<(state: object) => void>} */
const listeners = new Set();

function notify() {
  const state = journalStore.getState();
  listeners.forEach((fn) => fn(state));
}

function persistDraftToLocalStorage() {
  localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(journal));
}

function loadDraftFromLocalStorage() {
  const raw = localStorage.getItem(DRAFT_STORAGE_KEY);
  if (!raw) return null;
  try {
    return normalizeJournalFile(JSON.parse(raw));
  } catch {
    return null;
  }
}

function snapshot(data) {
  return JSON.stringify(data);
}

function setUnsavedFlag(active) {
  if (active) {
    localStorage.setItem(UNSAVED_EDITS_KEY, "true");
  } else {
    localStorage.removeItem(UNSAVED_EDITS_KEY);
  }
}

function syncLocalCacheToJournal() {
  persistDraftToLocalStorage();
  setUnsavedFlag(false);
}

export const journalStore = {
  async init() {
    const fromRepo = await fetchJournalFromRepo();
    const draft = loadDraftFromLocalStorage();

    syncedSnapshot = snapshot(fromRepo);
    journal = fromRepo;
    dataSource = "file";
    pendingConflict = null;

    if (draft && snapshot(draft) !== syncedSnapshot) {
      pendingConflict = {
        file: fromRepo,
        draft
      };
    } else {
      syncLocalCacheToJournal();
    }

    notify();
  },

  getState() {
    return {
      journal: { ...journal, entries: [...journal.entries] },
      isDirty: syncedSnapshot !== null && snapshot(journal) !== syncedSnapshot,
      hasConflict: pendingConflict !== null,
      dataSource,
      currentWeekKey: getWeekKey()
    };
  },

  subscribe(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },

  getEntry(weekKey) {
    return journal.entries.find((e) => e.weekKey === weekKey) ?? null;
  },

  getAllEntries() {
    return [...journal.entries].sort((a, b) => a.weekKey.localeCompare(b.weekKey));
  },

  getTimelineWeekKeys() {
    const keys = journal.entries.map((e) => e.weekKey);
    return buildTimelineWeekKeys(keys);
  },

  getPreviousEntry(weekKey) {
    const prevKey = getPreviousWeekKey(weekKey);
    if (!prevKey) return null;
    return journal.entries.find((e) => e.weekKey === prevKey) ?? null;
  },

  getOrCreateEntry(weekKey) {
    let entry = journal.entries.find((e) => e.weekKey === weekKey);
    if (!entry) {
      entry = createEmptyEntry(weekKey);
      journal.entries.push(entry);
      journalStore._touch();
    }
    return entry;
  },

  upsertEntry(entry) {
    const normalized = normalizeEntry({ ...entry, updatedAt: new Date().toISOString() });
    if (!normalized) return;
    const idx = journal.entries.findIndex((e) => e.weekKey === normalized.weekKey);
    if (idx >= 0) {
      journal.entries[idx] = normalized;
    } else {
      journal.entries.push(normalized);
    }
    journalStore._touch();
  },

  markComplete(weekKey) {
    const entry = journalStore.getOrCreateEntry(weekKey);
    entry.status = "complete";
    entry.updatedAt = new Date().toISOString();
    journalStore.upsertEntry(entry);
  },

  getCompletedCount() {
    return journal.entries.filter((e) => e.status === "complete").length;
  },

  getStreak() {
    const complete = new Set(
      journal.entries.filter((e) => e.status === "complete").map((e) => e.weekKey)
    );
    let streak = 0;
    let key = getWeekKey();
    const guard = 200;
    let n = 0;
    while (n < guard) {
      if (!complete.has(key)) break;
      streak++;
      const prev = getPreviousWeekKey(key);
      if (!prev) break;
      key = prev;
      n++;
    }
    return streak;
  },

  _touch() {
    dataSource = "draft";
    setUnsavedFlag(true);
    persistDraftToLocalStorage();
    notify();
  },

  replaceJournal(newJournal) {
    journal = normalizeJournalFile(newJournal);
    syncedSnapshot = snapshot(journal);
    pendingConflict = null;
    dataSource = "file";
    syncLocalCacheToJournal();
    notify();
  },

  markSyncedFromRepo() {
    syncedSnapshot = snapshot(journal);
    pendingConflict = null;
    dataSource = "file";
    syncLocalCacheToJournal();
    notify();
  },

  /** Load data/journal.json and dismiss conflict. */
  async reloadFromFile() {
    const fromRepo = await fetchJournalFromRepo();
    journalStore.replaceJournal(fromRepo);
  },

  /** Keep browser draft from conflict dialog. */
  applyPendingDraft() {
    if (!pendingConflict) return;
    journal = normalizeJournalFile(pendingConflict.draft);
    pendingConflict = null;
    dataSource = "draft";
    setUnsavedFlag(true);
    persistDraftToLocalStorage();
    notify();
  },

  /** Keep current file view and drop pending draft. */
  dismissPendingConflict() {
    if (!pendingConflict) return;
    pendingConflict = null;
    syncLocalCacheToJournal();
    notify();
  },

  exportJson() {
    downloadJournalJson(journal);
  },

  async importJson() {
    const data = await importJournalFromFile();
    journal = data;
    syncedSnapshot = snapshot(journal);
    pendingConflict = null;
    dataSource = "draft";
    setUnsavedFlag(true);
    persistDraftToLocalStorage();
    notify();
  },

  getGithubConfig() {
    return {
      repo: localStorage.getItem(GITHUB_REPO_KEY) || "",
      token: localStorage.getItem(GITHUB_TOKEN_KEY) || "",
      sha: localStorage.getItem(GITHUB_SHA_KEY) || ""
    };
  },

  setGithubConfig({ repo, token }) {
    if (repo !== undefined) localStorage.setItem(GITHUB_REPO_KEY, repo.trim());
    if (token !== undefined) localStorage.setItem(GITHUB_TOKEN_KEY, token.trim());
  },

  setGithubSha(sha) {
    if (sha) localStorage.setItem(GITHUB_SHA_KEY, sha);
    else localStorage.removeItem(GITHUB_SHA_KEY);
  }
};
