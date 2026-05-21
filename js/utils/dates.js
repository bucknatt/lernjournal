/**
 * ISO week key e.g. "2026-W20"
 * @param {Date} [date]
 */
export function getWeekKey(date = new Date()) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}

/**
 * @param {string} weekKey
 */
export function parseWeekKey(weekKey) {
  const m = /^(\d{4})-W(\d{2})$/.exec(weekKey);
  if (!m) return null;
  return { year: Number(m[1]), week: Number(m[2]) };
}

/**
 * Monday of ISO week
 * @param {string} weekKey
 * @returns {Date | null}
 */
export function weekKeyToDate(weekKey) {
  const p = parseWeekKey(weekKey);
  if (!p) return null;

  const jan4 = new Date(Date.UTC(p.year, 0, 4));
  const day = jan4.getUTCDay() || 7;
  const mondayWeek1 = new Date(jan4);
  mondayWeek1.setUTCDate(jan4.getUTCDate() - day + 1);

  const result = new Date(mondayWeek1);
  result.setUTCDate(mondayWeek1.getUTCDate() + (p.week - 1) * 7);
  return result;
}

/**
 * @param {string} weekKey
 */
export function formatWeekLabel(weekKey) {
  const start = weekKeyToDate(weekKey);
  if (!start) return weekKey;

  const end = new Date(start);
  end.setUTCDate(start.getUTCDate() + 6);

  const fmt = new Intl.DateTimeFormat("de-CH", { day: "numeric", month: "short", year: "numeric" });
  return `KW ${weekKey.split("-W")[1]} · ${fmt.format(start)} – ${fmt.format(end)}`;
}

/**
 * @param {string} weekKey
 */
export function getPreviousWeekKey(weekKey) {
  const start = weekKeyToDate(weekKey);
  if (!start) return null;
  const prev = new Date(start);
  prev.setUTCDate(prev.getUTCDate() - 7);
  return getWeekKey(prev);
}

/**
 * List week keys from first entry week through current week
 * @param {string[]} existingKeys
 */
export function buildTimelineWeekKeys(existingKeys) {
  const current = getWeekKey();
  const keys = new Set(existingKeys);
  keys.add(current);

  let earliest = current;
  for (const k of keys) {
    const d = weekKeyToDate(k);
    const e = weekKeyToDate(earliest);
    if (d && e && d < e) earliest = k;
  }

  const result = [];
  let cursor = earliest;
  const guard = 200;
  let n = 0;

  while (n < guard) {
    result.push(cursor);
    if (cursor === current) break;
    const d = weekKeyToDate(cursor);
    if (!d) break;
    const next = new Date(d);
    next.setUTCDate(d.getUTCDate() + 7);
    cursor = getWeekKey(next);
    n++;
  }

  if (result[result.length - 1] !== current) {
    result.push(current);
  }

  return result;
}

/**
 * @param {Date} [date]
 */
export function formatDateDe(date = new Date()) {
  return new Intl.DateTimeFormat("de-CH", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(date);
}
