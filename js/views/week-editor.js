import { journalStore } from "../store/journal-store.js";
import { getWeekKey, formatWeekLabel } from "../utils/dates.js";
import { FIELD_LABELS, REFLECTION_FIELDS } from "../models/journal.js";
import { renderAppHeader, renderAppToolbar, showToast } from "./ui.js";

const AUTOSAVE_MS = 2000;

/**
 * @param {HTMLElement} container
 * @param {string | null} weekKeyParam
 * @param {{ navigateTo: (hash: string) => void }} ctx
 */
export function renderWeekEditor(container, weekKeyParam, ctx) {
  container.innerHTML = "";

  const weekKey = weekKeyParam || getWeekKey();
  const entry = journalStore.getOrCreateEntry(weekKey);
  const prev = journalStore.getPreviousEntry(weekKey);

  renderAppHeader(container, {
    title: `Woche ${weekKey.split("-W")[1]}`,
    subtitle: formatWeekLabel(weekKey),
    backHref: "#/",
    backLabel: "← Dashboard"
  });

  renderAppToolbar(container, ctx);

  if (prev && (prev.goal1 || prev.goal2)) {
    const carry = document.createElement("aside");
    carry.className = "card";
    carry.style.marginBottom = "1rem";
    carry.innerHTML = `<h3>Ziele von letzter Woche (Kontext)</h3>`;
    const chips = document.createElement("div");
    chips.className = "goal-chips";
    if (prev.goal1) {
      const c = document.createElement("div");
      c.className = "goal-chip";
      c.textContent = prev.goal1;
      chips.appendChild(c);
    }
    if (prev.goal2) {
      const c = document.createElement("div");
      c.className = "goal-chip";
      c.textContent = prev.goal2;
      chips.appendChild(c);
    }
    carry.appendChild(chips);
    container.appendChild(carry);
  }

  const form = document.createElement("form");
  form.className = "editor-form";
  form.noValidate = true;

  const fields = ["datum", ...REFLECTION_FIELDS, "goal1", "goal2"];
  /** @type {Record<string, HTMLInputElement | HTMLTextAreaElement>} */
  const inputs = {};

  for (const key of fields) {
    const section = document.createElement("div");
    section.className = "form-section card";

    const label = document.createElement("label");
    label.htmlFor = `field-${key}`;
    label.textContent = FIELD_LABELS[/** @type {keyof typeof FIELD_LABELS} */ (key)] || key;
    section.appendChild(label);

    let input;
    if (key === "datum") {
      input = document.createElement("input");
      input.type = "date";
      input.id = `field-${key}`;
      input.value = entry.datum || "";
    } else {
      input = document.createElement("textarea");
      input.id = `field-${key}`;
      input.rows = key.startsWith("goal") ? 2 : 4;
      input.value = entry[/** @type {keyof typeof entry} */ (key)] || "";
    }

    inputs[key] = input;
    section.appendChild(input);
    form.appendChild(section);
  }

  const hint = document.createElement("p");
  hint.className = "autosave-hint";
  const state = journalStore.getState();
  if (state.linkedFileName) {
    hint.textContent = `Änderungen werden im Browser und in ${state.linkedFileName} gespeichert.`;
  } else if (state.fileSyncSupported) {
    hint.textContent =
      "Änderungen werden im Browser gespeichert. Für Git: unter Sync & Backup «data/journal.json verknüpfen» oder «Export für Git».";
  } else {
    hint.textContent =
      "Änderungen werden im Browser gespeichert. Für Git: «Export für Git» → Datei nach data/journal.json kopieren.";
  }
  form.appendChild(hint);

  const actions = document.createElement("div");
  actions.className = "form-actions";

  const saveBtn = document.createElement("button");
  saveBtn.type = "button";
  saveBtn.className = "btn btn-primary";
  saveBtn.textContent = "Speichern";
  saveBtn.onclick = () => flush(true);

  const completeBtn = document.createElement("button");
  completeBtn.type = "button";
  completeBtn.className = "btn";
  completeBtn.textContent = "Als abgeschlossen markieren";
  completeBtn.onclick = () => {
    flush(false);
    journalStore.markComplete(weekKey);
    showToast("Woche als abgeschlossen markiert.");
    ctx.navigateTo(`#/week/${weekKey}/read`);
  };

  const exportBtn = document.createElement("button");
  exportBtn.type = "button";
  exportBtn.className = "btn btn-ghost";
  exportBtn.textContent = "Export für Git";
  exportBtn.onclick = () => {
    flush(false);
    journalStore.exportJson();
    showToast("journal.json exportiert — in data/ kopieren und committen.");
  };

  const readBtn = document.createElement("button");
  readBtn.type = "button";
  readBtn.className = "btn btn-ghost";
  readBtn.textContent = "Vorschau";
  readBtn.onclick = () => {
    flush(false);
    ctx.navigateTo(`#/week/${weekKey}/read`);
  };

  actions.append(saveBtn, completeBtn, exportBtn, readBtn);
  form.appendChild(actions);
  container.appendChild(form);

  let autosaveTimer = null;

  function collectEntry() {
    const updated = { ...entry };
    for (const key of fields) {
      updated[/** @type {keyof typeof updated} */ (key)] = inputs[key].value;
    }
    updated.updatedAt = new Date().toISOString();
    return updated;
  }

  async function flush(showMsg) {
    journalStore.upsertEntry(collectEntry());
    if (!showMsg) return;
    const fileResult = await journalStore.writeToLinkedFile();
    if (fileResult.ok) {
      showToast(`Gespeichert in Browser und ${journalStore.getState().linkedFileName}.`);
    } else if (fileResult.reason === "not-linked") {
      showToast("Im Browser gespeichert. Für Git: Datei verknüpfen oder «Export für Git».");
    } else {
      showToast("Im Browser gespeichert; Schreibzugriff auf die Datei verweigert.", "error");
    }
  }

  function scheduleAutosave() {
    if (autosaveTimer) clearTimeout(autosaveTimer);
    autosaveTimer = setTimeout(() => flush(false), AUTOSAVE_MS);
  }

  for (const input of Object.values(inputs)) {
    input.addEventListener("input", scheduleAutosave);
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    flush(true);
  });

  return () => {
    if (autosaveTimer) clearTimeout(autosaveTimer);
    flush(false);
  };
}
