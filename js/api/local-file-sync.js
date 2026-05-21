const DB_NAME = "lernjournal-fs-v1";
const STORE = "kv";
const HANDLE_KEY = "journal-file-handle";

/** @type {FileSystemFileHandle | null} */
let cachedHandle = null;

/**
 * @returns {boolean}
 */
export function isLocalFileSyncSupported() {
  return typeof window !== "undefined" && "showOpenFilePicker" in window;
}

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/**
 * @returns {Promise<FileSystemFileHandle | null>}
 */
async function loadHandleFromDb() {
  try {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      const req = tx.objectStore(STORE).get(HANDLE_KEY);
      req.onsuccess = () => resolve(/** @type {FileSystemFileHandle | undefined} */ (req.result) ?? null);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return null;
  }
}

/**
 * @param {FileSystemFileHandle} handle
 */
async function saveHandleToDb(handle) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(handle, HANDLE_KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function clearHandleFromDb() {
  cachedHandle = null;
  try {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).delete(HANDLE_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    /* ignore */
  }
}

/**
 * Restore linked file handle from IndexedDB (call on app start).
 */
export async function restoreLinkedJournalFile() {
  if (!isLocalFileSyncSupported()) return null;
  cachedHandle = await loadHandleFromDb();
  return cachedHandle?.name ?? null;
}

/**
 * @returns {string | null}
 */
export function getLinkedFileName() {
  return cachedHandle?.name ?? null;
}

/**
 * Prompt user to pick data/journal.json (or any journal JSON).
 * @returns {Promise<string>} linked file name
 */
export async function linkJournalFile() {
  if (!isLocalFileSyncSupported()) {
    throw new Error("Direktes Speichern in eine Datei wird in diesem Browser nicht unterstützt.");
  }

  const [handle] = await window.showOpenFilePicker({
    types: [
      {
        description: "Journal JSON",
        accept: { "application/json": [".json"] }
      }
    ],
    multiple: false
  });

  cachedHandle = handle;
  await saveHandleToDb(handle);
  return handle.name;
}

export async function unlinkJournalFile() {
  await clearHandleFromDb();
}

/**
 * @param {import('../models/journal.js').JournalFile} journal
 * @returns {Promise<{ ok: true } | { ok: false; reason: string }>}
 */
export async function writeJournalToLinkedFile(journal) {
  if (!cachedHandle) {
    const restored = await loadHandleFromDb();
    cachedHandle = restored;
  }
  if (!cachedHandle) {
    return { ok: false, reason: "not-linked" };
  }

  let permission = await cachedHandle.queryPermission({ mode: "readwrite" });
  if (permission !== "granted") {
    permission = await cachedHandle.requestPermission({ mode: "readwrite" });
  }
  if (permission !== "granted") {
    return { ok: false, reason: "denied" };
  }

  const writable = await cachedHandle.createWritable();
  await writable.write(JSON.stringify(journal, null, 2) + "\n");
  await writable.close();
  return { ok: true };
}
