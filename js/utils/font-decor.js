/**
 * Too Freakin Cute Demo (Misti's Fonts):
 * - type * → ♥ heart glyph
 * - type | → ☺ smiley glyph
 * @see https://mistifonts.com/too-freakin-cute/
 */

export const TFC_HEART = "*";
export const TFC_SMILE = "|";

/**
 * Main titles & section headings: *Word * Word |
 * @param {string} text
 */
export function decorateDisplayTitle(text) {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return TFC_SMILE;
  if (words.length === 1) {
    return `${TFC_HEART}${words[0]}${TFC_SMILE}`;
  }
  return `${TFC_HEART}${words.join(` ${TFC_HEART} `)} ${TFC_SMILE}`;
}

/**
 * Card headings: *Title|
 * @param {string} text
 */
export function decorateCardTitle(text) {
  const t = text.trim();
  if (!t) return TFC_SMILE;
  return `${TFC_HEART}${t}${TFC_SMILE}`;
}

/**
 * Optional inline hearts between words (no leading/trailing smiley).
 * @param {string} text
 */
export function decorateWithHearts(text) {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length <= 1) return words[0] ? `${TFC_HEART}${words[0]}` : "";
  return `${TFC_HEART}${words.join(TFC_HEART)}`;
}
