import { boot } from "quasar/wrappers";
import { useSettingsStore } from "src/stores/SettingsStore";

var DEFAULT_ENGLISH = {
  name: "English",
  ethnicName: "English",
  languageCodeIso: "eng",
  languageCodeHL: "eng00",
  languageCodeJF: "529",
  languageCodeGoogle: "en",
  textDirection: "ltr",
};

function asTrimmed(v) {
  return String(v == null ? "" : v).trim();
}

function routeHasLangParams(r) {
  return (
    r &&
    r.params &&
    "languageCodeHL" in r.params &&
    "languageCodeJF" in r.params
  );
}

function isZhSpecial(code) {
  return code === "zh-CN" || code === "zh-TW";
}

function normalizeGoogleTag(tag) {
  // Accept zh-CN, zh_TW, EN-au, etc.
  var t = String(tag || "").trim();
  if (!t) return "";
  t = t.replace("_", "-");

  var lower = t.toLowerCase();
  if (lower === "zh-cn") return "zh-CN";
  if (lower === "zh-tw") return "zh-TW";

  // Default: two-letter base code (en-AU -> en)
  var base = lower.split("-")[0];
  if (base.length === 2) return base;
  return lower;
}

function getBrowserGooglePrefs() {
  // Return best-first list of normalized codes
  var out = [];
  try {
    var nav = typeof navigator !== "undefined" ? navigator : null;
    var list = nav && Array.isArray(nav.languages) ? nav.languages : [];
    var primary = nav && nav.language ? [nav.language] : [];
    var combined = list.concat(primary);

    for (var i = 0; i < combined.length; i++) {
      var code = normalizeGoogleTag(combined[i]);
      if (!code) continue;
      // keep unique
      var seen = false;
      for (var j = 0; j < out.length; j++) {
        if (out[j] === code) {
          seen = true;
          break;
        }
      }
      if (!seen) out.push(code);
    }
  } catch (e) {}
  return out;
}

function pickFromRoute(r) {
  var hl = "",
    jf = "";
  if (r && r.params) {
    if (r.params.languageCodeHL) hl = String(r.params.languageCodeHL);
    if (r.params.languageCodeJF) jf = String(r.params.languageCodeJF);
  }
  if (!hl && r && r.query && r.query.hl) hl = String(r.query.hl);
  if (!jf && r && r.query && r.query.jf) jf = String(r.query.jf);
  return { hl: hl, jf: jf };
}

function findByGoogle(catalog, googleCode) {
  var list = Array.isArray(catalog) ? catalog : [];
  var key = asTrimmed(googleCode);
  if (!key) return null;

  // 1) Exact match first (important for zh-CN, zh-TW)
  for (var i = 0; i < list.length; i++) {
    if (asTrimmed(list[i].languageCodeGoogle) === key) return list[i];
  }

  // 2) If it is zh special, do not degrade to "zh"
  if (isZhSpecial(key)) return null;

  // 3) Try base code if present (pt-BR would have been normalized to pt,
  // but this is an extra guard if a full tag slips through)
  var base = key.split("-")[0];
  if (base && base !== key) {
    for (var k = 0; k < list.length; k++) {
      if (asTrimmed(list[k].languageCodeGoogle) === base) return list[k];
    }
  }

  return null;
}

function findByHL(catalog, hl) {
  var list = Array.isArray(catalog) ? catalog : [];
  var key = asTrimmed(hl);
  if (!key) return null;
  for (var i = 0; i < list.length; i++) {
    if (asTrimmed(list[i].languageCodeHL) === key) {
      return list[i];
    }
  }
  return null;
}

function findByJF(catalog, jf) {
  var list = Array.isArray(catalog) ? catalog : [];
  var key = asTrimmed(jf);
  if (!key) return null;
  for (var i = 0; i < list.length; i++) {
    if (asTrimmed(list[i].languageCodeJF) === key) return list[i];
  }
  return null;
}

