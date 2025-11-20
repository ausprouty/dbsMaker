import { normJF, normHL, isHLCode } from "src/utils/normalize";
import { detectDirection, applyDirection } from "src/i18n/i18nDirection";
import { i18n } from "src/boot/i18n";
import { useContentStore } from "src/stores/ContentStore";
import { MAX_LESSON_NUMBERS } from "src/constants/Defaults";
import { validateLessonNumber, validateNonEmptyString } from "./validators";

export const settingsActions = {
  addRecentLanguage(lang) {
    if (!lang || !lang.languageCodeHL) return;
    var key = String(lang.languageCodeHL);
    var list = Array.isArray(this.languagesUsed) ? this.languagesUsed : [];
    var out = [];
    for (var i = 0; i < list.length; i++) {
      if (String(list[i].languageCodeHL || "") !== key) out.push(list[i]);
    }
    out.unshift(lang);
    this.languagesUsed = out.slice(0, 2);
    try {
      localStorage.setItem("lang:recents", JSON.stringify(this.languagesUsed));
    } catch {}
  },
  clearLanguagePrefs() {
    this.languageObjectSelected = null;
    this.languagesUsed = [];
    try {
      localStorage.removeItem("lang:selected");
      localStorage.removeItem("lang:recents");
    } catch {}
    applyDirection("ltr");
  },
  loadLanguagePrefs() {
    try {
      var rawR = localStorage.getItem("lang:recents");
      this.languagesUsed = rawR ? JSON.parse(rawR) : [];
    } catch {
      this.languagesUsed = [];
    }
    try {
      var rawS = localStorage.getItem("lang:selected");
      this.languageObjectSelected = rawS ? JSON.parse(rawS) : null;
    } catch {
      this.languageObjectSelected = null;
    }
  },
  findByHL(hl) {
    var key = String(hl || "");
    var list = Array.isArray(this.languages) ? this.languages : [];
    for (var i = 0; i < list.length; i++) {
      if (String(list[i].languageCodeHL || "") === key) return list[i];
    }
    return null;
  },

  loadLanguagePrefs() {
    try {
      var r = localStorage.getItem("lang:recents");
      this.languagesUsed = r ? JSON.parse(r) : [];
    } catch {
      this.languagesUsed = [];
    }
    try {
      var s = localStorage.getItem("lang:selected");
      var sel = s ? JSON.parse(s) : null;
      if (sel) this.setLanguageObjectSelected(sel);
    } catch {}
  },
  normalizeShapes() {
    if (
      !this.lessonNumber ||
      typeof this.lessonNumber !== "object" ||
      Array.isArray(this.lessonNumber)
    ) {
      this.lessonNumber = { ctc: 1, lead: 1, life: 1, jvideo: 1 };
    }
    if (
      !this.maxLessons ||
      typeof this.maxLessons !== "object" ||
      Array.isArray(this.maxLessons)
    ) {
      this.maxLessons = {};
    }
    if (!Array.isArray(this.menu)) this.menu = [];
  },
  setApiProfile(val) {
    this.apiProfile =
      typeof val === "string" && val.trim() ? val.trim() : "standard";
  },
  setBrandTitle(title) {
    this.brandTitle = typeof title === "string" ? title.trim() : "";
  },
  setCurrentStudy(study) {
    if (!validateNonEmptyString(study)) {
      console.warn(`setCurrentStudy: Invalid study '${study}'.`);
      return;
    }
    this.currentStudy = study;
  },
  // --- i18n: use HL code directly as the active vue-i18n locale
  setI18nLocaleFromHL(hl) {
    const code = normHL(hl); // e.g., "eng00"
    const { global } = i18n;
    global.locale.value = code;
  },

  /**
   * End-to-end: update selection (HL/JF), switch vue-i18n locale,
   * and proactively fetch the interface bundle.
   */
  async setLanguageAndApply(payload) {
    const { hl, jf } = this.setLanguageCodes(payload); // returns applied HL/JF
    this.setI18nLocaleFromHL(hl); // locale = 'eng00' etc.
    const content = useContentStore();
    await content.loadInterface({ hl, jf }); // fetch bundle
    i18n.global.locale.value = hl;
    console.log("SettingStore.setLanguageAndApply changed interface to " + hl);
  },

  setLanguageObjectSelected(lang) {
    console.log("entered store to setLanguageObjectSelected");
    // Keep this for API stability (also updates MRU + direction)
    if (!lang) return;
    console.log("have language");
    console.log(lang);
    this.languageObjectSelected = lang;
    this.addRecentLanguage(lang);
    try {
      localStorage.setItem("lang:selected", JSON.stringify(lang));
    } catch {}
    console.log("about to applyDirection");
    applyDirection(detectDirection(lang));
  },

  setLanguageCodes(payload) {
    // payload: { hl, jf }  (either may be provided)
    var hl = normHL(payload && payload.hl);
    var jf = normJF(payload && payload.jf);

    // Build/merge a selected object
    var base =
      (hl && this.findByHL(hl)) ||
      (this.languageObjectSelected
        ? { ...this.languageObjectSelected }
        : null) ||
      {};
    if (hl) base.languageCodeHL = hl;
    if (jf) base.languageCodeJF = jf;

    // Reasonable fallbacks for display
    if (!base.name) base.name = hl || base.languageCodeHL || "";
    if (!base.ethnicName) base.ethnicName = base.ethnicName || "";

    // Apply selection (handles MRU + direction + persist)
    this.setLanguageObjectSelected(base);
    return true;
  },

  // ------- Wrappers (backward compatible) -------
  setLanguageCodeHL(code) {
    var hl = normHL(code);
    if (!hl) {
      console.warn("setLanguageCodeHL: invalid HL '" + code + "'.");
      return false;
    }
    // Keep current JF if any
    var curJF =
      (this.languageObjectSelected &&
        this.languageObjectSelected.languageCodeJF) ||
      "";
    this.setLanguageCodes({ hl: hl, jf: curJF });
    return true;
  },

  setLanguageCodeJF(code) {
    var jf = normJF(code);
    if (!jf) {
      console.warn("setLanguageCodeJF: invalid JF '" + code + "'.");
      return false;
    }
    var curHL =
      (this.languageObjectSelected &&
        this.languageObjectSelected.languageCodeHL) ||
      "";
    this.setLanguageCodes({ hl: curHL, jf: jf });
    return true;
  },

  setLanguages(newLanguages) {
    if (!Array.isArray(newLanguages)) {
      console.warn(`setLanguages: Invalid languages input.`);
      return;
    }
    this.languages = newLanguages;
  },

  setLessonNumber(study, lesson) {
    console.log(`setLessonNumber called with study=${study}, lesson=${lesson}`);

    if (!this.lessonNumber.hasOwnProperty(study)) {
      console.warn(
        `setLessonNumber: Invalid study '${study}'. No changes made.`
      );
      return;
    }

    const parsedLesson = validateLessonNumber(lesson);
    if (parsedLesson === null) {
      console.warn(
        `setLessonNumber: Invalid lesson '${lesson}'. No changes made.`
      );
      return;
    }

    const clampedLesson = Math.min(parsedLesson, MAX_LESSON_NUMBERS[study]);
    this.lessonNumber[study] = clampedLesson;
  },

  setVariantForStudy(study, v) {
    const s = study?.toLowerCase();
    const clean =
      typeof v === "string"
        ? v
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9-]/g, "")
        : null;
    this.variantByStudy[s] = clean || null;
  },

  updateLanguageCodeHL(newCodeHL) {
    if (!this.languageSelected) {
      console.warn("updateLanguageCodeHL: No languageSelected set.");
      return;
    }
    if (!newCodeHL) {
      console.warn("updateLanguageCodeHL: Invalid newCodeHL.");
      return;
    }

    this.languageSelected = {
      ...this.languageSelected,
      languageCodeHL: newCodeHL,
    };
  },

  updateLanguageCodeJF(newCodeJF) {
    if (!this.languageSelected) {
      console.warn("updateLanguageCodeJF: No languageSelected set.");
      return;
    }
    if (!newCodeJF) {
      console.warn("updateLanguageCodeJF: Invalid newCodeJF.");
      return;
    }

    this.languageSelected = {
      ...this.languageSelected,
      languageCodeJF: newCodeJF,
    };
  },
};
