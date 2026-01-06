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
  var key = String(googleCode || "");
  if (!key) return null;

  // 1) Exact match first (important for zh-CN, zh-TW)
  for (var i = 0; i < list.length; i++) {
    if (String(list[i].languageCodeGoogle || "") === key) return list[i];
  }

  // 2) If it is zh special, do not degrade to "zh"
  if (isZhSpecial(key)) return null;

  // 3) Try base code if present (pt-BR would have been normalized to pt,
  // but this is an extra guard if a full tag slips through)
  var base = key.split("-")[0];
  if (base && base !== key) {
    for (var k = 0; k < list.length; k++) {
      if (String(list[k].languageCodeGoogle || "") === base) return list[k];
    }
  }

  return null;
}

function findByHL(catalog, hl) {
  var list = Array.isArray(catalog) ? catalog : [];
  for (var i = 0; i < list.length; i++) {
    if (String(list[i].languageCodeHL || "") === String(hl || "")) {
      return list[i];
    }
  }
  return null;
}

function addToMRU(store, lang) {
  var key = String((lang && lang.languageCodeHL) || "");
  if (!key) return;
  var list = Array.isArray(store.languagesUsed) ? store.languagesUsed : [];
  var filtered = [];
  for (var i = 0; i < list.length; i++) {
    if (String(list[i].languageCodeHL || "") !== key) filtered.push(list[i]);
  }
  filtered.unshift(lang);
  store.languagesUsed = filtered.slice(0, 2); // keep two

  try {
    localStorage.setItem("lang:recents", JSON.stringify(store.languagesUsed));
  } catch (e) {}
  try {
    localStorage.setItem("lang:selected", JSON.stringify(lang));
  } catch (e) {}
}

function loadMRU(store) {
  try {
    var raw = localStorage.getItem("lang:recents");
    store.languagesUsed = raw ? JSON.parse(raw) : [];
  } catch (e) {
    store.languagesUsed = [];
  }
  try {
    var rawSel = localStorage.getItem("lang:selected");
    store.languageObjectSelected = rawSel ? JSON.parse(rawSel) : null;
  } catch (e) {
    store.languageObjectSelected = null;
  }
}

export default boot(function ({ router }) {
  var s = useSettingsStore();

  // Load persisted prefs (use store method if you have it)
  if (typeof s.loadLanguagePrefs === "function") {
    try {
      s.loadLanguagePrefs();
    } catch (e) {}
  } else {
    loadMRU(s);
  }

  var r = router.currentRoute.value;
  var fromRoute = pickFromRoute(r);

  // If URL specifies languages, adopt them and update MRU
  if (fromRoute.hl && fromRoute.jf) {
    var lang = findByHL(s.languages, fromRoute.hl) || {
      languageCodeHL: fromRoute.hl,
      languageCodeJF: fromRoute.jf,
      name: fromRoute.hl,
      ethnicName: "",
    };

    if (typeof s.setLanguageObjectSelected === "function") {
      s.setLanguageObjectSelected(lang);
    } else {
      s.languageObjectSelected = lang;
    }
    addToMRU(s, lang);
    return;
  }
  // If nothing is selected yet, try browser language (match by languageCodeGoogle)
  if (!s.languageObjectSelected) {
    var prefs = getBrowserGooglePrefs();
    var picked = null;
    for (var p = 0; p < prefs.length; p++) {
      picked = findByGoogle(s.languages, prefs[p]);
      if (picked) break;
    }
    if (!picked) picked = DEFAULT_ENGLISH;

    if (typeof s.setLanguageObjectSelected === "function") {
      s.setLanguageObjectSelected(picked);
    } else {
      s.languageObjectSelected = picked;
    }
    addToMRU(s, picked);
    // Continue on, so the URL can be updated below from MRU[0]
  }

  // Otherwise, use MRU[0] if present and update the URL
  if (Array.isArray(s.languagesUsed) && s.languagesUsed.length > 0) {
    var top = s.languagesUsed[0];
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

    if (typeof s.setLanguageObjectSelected === "function") {
      s.setLanguageObjectSelected(top);
    } else {
      s.languageObjectSelected = top;
    }

    router
      .replace({ name: name, params: params, query: query, hash: hash })
      .catch(function () {});
  }
});
