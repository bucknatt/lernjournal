import { journalStore } from "../store/journal-store.js";
import { searchEntries, highlightSnippet } from "../utils/search.js";
import { formatWeekLabel } from "../utils/dates.js";
import { renderAppHeader, renderAppToolbar } from "./ui.js";

/**
 * @param {HTMLElement} container
 * @param {string} initialQuery
 * @param {{ navigateTo: (hash: string) => void }} ctx
 */
export function renderSearch(container, initialQuery, ctx) {
  container.innerHTML = "";

  renderAppHeader(container, {
    title: "Suche",
    subtitle: "Durchsuche alle Wocheneinträge",
    backHref: "#/",
    backLabel: "← Dashboard"
  });

  renderAppToolbar(container, ctx, { showSearch: false });

  const panel = document.createElement("section");
  panel.className = "search-panel card";

  const form = document.createElement("form");
  form.className = "search-form";
  form.setAttribute("role", "search");

  const input = document.createElement("input");
  input.type = "search";
  input.className = "search-input";
  input.placeholder = "Stichwort suchen (min. 2 Zeichen)…";
  input.value = initialQuery;
  input.setAttribute("aria-label", "Journal durchsuchen");
  input.autocomplete = "off";

  const submit = document.createElement("button");
  submit.type = "submit";
  submit.className = "btn btn-primary";
  submit.textContent = "Suchen";

  form.append(input, submit);
  panel.appendChild(form);
  container.appendChild(panel);

  const resultsEl = document.createElement("div");
  resultsEl.className = "search-results";
  container.appendChild(resultsEl);

  function runSearch(q) {
    const query = q.trim();
    if (query) {
      const encoded = encodeURIComponent(query);
      if (location.hash !== `#/search/${encoded}`) {
        history.replaceState(null, "", `#/search/${encoded}`);
      }
    }

    const entries = journalStore.getAllEntries();
    const matches = searchEntries(query, entries);

    resultsEl.innerHTML = "";

    if (query.length < 2) {
      resultsEl.innerHTML = `<p class="muted search-hint">Mindestens 2 Zeichen eingeben.</p>`;
      return;
    }

    if (matches.length === 0) {
      resultsEl.innerHTML = `<p class="muted search-hint">Keine Treffer für „${escapeHtml(query)}“.</p>`;
      return;
    }

    const summary = document.createElement("p");
    summary.className = "search-summary";
    summary.textContent = `${matches.length} Treffer`;
    resultsEl.appendChild(summary);

    const list = document.createElement("ul");
    list.className = "search-result-list";

    for (const match of matches) {
      const entry = journalStore.getEntry(match.weekKey);
      const li = document.createElement("li");
      li.className = "search-result-item card";

      const meta = document.createElement("div");
      meta.className = "search-result-meta";
      meta.innerHTML = `
        <strong class="week-range-label">${escapeHtml(formatWeekLabel(match.weekKey))}</strong>
        <span class="badge">${escapeHtml(match.fieldLabel)}</span>
        ${entry ? `<span class="badge ${entry.status === "complete" ? "badge-success" : "badge-warn"}">${entry.status === "complete" ? "Abgeschlossen" : "Entwurf"}</span>` : ""}
      `;

      const snippet = document.createElement("p");
      snippet.className = "search-result-snippet";
      snippet.innerHTML = highlightSnippet(match.snippet, query);

      const actions = document.createElement("div");
      actions.className = "btn-group";

      const openBtn = document.createElement("button");
      openBtn.type = "button";
      openBtn.className = "btn btn-small";
      openBtn.textContent = entry?.status === "complete" ? "Ansehen" : "Öffnen";
      openBtn.onclick = () => {
        if (entry?.status === "complete") {
          ctx.navigateTo(`#/week/${match.weekKey}/read`);
        } else {
          ctx.navigateTo(`#/week/${match.weekKey}/edit`);
        }
      };
      actions.appendChild(openBtn);

      li.append(meta, snippet, actions);
      list.appendChild(li);
    }

    resultsEl.appendChild(list);
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    runSearch(input.value);
  });

  let debounce;
  input.addEventListener("input", () => {
    clearTimeout(debounce);
    debounce = setTimeout(() => runSearch(input.value), 280);
  });

  runSearch(initialQuery);

  return () => clearTimeout(debounce);
}

function escapeHtml(s) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
