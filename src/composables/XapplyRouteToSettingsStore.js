// src/composables/applyRouteToSettingsStore.js
import { DEFAULTS } from "src/constants/Defaults";
import {
  normStudyKey,
  normPositiveInt,
  normHL,
  normJF,
  normVariant,
} from "src/utils/normalize";

function findByHL(catalog, hl) {
  var list = Array.isArray(catalog) ? catalog : [];
  for (var i = 0; i < list.length; i++) {
    if (String(list[i].languageCodeHL || "") === String(hl || ""))
      return list[i];
  }
  return null;
}
function makeLangFallback(hl, jf) {
  return {
    name: String(hl || ""),
    ethnicName: "",
    languageCodeIso: "",
    languageCodeHL: String(hl || ""),
    languageCodeJF: String(jf || ""),
    languageCodeGoogle: "",
    textDirection: "ltr",
  };
}

export function applyRouteToSettingsStore(route, settingsStore) {
  var params = route && route.params ? route.params : {};
  var query = route && route.query ? route.query : {};
  var ls =
    settingsStore.textLanguageObjectSelected ||
    settingsStore.languageObjectSelected || // legacy getter alias, if present
    {};
  // Optional query parameters (new style):
  //   ?t=eng00&jf=20615&var=apply
  // Keep legacy params for backward compatibility.
  var qStudy = query.study;
  var qLesson = query.lesson;
  var qHL = query.t || query.hl;
  var qJF = query.jf;
  var qVar = query.var;

  var study =
    normStudyKey(params.study) ||
    normStudyKey(qStudy) ||
    normStudyKey(settingsStore.currentStudySelected) ||
    normStudyKey(DEFAULTS.study) ||
    "dbs";

  var lesson =
    normPositiveInt(params.lesson) ||
    normPositiveInt(qLesson) ||
    (typeof settingsStore.lessonNumberForStudy === "function"
      ? settingsStore.lessonNumberForStudy(study)
      : undefined) ||
    DEFAULTS.lesson ||
    1;

  var hl =
    normHL(qHL) ||
    normHL(params.languageCodeHL) ||
    normHL(ls.languageCodeHL) ||
    DEFAULTS.languageCodeHL;

  var jf =
    normJF(qJF) ||
    normJF(params.languageCodeJF) ||
    normJF(settingsStore.videoLanguageSelected) ||
    normJF(ls.languageCodeJF) ||
    DEFAULTS.languageCodeJF;

  var variant = normVariant(qVar || params.variant);
  if (variant === "default") variant = null;

  settingsStore.setCurrentStudy(study);
  settingsStore.setLessonNumber(study, lesson);

  if (typeof settingsStore.setVariant === "function") {
    settingsStore.setVariant(variant);
  } else {
    settingsStore.variant = variant;
  }
  // TEXT language needs an object (store expects full lang object)
  var curHL = String((ls && ls.languageCodeHL) || "");
  if (String(hl) && String(hl) !== curHL) {
    var catalog = settingsStore.languages || [];
    var langObj = findByHL(catalog, hl) || makeLangFallback(hl, jf);

    if (typeof settingsStore.setTextLanguageObjectSelected === "function") {
      settingsStore.setTextLanguageObjectSelected(langObj);
    } else {
      settingsStore.textLanguageObjectSelected = langObj;
    }
  }

  // VIDEO language is a string (you requested this)
  if (jf) {
    if (typeof settingsStore.setVideoLanguageSelected === "function") {
      settingsStore.setVideoLanguageSelected(jf);
    } else {
      settingsStore.videoLanguageSelected = jf;
    }
  }
}
