// stores/settingsStore.js
import { defineStore } from "pinia";
import { settingsGetters } from "./settingsGetters";
import { settingsActions } from "./settingsActions";

export const useSettingsStore = defineStore("settingsStore", {
  state: () => ({
    apiProfile: "standard",
    appVersion: null,
    brandTitle: "",
    currentPath: null,
    currentStudy: "",
    followingHimSegment: "1-0-0",
    jVideoSegments: { segments: [], currentId: 1 },
    languageObjectSelected: null,
    languageSelectorMode:null,
    languages: [],
    languagesLoaded:false,
    languagesUsed: [],
    lessonNumber: { ctc: 1, lead: 1, life: 1, jvideo: 1 },
    maxLessons: {},
    menu: [],
    menuError: null,
    menuStatus: "idle",
    previousPage: "/index",
    variantForStudy: {},
  }),
  getters: settingsGetters,
  actions: settingsActions,
  persist: {
    enabled: true,
    strategies: [
      {
        key: "settingsStore",
        storage: localStorage,
        paths: [
          "apiProfile",
          "appVersion",
          "brandTitle",
          "currentPath",
          "currentStudy",
          "followingHimSegment",
          "jVideoSegments",
          "languageSelected",
          "languageSelectorMode",
          "languages",
          "languagesUsed",
          "lessonNumber",
          "maxLessons",
          "menu",
          "menuError",
          "menuStatus",
          "previousPage",
          "variantForStudy",
        ],
        // 👇 these hooks run when the plugin restores persisted state
        beforeRestore: (ctx) => {
          /* optional logging */
        },
        afterRestore: (ctx) => {
          ctx.store.normalizeShapes();
          if (typeof ctx.store.brandTitle !== "string")
            ctx.store.brandTitle = "";
        },
      },
    ],
  },
});
