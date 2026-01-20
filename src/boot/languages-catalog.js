// src/boot/languages-catalog.js
import { boot } from "quasar/wrappers";
import { useSettingsStore } from "src/stores/SettingsStore";
import bundledCatalog from "src/i18n/metadata/languages.json"; // ultimate fallback

// Basic sanity check: must be a non-empty array with HL codes present
function isValidCatalog(list) {
  if (!Array.isArray(list) || list.length === 0) {
    return false;
  }

  return list.every(function (x) {
    if (!x) return false;

    var hl = x.languageCodeHL || x.hl;

    return !!hl;
  });
}

// Normalise textDirection: default to 'ltr'; accept 'rtl' / 'RTL' as rtl
function normalizeTextDirection(raw) {
  if (!raw) return "ltr";

  var d = String(raw).trim().toLowerCase();
  if (d === "rtl") return "rtl";

  return "ltr";
}

// Map possible alt keys like "hl"/"jf"/"iso" to the expected shape
function normalizeCatalog(list) {
  return list.map(function (x) {
    var languageCodeHL = x.languageCodeHL || x.hl || "";
    var languageCodeJF = x.languageCodeJF || x.jf || "";
    // Prefer textDirection; fall back to legacy "direction" if present
    var textDirection = normalizeTextDirection(x.textDirection || x.direction);
    var channels = Array.isArray(x.channels) ? x.channels.slice() : null;
    if (!channels) {
      channels = [];
      if (languageCodeHL) channels.push("text");
      if (languageCodeJF) channels.push("video");
    }
    var numeralSet = x.numeralSet || x.numeral_set || x.numerals || "latn";
    numeralSet =
      String(numeralSet || "latn")
        .trim()
        .toLowerCase() || "latn";

    // Spread original object first, then override with normalised fields
    return {
      ...x,
      languageCodeHL: languageCodeHL,
      languageCodeJF: languageCodeJF,
      name: x.name || x.displayName || String(languageCodeHL || ""),
      ethnicName: x.ethnicName || x.nativeName || "",
      languageCodeIso: x.languageCodeIso || x.languageCodeISO || x.iso || "",
      textDirection: textDirection,
      channels: channels,
      numeralSet: numeralSet,
    };
  });
}

function looksLikeJsonResponse(res) {
  var ct =
    res.headers && res.headers.get
      ? String(res.headers.get("content-type") || "")
      : "";
  ct = ct.toLowerCase();
  return ct.indexOf("application/json") !== -1 || ct.indexOf("+json") !== -1;
}

function resolveCandidateUrl(raw, base) {
  if (!raw) return null;

  var s = String(raw).trim();
  if (!s) return null;

  // Absolute URL (http/https)
  if (/^https?:\/\//i.test(s)) return s;

  // Root-relative
  if (s.charAt(0) === "/") return s;

  // Relative to Vite base
  return base + s.replace(/^\/+/, "");
}

function isBundledSelector(raw) {
  if (!raw) return false;
  var s = String(raw).trim();
  if (!s) return false;

  // Treat any src/* path as a request to use the bundled import,
  // since it is not a runtime URL that fetch() can load.
  if (s.indexOf("src/") === 0 || s.indexOf("./src/") === 0) return true;

  // Allow explicit sentinel too.
  if (s.toLowerCase() === "bundled") return true;

  return false;
}

export default boot(async function () {
  const s = useSettingsStore();

  // Normalise base so we always end with a single slash
  const base = (import.meta.env.BASE_URL || "/").replace(/\/+$/, "") + "/";

  // Single source of truth:
  // - "src/..." => bundled (no fetch)
  // - otherwise treated as URL/path to fetch (e.g. "config/languages.json")
  const languageData = String(import.meta.env.VITE_LANGUAGE_DATA || "").trim();

  let loaded = null;
  let from = "bundled";

  // If env requests bundled, do not fetch anything
  if (isBundledSelector(languageData)) {
    loaded = normalizeCatalog(bundledCatalog);
    from = "bundled (VITE_LANGUAGE_DATA)";
    s.setLanguages(loaded);
    if (import.meta.env.DEV) {
      console.log(
        "[languages] loaded " + loaded.length + " entries from: " + from
      );
    }
    return;
  }

  // Otherwise, fetch the configured path (or default to config/languages.json)
  const primaryUrl = resolveCandidateUrl(
    languageData || "config/languages.json",
    base
  );

  // Candidates: primary first, then optional legacy var, then root default, then bundled fallback
  const legacyUrl = resolveCandidateUrl(
    import.meta.env.VITE_LANG_CONFIG_PATH || null,
    base
  );

  const candidates = [primaryUrl, legacyUrl]
    .filter(Boolean)
    .filter(function (v, i, a) {
      return a.indexOf(v) === i;
    });

  for (const url of candidates) {
    try {
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) {
        if (import.meta.env.DEV) {
          console.warn("[languages] HTTP " + res.status + " for " + url);
        }
        continue;
      }

      // Avoid trying to parse index.html (SPA fallback) as JSON
      if (!looksLikeJsonResponse(res)) {
        if (import.meta.env.DEV) {
          console.warn("[languages] non-JSON response for " + url);
        }
        continue;
      }

      const json = await res.json();
      if (!isValidCatalog(json)) {
        if (import.meta.env.DEV) {
          console.warn("[languages] invalid catalog at " + url);
        }
        continue;
      }

      loaded = normalizeCatalog(json);
      from = url;
      break;
    } catch (err) {
      if (import.meta.env.DEV) {
        console.warn("[languages] error loading " + url, err);
      }
      // try next candidate
    }
  }

  // If nothing loaded from HTTP, fall back to bundled catalog
  if (!loaded) {
    loaded = normalizeCatalog(bundledCatalog);
    from = "bundled (in-app)";
  }

  // If store already had languages (persisted), prefer the site config/bundled
  // result we just resolved. This prevents stale persisted master lists from
  // overriding a smaller site-specific catalog.

  s.setLanguages(loaded);

  if (import.meta.env.DEV) {
    console.log(
      "[languages] loaded " + loaded.length + " entries from: " + from
    );
  }
});
