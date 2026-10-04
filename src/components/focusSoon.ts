/** Focus a field right after it appears. */
export function focusSoon(id: string) {
  requestAnimationFrame(() => document.getElementById(id)?.focus())
}
