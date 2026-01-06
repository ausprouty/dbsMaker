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
  var ls = settingsStore.languageSelected || {};

  var study =
    normStudyKey(params.study) ||
    normStudyKey(settingsStore.currentStudySelected) ||
    normStudyKey(DEFAULTS.study) ||
    "dbs";

  var lesson =
    normPositiveInt(params.lesson) ||
    (typeof settingsStore.lessonNumberForStudy === "function"
      ? settingsStore.lessonNumberForStudy(study)
      : undefined) ||
    DEFAULTS.lesson ||
    1;

  var hl =
    normHL(params.languageCodeHL) ||
    normHL(ls.languageCodeHL) ||
    DEFAULTS.languageCodeHL;

  var jf =
    normJF(params.languageCodeJF) ||
    normJF(ls.languageCodeJF) ||
    DEFAULTS.languageCodeJF;

  var variant = normVariant(params.variant);
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
