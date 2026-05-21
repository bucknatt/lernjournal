import { normalizeJournalFile } from "../models/journal.js";

const JOURNAL_PATH = "./data/journal.json";

/**
 * @returns {Promise<import('../models/journal.js').JournalFile>}
 */
export async function fetchJournalFromRepo() {
  const res = await fetch(JOURNAL_PATH, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`journal.json konnte nicht geladen werden (${res.status})`);
  }
  const data = await res.json();
  return normalizeJournalFile(data);
}

/**
 * @param {import('../models/journal.js').JournalFile} journal
 */
export function downloadJournalJson(journal) {
  const blob = new Blob([JSON.stringify(journal, null, 2) + "\n"], {
    type: "application/json"
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "journal.json";
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * @returns {Promise<import('../models/journal.js').JournalFile>}
 */
export function importJournalFromFile() {
  return new Promise((resolve, reject) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/json,.json";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) {
        reject(new Error("Keine Datei gewählt"));
        return;
      }
      try {
        const text = await file.text();
        resolve(normalizeJournalFile(JSON.parse(text)));
      } catch (e) {
        reject(new Error("Ungültige JSON-Datei"));
      }
    };
    input.click();
  });
}
