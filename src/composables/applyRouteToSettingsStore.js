// src/composables/applyRouteToSettingsStore.js
import { DEFAULTS } from "src/constants/Defaults";
import {
  normStudyKey,
  normPositiveInt,
  normHL,
  normJF,
  normVariant,
} from "src/utils/normalize";

export function applyRouteToSettingsStore(route, settingsStore) {
  var params = route && route.params ? route.params : {};
  var query = route && route.query ? route.query : {};
  var ls = settingsStore.languageSelected || {};

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

  settingsStore.setLanguageCodes({ hl: hl, jf: jf });
}
