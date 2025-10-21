// src/i18n/languageCatalog.js
let _languages = null;
let _loading = null;

const base = import.meta.env.BASE_URL || "/";
const rel  = (import.meta.env.VITE_LANGUAGE_DATA || "config/languages.json")
  .replace(/^\//, "");

// Reusable JSON fetch that also guards against HTML shells
async function fetchJSON(url) {
  const res = await fetch(url, { cache: "no-cache" });
  if (!res.ok) {
    // caller decides if/how to fallback
    throw new Error(`HTTP ${res.status} for ${url}`);
  }

  // Some dev servers/SW setups send HTML (app shell) on misses.
  const ct = (res.headers.get("content-type") || "").toLowerCase();
  if (!ct.includes("application/json")) {
    const text = await res.text();
    // Heuristic: if it looks like HTML, treat as a miss
    if (/^\s*<!doctype html/i.test(text) || /^\s*</.test(text)) {
      throw new Error(`Non-JSON response for ${url}`);
    }
    try {
      return JSON.parse(text);
    } catch (e) {
      throw new Error(`Invalid JSON text from ${url}`);
    }
  }

  return res.json();
}

async function loadFromPublic() {
  const url = base + rel; // e.g. /config/languages.json
  try {
    return await fetchJSON(url);
  } catch (e) {
    // Only log at debug level; we’ll fallback silently
    console.debug("[languageCatalog] public load failed:", e?.message || e);
    return null; // signal fallback
  }
}

async function loadFromCode() {
  // Prefer site-specific code copy if present, otherwise global metadata file
  const siteGlobs = import.meta.glob("@site/config/languages.json", {
    import: "default",
  });
  const globalGlobs = import.meta.glob("@/i18n/metadata/languages.json", {
    import: "default",
  });

  const siteKeys = Object.keys(siteGlobs);
  if (siteKeys.length) {
    const mod = await siteGlobs[siteKeys[0]]();
    return Array.isArray(mod) ? mod : mod?.default || [];
  }

  const globalKeys = Object.keys(globalGlobs);
  if (globalKeys.length) {
    const mod = await globalGlobs[globalKeys[0]]();
    return Array.isArray(mod) ? mod : mod?.default || [];
  }

  return [];
}

export async function loadLanguageCatalogOnce() {
  if (_languages) return _languages;
  if (_loading) return _loading;

  _loading = (async () => {
    let list = await loadFromPublic();
    if (!Array.isArray(list) || list.length === 0) {
      list = await loadFromCode();
    }
    _languages = Array.isArray(list) ? list : [];
    _loading = null;
    return _languages;
  })();

  return _loading;
}

export function getLanguageCatalog() {
  return _languages || [];
}

export function findLanguageByHL(code) {
  if (!code) return null;
  const want = String(code).toLowerCase();
  return (getLanguageCatalog() || []).find(
    (l) => String(l.languageCodeHL || "").toLowerCase() === want
  ) || null;
}

export function findLanguageByISO(code) {
  if (!code) return null;
  const want = String(code).toLowerCase();
  return (getLanguageCatalog() || []).find(
    (l) => String(l.languageCodeIso || "").toLowerCase() === want
  ) || null;
}

export function clearLanguageCatalogCache() {
  _languages = null;
  _loading = null;
}