function addToMRU(store, lang) {
  var key = asTrimmed(lang && lang.languageCodeHL);
  if (!key) return;
  var list = Array.isArray(store.languagesUsed) ? store.languagesUsed : [];
  var filtered = [];
  for (var i = 0; i < list.length; i++) {
    var item = list[i];
    // Guard against legacy/corrupt entries (e.g., strings) in MRU
    var itemHL = "";
    if (item && typeof item === "object")
      itemHL = asTrimmed(item.languageCodeHL);
    if (itemHL !== key) filtered.push(item);
  }
  filtered.unshift(lang);
  store.languagesUsed = filtered.slice(0, 2); // keep two
}

function hasValidHL(obj) {
  return !!(obj && obj.languageCodeHL != null && asTrimmed(obj.languageCodeHL));
}
function hasValidJF(obj) {
  return !!(obj && obj.languageCodeJF != null && asTrimmed(obj.languageCodeJF));
}

function resolveCatalogLanguageByHL(store, hl) {
  var catalog = store && Array.isArray(store.languages) ? store.languages : [];
  var key = asTrimmed(hl);
  if (!key) return null;
  return findByHL(catalog, key);
}
function resolveCatalogLanguageByJF(store, jf) {
  var catalog = store && Array.isArray(store.languages) ? store.languages : [];
  var key = asTrimmed(jf);
  if (!key) return null;
  return findByJF(catalog, key);
}

function getDefaultLanguageFromCatalog(store) {
  // Requirement: selection must yield one of the catalog entries by HL.
  var d = resolveCatalogLanguageByHL(store, DEFAULT_ENGLISH.languageCodeHL);
  return d || null;
}

function getDefaultVideoLanguageFromCatalog(store) {
  // Default video selection by JF (usually matches English 529)
  var d = resolveCatalogLanguageByJF(store, DEFAULT_ENGLISH.languageCodeJF);
  return d || getDefaultLanguageFromCatalog(store);
}

function isValidSelectedInCatalog(store, obj) {
  if (!hasValidHL(obj)) return false;
  var hl = asTrimmed(obj.languageCodeHL);
  return !!resolveCatalogLanguageByHL(store, hl);
}
function isValidVideoSelectedInCatalog(store, obj) {
  if (!hasValidJF(obj)) return false;
  var jf = asTrimmed(obj.languageCodeJF);
  return !!resolveCatalogLanguageByJF(store, jf);
}
function setSelectedTextLanguage(store, langObj) {
  if (typeof store.setTextLanguageObjectSelected === "function") {
    store.setTextLanguageObjectSelected(langObj);
  } else {
    store.textLanguageObjectSelected = langObj;
  }
}
function setSelectedVideoLanguage(store, langObj) {
  if (typeof store.setVideoLanguageObjectSelected === "function") {
    store.setVideoLanguageObjectSelected(langObj);
  } else {
    store.videoLanguageObjectSelected = langObj;
  }
}

function normalizeTextSelectionToCatalog(store, candidate) {
  // Always return a catalog-backed language object (by languageCodeHL),
  // falling back to DEFAULT_ENGLISH (by HL) when needed.
  var picked = null;
  if (isValidSelectedInCatalog(store, candidate)) {
    picked = resolveCatalogLanguageByHL(store, candidate.languageCodeHL);
  }
  if (!picked) picked = getDefaultLanguageFromCatalog(store);
  return picked;
}

function normalizeVideoSelectionToCatalog(store, candidate) {
  // Always return a catalog-backed language object (by languageCodeJF),
  // falling back to DEFAULT video (by JF) when needed.
  var picked = null;
  if (isValidVideoSelectedInCatalog(store, candidate)) {
    picked = resolveCatalogLanguageByJF(store, candidate.languageCodeJF);
  }
  if (!picked) picked = getDefaultVideoLanguageFromCatalog(store);
  return picked;
}

