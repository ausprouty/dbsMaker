// useInitializeSettingsStore.js
import { DEFAULTS } from "src/constants/Defaults";

export function useInitializeSettingsStore(route, settingsStore) {
  // --- Resolve initial study/lesson ---
  var initialStudy =
    (route && route.params && route.params.study) ||
    settingsStore.currentStudy ||
    DEFAULTS.study;

  var initialLessonNumberRaw =
    (route && route.params && route.params.lesson) ||
    settingsStore.lessonNumberForStudy ||
    DEFAULTS.lesson;

  // Coerce lesson to number if your code expects a number
  var initialLessonNumber = parseInt(initialLessonNumberRaw, 10);
  if (isNaN(initialLessonNumber)) initialLessonNumber = DEFAULTS.lesson;

  // --- Resolve language codes (fallback to getter’s defaults) ---
  var ls = settingsStore.languageSelected || {};
  var initialHL =
    (route && route.params && route.params.languageCodeHL) ||
    ls.languageCodeHL ||
    DEFAULTS.languageCodeHL;

  var initialJF =
    ls.languageCodeJF || DEFAULTS.languageCodeJF;

  // --- Apply to store ---
  settingsStore.setCurrentStudy(initialStudy);
  settingsStore.setLessonNumber(initialStudy, initialLessonNumber);

  // Prefer one atomic update so object stays consistent
  settingsStore.setLanguageCodes({ hl: initialHL, jf: initialJF });
}
