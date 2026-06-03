import { journalStore } from "../store/journal-store.js";
import { getWeekKey, formatWeekLabel } from "../utils/dates.js";
import {
  renderAppHeader,
  renderAppToolbar,
  renderSettingsPanel,
  renderConflictBanner,
  showToast
} from "./ui.js";
import { decorateDisplayTitle, decorateCardTitle } from "../utils/font-decor.js";
import { clearContainer, scheduleAfterPointer } from "../utils/dom.js";

/** @type {(() => void) | null} */
let dashboardUnsub = null;

const DASHBOARD_RENDER_KEY = "dashboard";

/**
 * @param {HTMLElement} container
 * @param {{ navigateTo: (hash: string) => void }} ctx
 */
export function renderDashboard(container, ctx) {
  if (dashboardUnsub) {
    dashboardUnsub();
    dashboardUnsub = null;
  }

  clearContainer(container);

  const state = journalStore.getState();
  const currentWeek = state.currentWeekKey;
  const currentEntry = journalStore.getEntry(currentWeek);
  const prevEntry = journalStore.getPreviousEntry(currentWeek);
  const timeline = journalStore.getTimelineWeekKeys();
  const streak = journalStore.getStreak();
  const completed = journalStore.getCompletedCount();

  renderAppHeader(container, {
    title: "Lernjournal",
    subtitle: "Wochenrückblick & Selbstreflexion"
  });

  renderAppToolbar(container);
  renderConflictBanner(container);

  const hero = document.createElement("section");
  hero.className = "hero";
  hero.innerHTML = `
    <p class="page-subtitle" style="margin:0">Aktuelle Woche</p>
    <p class="week-range-label">${formatWeekLabel(currentWeek)}</p>
  `;

  const meta = document.createElement("div");
  meta.className = "hero-meta";

  const cta = document.createElement("button");
  cta.type = "button";
  cta.className = "btn btn-primary";
  if (currentEntry) {
    cta.textContent = currentEntry.status === "complete" ? "Eintrag ansehen" : "Weiter bearbeiten";
    cta.onclick = () => {
      if (currentEntry.status === "complete") {
        ctx.navigateTo(`#/week/${currentWeek}/read`);
      } else {
        ctx.navigateTo(`#/week/${currentWeek}/edit`);
      }
    };
  } else {
    cta.textContent = "Diese Woche schreiben";
    cta.onclick = () => ctx.navigateTo(`#/week/${currentWeek}/edit`);
  }
  meta.appendChild(cta);

  if (state.isDirty) {
    const b = document.createElement("span");
    b.className = "badge badge-warn";
    b.textContent = "Lokal geändert";
    meta.appendChild(b);
  }

  hero.appendChild(meta);
  container.appendChild(hero);

  const grid = document.createElement("div");
  grid.className = "card-grid";

  const streakCard = document.createElement("article");
  streakCard.className = "card";
  streakCard.innerHTML = `
    <h3 class="display-decor">${escapeHtml(decorateCardTitle("Achievements"))}</h3>
    <p><strong>${streak}</strong> Woche(n) in Folge abgeschlossen · <strong>${completed}</strong> gesamt</p>
  `;
  grid.appendChild(streakCard);

  if (currentEntry) {
    const weekCard = document.createElement("article");
    weekCard.className = "card card-highlight";
    const goodText = currentEntry.wentWell.trim() || "—";
    const badText = currentEntry.wentPoorly.trim() || "—";
    const statusLabel = currentEntry.status === "complete" ? "Abgeschlossen" : "Entwurf";
    weekCard.innerHTML = `
      <h3 class="display-decor">${escapeHtml(decorateCardTitle("Diese Woche"))}</h3>
      <p class="muted" style="margin:0 0 0.5rem;font-size:0.85rem">${escapeHtml(statusLabel)} · ${escapeHtml(formatWeekLabel(currentWeek))}</p>
      <p><strong>Ging gut:</strong> ${escapeHtml(goodText.slice(0, 100))}${goodText.length > 100 ? "…" : ""}</p>
      <p style="margin-top:0.5rem"><strong>Nicht so gut:</strong> ${escapeHtml(badText.slice(0, 100))}${badText.length > 100 ? "…" : ""}</p>
    `;
    grid.appendChild(weekCard);
  }

  if (prevEntry) {
    const goodCard = document.createElement("article");
    goodCard.className = "card card-highlight";
    const goodText = prevEntry.wentWell.trim() || "—";
    goodCard.innerHTML = `<h3 class="display-decor">${escapeHtml(decorateCardTitle("Letzte Woche · ging gut"))}</h3><p>${escapeHtml(goodText.slice(0, 120))}${goodText.length > 120 ? "…" : ""}</p>`;
    grid.appendChild(goodCard);

    const badCard = document.createElement("article");
    badCard.className = "card";
    const badText = prevEntry.wentPoorly.trim() || "—";
    badCard.innerHTML = `<h3 class="display-decor">${escapeHtml(decorateCardTitle("Letzte Woche · nicht so gut"))}</h3><p>${escapeHtml(badText.slice(0, 120))}${badText.length > 120 ? "…" : ""}</p>`;
    grid.appendChild(badCard);

    const goalsCard = document.createElement("article");
    goalsCard.className = "card";
    goalsCard.innerHTML = `<h3 class="display-decor">${escapeHtml(decorateCardTitle("Ziele von letzter Woche"))}</h3>`;
    const chips = document.createElement("div");
    chips.className = "goal-chips";
    if (prevEntry.goal1) {
      const c1 = document.createElement("div");
      c1.className = "goal-chip";
      c1.textContent = prevEntry.goal1;
      chips.appendChild(c1);
    }
    if (prevEntry.goal2) {
      const c2 = document.createElement("div");
      c2.className = "goal-chip";
      c2.textContent = prevEntry.goal2;
      chips.appendChild(c2);
    }
    if (!prevEntry.goal1 && !prevEntry.goal2) {
      chips.innerHTML = `<div class="goal-chip muted">Keine Ziele gesetzt</div>`;
    }
    goalsCard.appendChild(chips);
    grid.appendChild(goalsCard);
  } else {
    const emptyCard = document.createElement("article");
    emptyCard.className = "card";
    emptyCard.innerHTML = `<h3 class="display-decor">${escapeHtml(decorateCardTitle("Willkommen"))}</h3><p>Starte deinen ersten Wochenrückblick. Die Journey beginnt hier.</p>`;
    grid.appendChild(emptyCard);
  }

  container.appendChild(grid);

  renderDashboardSearchPreview(container, ctx);

  const journey = document.createElement("section");
  journey.className = "journey-section";
  const journeyTitle = document.createElement("h2");
  journeyTitle.className = "display-decor";
  journeyTitle.textContent = decorateDisplayTitle("Deine Journey");
  journey.appendChild(journeyTitle);

  const track = document.createElement("div");
  track.className = "journey-track";
  track.setAttribute("role", "list");

  for (const weekKey of timeline) {
    const entry = journalStore.getEntry(weekKey);
    let status = "empty";
    if (entry) status = entry.status === "complete" ? "complete" : "draft";
    const isCurrent = weekKey === currentWeek;

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `journey-node journey-node--${status}${isCurrent ? " journey-node--current" : ""}`;
    btn.setAttribute("role", "listitem");
    btn.title = formatWeekLabel(weekKey);

    const icon = entry?.status === "complete" ? "✓" : entry ? "◐" : "○";
    btn.innerHTML = `
      <div class="journey-node-dot">${icon}</div>
      <div class="journey-node-label">${weekKey.split("-W")[1]}</div>
    `;

    btn.onclick = () => {
      if (entry?.status === "complete") {
        ctx.navigateTo(`#/week/${weekKey}/read`);
      } else if (entry) {
        ctx.navigateTo(`#/week/${weekKey}/edit`);
      } else {
        ctx.navigateTo(`#/week/${weekKey}/edit`);
      }
    };

    track.appendChild(btn);
  }

  journey.appendChild(track);
  container.appendChild(journey);

  renderSettingsPanel(container, ctx);

  dashboardUnsub = journalStore.subscribe(() => {
    scheduleAfterPointer(DASHBOARD_RENDER_KEY, () => renderDashboard(container, ctx));
  });

  return () => {
    if (dashboardUnsub) {
      dashboardUnsub();
      dashboardUnsub = null;
    }
  };
}

