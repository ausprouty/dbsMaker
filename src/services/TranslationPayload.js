// Returns the translation payload or null if not present
export function extractTranslationPayload(resData) {
  const root = resData?.data ?? resData;
  // Typical API shapes we’ve seen:
  // { data: { translation: {...} } } or { data: {...} } or direct object
  return (
    root?.translation ??
    root?.translations ?? // if your API returns a single object here, okay
    root ??
    null
  );
}

// Normalized “complete” flag check
export function isComplete(t) {
  return t?.meta?.translationComplete === true || t?.meta?.complete === true;
}
