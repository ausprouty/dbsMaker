import { normJF, normHL, isHLCode } from "src/utils/normalize";
import { detectDirection, applyDirection } from "src/i18n/i18nDirection";
import { i18n } from "src/boot/i18n";
import { useContentStore } from "src/stores/ContentStore";
import { MAX_LESSON_NUMBERS } from "src/constants/Defaults";
import { validateLessonNumber, validateNonEmptyString } from "./validators";

export const settingsActions = {
  applyRouteContext(payload) {
    payload = payload || {};

    // Expect cleaned values from route adapter, but still be defensive.
    var study = payload.study;
    var lesson = payload.lesson;
    var hl = payload.hl;
    var jf = payload.jf;
    var variant = payload.variant;

    if (study) this.setCurrentStudy(study);
    if (study && lesson) this.setLessonNumber(study, lesson);

    if (typeof this.setVariant === "function") {
      this.setVariant(variant);
    } else {
      this.variant = variant;
    }

    // VIDEO: store a string (JF). Only set if present, do not stomp.
    if (jf && typeof this.setVideoLanguageSelected === "function") {
      this.setVideoLanguageSelected(jf);
    } else if (jf) {
      this.videoLanguageSelected = jf;
    }

    // TEXT: needs an object. Resolve from HL and set it if HL changed.
    if (hl) {
      var cur = this.textLanguageObjectSelected || null;
      var curHL = cur && cur.languageCodeHL ? String(cur.languageCodeHL) : "";
      if (String(hl) !== curHL) {
        var found = this.findLanguageByHL(hl);
        var langObj = found || this.makeLanguageFallback(hl, jf);
        this.setTextLanguageObjectSelected(langObj);
      }
    }
  },

  findLanguageByHL(hl) {
    var key = String(hl || "").trim();
    if (!key) return null;

    var list = Array.isArray(this.languages) ? this.languages : [];
    for (var i = 0; i < list.length; i++) {
      if (String(list[i].languageCodeHL || "") === key) return list[i];
    }
    return null;
  },

  makeLanguageFallback(hl, jf) {
    return {
      name: String(hl || ""),
      ethnicName: "",
      languageCodeIso: "",
      languageCodeHL: String(hl || ""),
      languageCodeJF: String(jf || ""),
      languageCodeGoogle: "",
      textDirection: "ltr",
    };
  },

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
    this.textLanguageObjectSelected = null;
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
      this.textLanguageObjectSelected = rawS ? JSON.parse(rawS) : null;
    } catch {
      this.textLanguageObjectSelected = null;
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
      if (sel) this.setTextLanguageObjectSelected(sel);
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

  setTextLanguageObjectSelected(lang) {
    console.log("entered store to setTextLanguageObjectSelected");
    // Keep this for API stability (also updates MRU + direction)
    if (!lang) return;
    console.log("have language");
    console.log(lang);
    this.textLanguageObjectSelected = lang;
    this.addRecentLanguage(lang);
    try {
      localStorage.setItem("text:lang:selected", JSON.stringify(lang));
    } catch {}
    console.log("about to applyDirection");
    applyDirection(detectDirection(lang));
  },
  setVideoLanguageSelected(value) {
    var v = value == null ? "" : String(value);
    v = v.trim();
    this.videoLanguageSelected = v;
    try {
      localStorage.setItem("video:lang:selected", v);
    } catch {}
  },

  // this routine has to be wrong

  setLanguageCodes(payload) {
    // payload: { hl, jf }  (either may be provided)
    var hl = normHL(payload && payload.hl);
    var jf = normJF(payload && payload.jf);

    // Build/merge a selected object
    var base =
      (hl && this.findByHL(hl)) ||
      (this.textLanguageObjectSelected
        ? { ...this.textLanguageObjectSelected }
        : null) ||
      {};
    if (hl) base.languageCodeHL = hl;
    if (jf) base.languageCodeJF = jf;

    // Reasonable fallbacks for display
    if (!base.name) base.name = hl || base.languageCodeHL || "";
    if (!base.ethnicName) base.ethnicName = base.ethnicName || "";

    // Apply selection (handles MRU + direction + persist)
    this.setTextLanguageObjectSelected(base);
    return true;
  },

  // ------- Wrappers (backward compatible) -------
  setLanguageCodeHL(code) {
    this.setVideoLanguageSelected(code);
  },

  setLanguageCodeJF(code) {
    var jf = normJF(code);
    if (!jf) {
      console.warn("setLanguageCodeJF: invalid JF '" + code + "'.");
      return false;
    }
    var curHL =
      (this.textLanguageObjectSelected &&
        this.textLanguageObjectSelected.languageCodeHL) ||
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
  setSeasonalContent(payload) {
    this.seasonalContent = payload.content;
    this.seasonalExpires = payload.ends;
  },
  clearSeasonalContent() {
    this.seasonalContent = null;
    this.seasonalExpires = null;
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
};
