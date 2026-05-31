/**
 * Release focus from elements inside `root` so a DOM teardown does not leave
 * Chromium pointer capture stuck (wheel scroll stops until the next click).
 * @param {HTMLElement} root
 */
export function releasePointerFocus(root) {
  const active = document.activeElement;
  if (active instanceof HTMLElement && root.contains(active)) {
    active.blur();
  }
}

/**
 * @param {HTMLElement} container
 */
export function clearContainer(container) {
  releasePointerFocus(container);
  container.innerHTML = "";
}

/**
 * Coalesce callbacks to the next animation frame (one per key).
 * @param {string} key
 * @param {() => void} fn
 */
const rafByKey = new Map();

export function scheduleAfterPointer(key, fn) {
  const existing = rafByKey.get(key);
  if (existing !== undefined) {
    cancelAnimationFrame(existing);
  }
  const id = requestAnimationFrame(() => {
    rafByKey.delete(key);
    fn();
  });
  rafByKey.set(key, id);
}
