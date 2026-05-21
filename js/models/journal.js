/** @typedef {'draft' | 'complete'} EntryStatus */

/**
 * @typedef {Object} WeeklyEntry
 * @property {string} weekKey
 * @property {EntryStatus} status
 * @property {string} datum
 * @property {string} done
 * @property {string} methods
 * @property {string} learned
 * @property {string} wentWell
 * @property {string} wentPoorly
 * @property {string} helpedBy
 * @property {string} improvements
 * @property {string} goal1
 * @property {string} goal2
 * @property {string} createdAt
 * @property {string} updatedAt
 */

/**
 * @typedef {Object} JournalFile
 * @property {number} version
 * @property {WeeklyEntry[]} entries
 */

export const JOURNAL_VERSION = 1;

export const FIELD_LABELS = {
  datum: "Datum",
  done: "Was habe ich diese Woche gemacht/umgesetzt?",
  methods: "Welche Methoden habe ich verwendet?",
  learned: "Was habe ich dabei gelernt (fachlich, persönlich)?",
  wentWell: "Was ging gut?",
  wentPoorly: "Was ging nicht so gut?",
  helpedBy: "Wer oder was hat mir dabei weitergeholfen?",
  improvements: "Was kann ich verbessern?",
  goal1: "Ziel 1 für nächste Woche",
  goal2: "Ziel 2 für nächste Woche"
};

export const REFLECTION_FIELDS = [
  "done",
  "methods",
  "learned",
  "wentWell",
  "wentPoorly",
  "helpedBy",
  "improvements"
];

/**
 * @param {string} weekKey
 * @returns {WeeklyEntry}
 */
export function createEmptyEntry(weekKey) {
  const now = new Date().toISOString();
  const today = now.slice(0, 10);
  return {
    weekKey,
    status: "draft",
    datum: today,
    done: "",
    methods: "",
    learned: "",
    wentWell: "",
    wentPoorly: "",
    helpedBy: "",
    improvements: "",
    goal1: "",
    goal2: "",
    createdAt: now,
    updatedAt: now
  };
}

/**
 * @param {unknown} data
 * @returns {JournalFile}
 */
export function normalizeJournalFile(data) {
  if (!data || typeof data !== "object") {
    return { version: JOURNAL_VERSION, entries: [] };
  }
  const raw = /** @type {Record<string, unknown>} */ (data);
  const entries = Array.isArray(raw.entries)
    ? raw.entries.map(normalizeEntry).filter(Boolean)
    : [];
  return {
    version: typeof raw.version === "number" ? raw.version : JOURNAL_VERSION,
    entries
  };
}

/**
 * @param {unknown} entry
 * @returns {WeeklyEntry | null}
 */
export function normalizeEntry(entry) {
  if (!entry || typeof entry !== "object") return null;
  const e = /** @type {Record<string, unknown>} */ (entry);
  if (typeof e.weekKey !== "string" || !e.weekKey) return null;

  const now = new Date().toISOString();
  return {
    weekKey: e.weekKey,
    status: e.status === "complete" ? "complete" : "draft",
    datum: typeof e.datum === "string" ? e.datum : now.slice(0, 10),
    done: str(e.done),
    methods: str(e.methods),
    learned: str(e.learned),
    wentWell: str(e.wentWell),
    wentPoorly: str(e.wentPoorly),
    helpedBy: str(e.helpedBy),
    improvements: str(e.improvements),
    goal1: str(e.goal1),
    goal2: str(e.goal2),
    createdAt: typeof e.createdAt === "string" ? e.createdAt : now,
    updatedAt: typeof e.updatedAt === "string" ? e.updatedAt : now
  };
}

function str(v) {
  return typeof v === "string" ? v : "";
}

/**
 * @param {WeeklyEntry} entry
 * @returns {boolean}
 */
export function isEntryComplete(entry) {
  const required = ["datum", ...REFLECTION_FIELDS, "goal1", "goal2"];
  return required.every((key) => str(entry[/** @type {keyof WeeklyEntry} */ (key)]).trim().length > 0);
}