export default boot(function ({ router }) {
  var s = useSettingsStore();

  var r = router.currentRoute.value;
  var fromRoute = pickFromRoute(r);

  // If URL specifies HL (and optionally JF), adopt HL and normalize to catalog.
  // JF in the URL is treated as advisory; the selected object always comes
  // from the catalog (by HL), so JF will be corrected if needed.
  if (asTrimmed(fromRoute.hl)) {
    // Must yield a catalog language by HL.
    var langFromCatalog = resolveCatalogLanguageByHL(s, fromRoute.hl);
    var chosen = langFromCatalog || getDefaultLanguageFromCatalog(s);

    if (chosen) {
      setSelectedTextLanguage(s, chosen);
      addToMRU(s, chosen);

      // Also normalize if route JF was missing/blank, so the URL becomes complete.
      if (!langFromCatalog || !asTrimmed(fromRoute.jf)) {
        var nameN = r.name;
        var paramsN = Object.assign({}, r.params);
        var queryN = Object.assign({}, r.query);
        var hashN = r.hash || "";

        if (routeHasLangParams(r)) {
          paramsN.languageCodeHL = chosen.languageCodeHL;
          paramsN.languageCodeJF = chosen.languageCodeJF;
        } else {
          queryN.hl = chosen.languageCodeHL;
          queryN.jf = chosen.languageCodeJF;
        }

        router
          .replace({ name: nameN, params: paramsN, query: queryN, hash: hashN })
          .catch(function () {});
      }
    }
    return;
  }

  // If we already have a selection, ensure it is valid and catalog-backed.
  if (
    s.textLanguageObjectSelected &&
    !isValidSelectedInCatalog(s, s.textLanguageObjectSelected)
  ) {
    var normalized = normalizeTextSelectionToCatalog(
      s,
      s.textLanguageObjectSelected
    );
    if (normalized) {
      setSelectedTextLanguage(s, normalized);
      addToMRU(s, normalized);
    }
  }

  // If nothing is selected yet, try browser language (match by languageCodeGoogle)
  if (!isValidSelectedInCatalog(s, s.textLanguageObjectSelected)) {
    var prefs = getBrowserGooglePrefs();
    var picked = null;
    for (var p = 0; p < prefs.length; p++) {
      picked = findByGoogle(s.languages, prefs[p]);
      if (picked) break;
    }
    if (!picked) picked = getDefaultLanguageFromCatalog(s);
    // If catalog is not ready, do not set a non-catalog stub.
    if (picked) {
      setSelectedTextLanguage(s, picked);
      addToMRU(s, picked);
    }
    // Continue on, so the URL can be updated below from MRU[0]
  }

  // ---- Video language normalization (boot-time) ----
  // Ensure videoLanguageObjectSelected is catalog-backed by JF.
  // If missing/invalid, derive from textLanguageObjectSelected.languageCodeJF if possible.
  if (!isValidVideoSelectedInCatalog(s, s.videoLanguageObjectSelected)) {
    var derived = null;
    if (hasValidJF(s.textLanguageObjectSelected)) {
      derived = resolveCatalogLanguageByJF(
        s,
        s.textLanguageObjectSelected.languageCodeJF
      );
    }
    if (!derived) {
      derived = normalizeVideoSelectionToCatalog(
        s,
        s.videoLanguageObjectSelected
      );
    }
    // If catalog not ready, derived may be null; do not set a stub.
    if (derived) {
      setSelectedVideoLanguage(s, derived);
    }
  }

  // Otherwise, use MRU[0] if present and update the URL
  if (Array.isArray(s.languagesUsed) && s.languagesUsed.length > 0) {
    // Must yield a catalog language by HL.
    var topRaw = s.languagesUsed[0];
    var top = normalizeTextSelectionToCatalog(s, topRaw);
    if (!top) return;
    var name = r.name;
    var params = Object.assign({}, r.params);
    var query = Object.assign({}, r.query);
    var hash = r.hash || "";

    if (routeHasLangParams(r)) {
      params.languageCodeHL = top.languageCodeHL;
      params.languageCodeJF = top.languageCodeJF;
    } else {
      query.hl = top.languageCodeHL;
      query.jf = top.languageCodeJF;
    }

    setSelectedTextLanguage(s, top);

    router
      .replace({ name: name, params: params, query: query, hash: hash })
      .catch(function () {});
  }
});
