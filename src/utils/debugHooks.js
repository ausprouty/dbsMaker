export function attachDebug(name, value) {
  try { window.__dbg = window.__dbg || {}; window.__dbg[name] = value; } catch(e) {}
}
