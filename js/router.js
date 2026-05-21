import { renderDashboard } from "./views/dashboard.js";
import { renderWeekEditor } from "./views/week-editor.js";
import { renderWeekRead } from "./views/week-read.js";
import { renderSearch } from "./views/search.js";

let currentCleanup = null;

function parseRoute() {
  const hash = location.hash.slice(1) || "/";
  const parts = hash.split("/").filter(Boolean);

  if (parts.length === 0) {
    return { name: "dashboard" };
  }

  if (parts[0] === "week" && parts[1]) {
    const mode = parts[2] === "edit" ? "edit" : parts[2] === "read" ? "read" : "edit";
    return { name: mode === "read" ? "week-read" : "week-edit", weekKey: decodeURIComponent(parts[1]) };
  }

  if (parts[0] === "new") {
    return { name: "week-edit", weekKey: parts[1] ? decodeURIComponent(parts[1]) : null };
  }

  if (parts[0] === "search") {
    const query = parts.length > 1 ? decodeURIComponent(parts.slice(1).join("/")) : "";
    return { name: "search", query };
  }

  return { name: "dashboard" };
}

function navigateTo(hash) {
  if (location.hash !== hash) {
    location.hash = hash;
  } else {
    renderCurrentRoute();
  }
}

function renderCurrentRoute() {
  const app = document.getElementById("app");
  if (currentCleanup) {
    currentCleanup();
    currentCleanup = null;
  }

  const route = parseRoute();

  switch (route.name) {
    case "week-edit":
      currentCleanup = renderWeekEditor(app, route.weekKey, { navigateTo });
      break;
    case "week-read":
      currentCleanup = renderWeekRead(app, route.weekKey, { navigateTo });
      break;
    case "search":
      currentCleanup = renderSearch(app, route.query, { navigateTo });
      break;
    case "dashboard":
    default:
      currentCleanup = renderDashboard(app, { navigateTo });
      break;
  }
}

export function initRouter() {
  window.addEventListener("hashchange", renderCurrentRoute);
  renderCurrentRoute();
}

export { navigateTo, parseRoute };
