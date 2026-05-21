import { journalStore } from "../store/journal-store.js";
import { formatWeekLabel } from "../utils/dates.js";
import { FIELD_LABELS, REFLECTION_FIELDS } from "../models/journal.js";
import { renderAppHeader, renderAppToolbar } from "./ui.js";

/**
 * @param {HTMLElement} container
 * @param {string} weekKey
 * @param {{ navigateTo: (hash: string) => void }} ctx
 */
export function renderWeekRead(container, weekKey, ctx) {
  container.innerHTML = "";

  const entry = journalStore.getEntry(weekKey);
  if (!entry) {
    container.innerHTML = `
      <a class="nav-back" href="#/">← Dashboard</a>
      <div class="card"><p>Noch kein Eintrag für diese Woche.</p>
      <button type="button" class="btn btn-primary" id="create-week">Jetzt schreiben</button></div>
    `;
    container.querySelector("#create-week")?.addEventListener("click", () => {
      ctx.navigateTo(`#/week/${weekKey}/edit`);
    });
    return () => {};
  }

  renderAppHeader(container, {
    title: `Woche ${weekKey.split("-W")[1]}`,
    subtitle: `${formatWeekLabel(weekKey)} · ${entry.status === "complete" ? "Abgeschlossen" : "Entwurf"}`,
    backHref: "#/",
    backLabel: "← Dashboard"
  });

  renderAppToolbar(container, ctx);

  const actions = document.createElement("div");
  actions.className = "btn-group";
  actions.style.marginBottom = "1rem";

  const editBtn = document.createElement("button");
  editBtn.type = "button";
  editBtn.className = "btn btn-primary";
  editBtn.textContent = "Bearbeiten";
  editBtn.onclick = () => ctx.navigateTo(`#/week/${weekKey}/edit`);
  actions.appendChild(editBtn);

  if (entry.status !== "complete") {
    const badge = document.createElement("span");
    badge.className = "badge badge-warn";
    badge.textContent = "Entwurf";
    actions.appendChild(badge);
  } else {
    const badge = document.createElement("span");
    badge.className = "badge badge-success";
    badge.textContent = "Abgeschlossen";
    actions.appendChild(badge);
  }

  container.appendChild(actions);

  const wrap = document.createElement("div");
  wrap.className = "read-view";

  const sections = [
    ["datum", entry.datum],
    ...REFLECTION_FIELDS.map((k) => [k, entry[k]]),
    ["goal1", entry.goal1],
    ["goal2", entry.goal2]
  ];

  for (const [key, value] of sections) {
    const sec = document.createElement("section");
    sec.className = "read-section card";
    const h3 = document.createElement("h3");
    h3.textContent = FIELD_LABELS[/** @type {keyof typeof FIELD_LABELS} */ (key)] || key;
    const p = document.createElement("p");
    p.className = "read-block";
    p.textContent = value?.trim() || "—";
    sec.append(h3, p);
    wrap.appendChild(sec);
  }

  container.appendChild(wrap);

  return () => {};
}
