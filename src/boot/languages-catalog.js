// src/boot/languages-catalog.js
import { boot } from "quasar/wrappers";
import { useSettingsStore } from "src/stores/SettingsStore";
import bundledCatalog from "src/i18n/metadata/languages.json"; // ultimate fallback

// Basic sanity check: must be a non-empty array with HL + JF codes present
function isValidCatalog(list) {
  if (!Array.isArray(list) || list.length === 0) {
    return false;
  }

  return list.every(function (x) {
    if (!x) return false;

    var hl = x.languageCodeHL || x.hl;
    var jf = x.languageCodeJF || x.jf;

    return !!hl && !!jf;
  });
}

// Normalise direction: default to 'ltr'; accept 'rtl' / 'RTL' as rtl
function normalizeDirection(raw) {
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
    var direction = normalizeDirection(x.direction);

    // Spread original object first, then override with normalised fields
    return {
      ...x,
      languageCodeHL: languageCodeHL,
      languageCodeJF: languageCodeJF,
      name: x.name || x.displayName || String(languageCodeHL || ""),
      ethnicName: x.ethnicName || x.nativeName || "",
      languageCodeIso: x.languageCodeIso || x.languageCodeISO || x.iso || "",
      direction: direction,
    };
  });
}

export default boot(async function () {
  const s = useSettingsStore();

  // If languages already in the store, don't refetch
  if (Array.isArray(s.languages) && s.languages.length > 0) {
    return;
  }

  // Normalise base so we always end with a single slash
  const base = (import.meta.env.BASE_URL || "/").replace(/\/+$/, "") + "/";

  // Figure out which build we are (guru, hope, jvideo, etc.)
  // VITE_APP is set in .env.guru, .env.hope, etc.
  const appBuild = (
    import.meta.env.VITE_APP ||
    import.meta.env.VITE_SITE_MODE ||
    ""
  ).trim();

  // Dev-only quirk: per-build folder like
  // public-guru/config/languages.json
  const devBuildCatalog =
    import.meta.env.DEV && appBuild
      ? base + "public-" + appBuild + "/config/languages.json"
      : null;

  // Optional override via env (absolute or relative URL)
  const overrideCatalog = import.meta.env.VITE_LANG_CONFIG_PATH || null;

  // Order matters: first match that returns a valid catalog wins
  const candidates = [
    // Primary (prod & dev when served from /public or site root)
    base + "config/languages.json",
    // Dev-only per-build path (public-guru, public-hope, etc.)
    devBuildCatalog,
    // Optional explicit override
    overrideCatalog,
  ].filter(Boolean); // drop null/empty entries

  let loaded = null;
  let from = "bundled";

  for (const url of candidates) {
    try {
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) {
        if (import.meta.env.DEV) {
          console.warn("[languages] HTTP " + res.status + " for " + url);
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

  s.setLanguages(loaded);

  if (import.meta.env.DEV) {
    console.log(
      "[languages] loaded " + loaded.length + " entries from: " + from
    );
  }
});
