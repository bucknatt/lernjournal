import { FIELD_LABELS, REFLECTION_FIELDS } from "../models/journal.js";

/** @type {(keyof typeof FIELD_LABELS)[]} */
const SEARCHABLE_KEYS = [
  "done",
  "methods",
  "learned",
  "wentWell",
  "wentPoorly",
  "helpedBy",
  "improvements",
  "goal1",
  "goal2",
  "datum"
];

/**
 * @typedef {Object} SearchMatch
 * @property {string} weekKey
 * @property {string} field
 * @property {string} fieldLabel
 * @property {string} snippet
 * @property {number} score
 */

/**
 * @param {string} query
 * @param {import('../models/journal.js').WeeklyEntry[]} entries
 * @returns {SearchMatch[]}
 */
export function searchEntries(query, entries) {
  const q = query.trim().toLowerCase();
  if (!q || q.length < 2) return [];

  const terms = q.split(/\s+/).filter(Boolean);
  /** @type {Map<string, SearchMatch>} */
  const byWeek = new Map();

  for (const entry of entries) {
    if (entry.weekKey.toLowerCase().includes(q)) {
      addMatch(byWeek, entry.weekKey, "weekKey", "Kalenderwoche", entry.weekKey, terms.length + 2);
    }

    for (const key of SEARCHABLE_KEYS) {
      const value = String(entry[/** @type {keyof typeof entry} */ (key)] || "");
      if (!value) continue;

      const lower = value.toLowerCase();
      const matchedTerms = terms.filter((t) => lower.includes(t));
      if (matchedTerms.length === 0) continue;

      const idx = lower.indexOf(matchedTerms[0]);
      const snippet = buildSnippet(value, idx, matchedTerms[0].length);
      const label = FIELD_LABELS[/** @type {keyof typeof FIELD_LABELS} */ (key)] || key;
      addMatch(byWeek, entry.weekKey, key, label, snippet, matchedTerms.length);
    }
  }

  return [...byWeek.values()].sort((a, b) => b.score - a.score || b.weekKey.localeCompare(a.weekKey));
}

/**
 * @param {Map<string, SearchMatch>} map
 */
function addMatch(map, weekKey, field, fieldLabel, snippet, score) {
  const id = `${weekKey}:${field}`;
  const existing = map.get(id);
  if (!existing || score > existing.score) {
    map.set(id, { weekKey, field, fieldLabel, snippet, score });
  }
}

function buildSnippet(text, matchIndex, matchLen) {
  const radius = 60;
  const start = Math.max(0, matchIndex - radius);
  const end = Math.min(text.length, matchIndex + matchLen + radius);
  let slice = text.slice(start, end).replace(/\s+/g, " ");
  if (start > 0) slice = "…" + slice;
  if (end < text.length) slice = slice + "…";
  return slice;
}

/**
 * Highlight query terms in plain text (escaped HTML).
 * @param {string} text
 * @param {string} query
 */
export function highlightSnippet(text, query) {
  const escaped = escapeHtml(text);
  const terms = query
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter((t) => t.length >= 2);

  let result = escaped;
  for (const term of terms) {
    const re = new RegExp(`(${escapeRegExp(term)})`, "gi");
    result = result.replace(re, "<mark>$1</mark>");
  }
  return result;
}

function escapeHtml(s) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
