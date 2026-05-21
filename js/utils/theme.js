const THEME_STORAGE_KEY = "lernjournal-miku-theme";

/** @type {const} */
export const THEME_MODES = ["MinimalMiku", "Concert", "NightNeon", "SnowMiku"];

/** @type {Record<string, string>} */
export const THEME_LABELS = {
  MinimalMiku: "Minimal Miku",
  Concert: "Concert",
  NightNeon: "Night Neon",
  SnowMiku: "Snow Miku"
};

/**
 * @returns {typeof THEME_MODES[number]}
 */
export function getTheme() {
  const stored = localStorage.getItem(THEME_STORAGE_KEY);
  if (stored && THEME_MODES.includes(/** @type {typeof THEME_MODES[number]} */ (stored))) {
    return /** @type {typeof THEME_MODES[number]} */ (stored);
  }
  return "MinimalMiku";
}

/**
 * @param {typeof THEME_MODES[number]} mode
 */
export function setTheme(mode) {
  if (!THEME_MODES.includes(mode)) return;
  document.body.dataset.mikuTheme = mode;
  localStorage.setItem(THEME_STORAGE_KEY, mode);
}

export function cycleTheme() {
  const idx = THEME_MODES.indexOf(getTheme());
  const next = THEME_MODES[(idx + 1) % THEME_MODES.length];
  setTheme(next);
  return next;
}

export function initTheme() {
  setTheme(getTheme());
}

/**
 * @param {HTMLElement} parent
 * @param {{ compact?: boolean }} [opts]
 */
export function renderThemeSwitcher(parent, opts = {}) {
  const wrap = document.createElement("div");
  wrap.className = `theme-switcher${opts.compact ? " theme-switcher--compact" : ""}`;

  const label = document.createElement("span");
  label.className = "theme-switcher-label";
  label.textContent = opts.compact ? "Theme" : "Miku Theme";
  wrap.appendChild(label);

  const select = document.createElement("select");
  select.className = "theme-switcher-select";
  select.setAttribute("aria-label", "Theme wählen");

  for (const mode of THEME_MODES) {
    const opt = document.createElement("option");
    opt.value = mode;
    opt.textContent = THEME_LABELS[mode];
    if (mode === getTheme()) opt.selected = true;
    select.appendChild(opt);
  }

  select.addEventListener("change", () => {
    setTheme(/** @type {typeof THEME_MODES[number]} */ (select.value));
  });

  const cycleBtn = document.createElement("button");
  cycleBtn.type = "button";
  cycleBtn.className = "btn btn-ghost btn-small";
  cycleBtn.textContent = "↻";
  cycleBtn.title = "Nächstes Theme";
  cycleBtn.setAttribute("aria-label", "Theme wechseln");
  cycleBtn.onclick = () => {
    const next = cycleTheme();
    select.value = next;
  };

  wrap.append(select, cycleBtn);
  parent.appendChild(wrap);
  return wrap;
}
