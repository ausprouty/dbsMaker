// src/services/api/normalize.js
export function normalizeOkAndFlatten(resp) {
  // Expect: { status, data, meta? }
  if (!resp || resp.status !== "ok") return null;

  const payload = resp.data && typeof resp.data === "object" ? resp.data : {};

  // Ensure meta exists exactly once on the flattened payload
  if (!("meta" in payload) && resp.meta && typeof resp.meta === "object") {
    payload.meta = resp.meta;
  }

  // Return the flattened object: everything that was under `data`
  // (including `meta` if present) and nothing else.
  return payload;
}
