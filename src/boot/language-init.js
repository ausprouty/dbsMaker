import { boot } from "quasar/wrappers";
import { useSettingsStore } from "src/stores/SettingsStore";

function routeHasLangParams(r) {
  return r && r.params &&
    ("languageCodeHL" in r.params) && ("languageCodeJF" in r.params);
}

function pickFromRoute(r) {
  var hl = "", jf = "";
  if (r && r.params) {
    if (r.params.languageCodeHL) hl = String(r.params.languageCodeHL);
    if (r.params.languageCodeJF) jf = String(r.params.languageCodeJF);
  }
  if (!hl && r && r.query && r.query.hl) hl = String(r.query.hl);
  if (!jf && r && r.query && r.query.jf) jf = String(r.query.jf);
  return { hl: hl, jf: jf };
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

  try { localStorage.setItem("lang:recents", JSON.stringify(store.languagesUsed)); } catch (e) {}
  try { localStorage.setItem("lang:selected", JSON.stringify(lang)); } catch (e) {}
}

function loadMRU(store) {
  try {
    var raw = localStorage.getItem("lang:recents");
    store.languagesUsed = raw ? JSON.parse(raw) : [];
  } catch (e) { store.languagesUsed = []; }
  try {
    var rawSel = localStorage.getItem("lang:selected");
    store.languageObjectSelected = rawSel ? JSON.parse(rawSel) : null;
  } catch (e) { store.languageObjectSelected = null; }
}

export default boot(function ({ router }) {
  var s = useSettingsStore();

  // Load persisted prefs (use store method if you have it)
  if (typeof s.loadLanguagePrefs === "function") {
    try { s.loadLanguagePrefs(); } catch (e) {}
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
      ethnicName: ""
    };

    if (typeof s.setLanguageObjectSelected === "function") {
      s.setLanguageObjectSelected(lang);
    } else {
      s.languageObjectSelected = lang;
    }
    addToMRU(s, lang);
    return;
  }

  // Otherwise, use MRU[0] if present and update the URL
  if (Array.isArray(s.languagesUsed) && s.languagesUsed.length > 0) {
    var top = s.languagesUsed[0];
    var name = r.name;
    var params = Object.assign({}, r.params);
    var query  = Object.assign({}, r.query);
    var hash   = r.hash || "";

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

    router.replace({ name: name, params: params, query: query, hash: hash })
      .catch(function () {});
  }
});
