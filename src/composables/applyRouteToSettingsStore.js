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

  // New style query aliases:
  //   ?t=eng00&jf=20615&var=apply
  // Keep legacy params for backward compatibility.
  var rawStudy = params.study || query.study;
  var rawLesson = params.lesson || query.lesson;

  // HL: prefer query.t, then query.hl, then legacy param
  var rawHL = query.t || query.hl || params.languageCodeHL;

  // JF: prefer query.jf, then legacy param
  var rawJF = query.jf || params.languageCodeJF;

  // Variant: prefer query.var, then legacy param
  var rawVar = query.var || params.variant;

  // ---- Normalize with fallbacks -------------------------------------------

  var study =
    normStudyKey(rawStudy) ||
    normStudyKey(settingsStore.currentStudySelected) ||
    normStudyKey(DEFAULTS.study) ||
    "dbs";

  var lesson =
    normPositiveInt(rawLesson) ||
    (typeof settingsStore.lessonNumberForStudy === "function"
      ? settingsStore.lessonNumberForStudy(study)
      : undefined) ||
    DEFAULTS.lesson ||
    1;

  var hl =
    normHL(rawHL) ||
    // fallback to existing text selection (object) if present
    normHL(
      settingsStore.textLanguageObjectSelected &&
        settingsStore.textLanguageObjectSelected.languageCodeHL
    ) ||
    // legacy
    normHL(
      settingsStore.languageObjectSelected &&
        settingsStore.languageObjectSelected.languageCodeHL
    ) ||
    DEFAULTS.languageCodeHL;

  var jf =
    normJF(rawJF) ||
    // prefer videoLanguageSelected as you requested
    normJF(settingsStore.videoLanguageSelected) ||
    // fallback to text selection's JF if video is not chosen yet
    normJF(
      settingsStore.textLanguageObjectSelected &&
        settingsStore.textLanguageObjectSelected.languageCodeJF
    ) ||
    normJF(
      settingsStore.languageObjectSelected &&
        settingsStore.languageObjectSelected.languageCodeJF
    ) ||
    DEFAULTS.languageCodeJF;

  var variant = normVariant(rawVar);

  // ---- Apply to store ------------------------------------------------------
  // Preferred: one store action owns consistency + HL lookup.
  if (typeof settingsStore.applyRouteContext !== "function") {
    throw new Error("SettingsStore.applyRouteContext is required");
  }
  settingsStore.applyRouteContext({ study, lesson, variant, hl, jf });
}