/**
 * @param {HTMLElement} container
 * @param {{ navigateTo: (hash: string) => void }} ctx
 */
function renderDashboardSearchPreview(container, ctx) {
  const section = document.createElement("section");
  section.className = "search-preview-section";
  const searchTitle = document.createElement("h2");
  searchTitle.className = "display-decor";
  searchTitle.textContent = decorateDisplayTitle("Schnellsuche");
  section.appendChild(searchTitle);

  const form = document.createElement("form");
  form.className = "search-form card";
  form.setAttribute("role", "search");

  const input = document.createElement("input");
  input.type = "search";
  input.className = "search-input";
  input.placeholder = "z. B. Angular, W3Schools, Ziele von letzter Wochel…";
  input.setAttribute("aria-label", "Alle Einträge durchsuchen");

  const btn = document.createElement("button");
  btn.type = "submit";
  btn.className = "btn btn-primary";
  btn.textContent = "Alle Einträge durchsuchen";

  form.append(input, btn);
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const q = input.value.trim();
    if (q.length < 2) {
      showToast("Mindestens 2 Zeichen für die Suche.", "error");
      return;
    }
    ctx.navigateTo(`#/search/${encodeURIComponent(q)}`);
  });

  section.appendChild(form);
  container.appendChild(section);
}

function escapeHtml(s) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
