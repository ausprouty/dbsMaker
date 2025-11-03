// src/stores/content.js
import { defineStore } from "pinia";
import * as ContentKeys from "src/utils/ContentKeyBuilder";
import { getCommonContent } from "../services/CommonContentService.js";
import { getLessonContent } from "../services/LessonContentService.js";
import { getTranslatedInterface } from "../services/InterfaceService.js";
import { buildVideoSource } from "@/utils/videoSource";
import { unref } from "vue";
import { validateLessonNumber } from "./validators";

export const useContentStore = defineStore("contentStore", {
  state: () => ({
    commonContent: {}, // {'commonContent-${study}-${hl}': html}
    lessonContent: {}, // {'lessonContent-${study}-${hl}-${jf}-lesson-${n}': html}
    videoUrls: {}, // {'videoUrls-${study}-${jf}': [url1, url2]}
    // NEW: cache for video meta per study
    _videoMetaByStudy: {}, // { [study]: { provider, segments, meta } }
    translationComplete: {
      interface: false,
      commonContent: false,
      lessonContent: false,
    },
  }),

  getters: {
    lessonContentFor: (state) => (study, hl, jf, lesson) => {
      const key = ContentKeys.buildLessonContentKey(study, hl, jf, lesson);
      return state.lessonContent[key] || null;
    },

    commonContentFor:
      (state) =>
      (hl, study, variant = null) => {
        const key = ContentKeys.buildCommonContentKey(study, hl, variant);
        return state.commonContent[key] || null;
      },

    videoUrlsFor: (state) => (study, jf) => {
      const key = ContentKeys.buildVideoUrlsKey(study, jf);
      return state.videoUrls[key] || [];
    },

    isFullyTranslated: (state) => {
      return Object.values(state.translationComplete).every(Boolean);
    },

    // Optional convenience
    videoMetaFor: (state) => (study) => state._videoMetaByStudy[study] || null,
  },

  actions: {
    async getVideoSourceFor(study, languageHL, languageJF, lesson) {
      const meta = await this.getStudyVideoMeta(study); // { provider, segments, meta }
      const result = buildVideoSource({
        provider: meta.provider,
        study,
        lesson,
        languageHL,
        languageJF,
        meta: meta.meta, // contains autoJF61: true
      });
      return result; // { kind: "iframe", src: "...", poster?, title? }
    },
    // moves retreived common content into Content Store
    setCommonContent(study, hl, data, variant = null) {
      const key = ContentKeys.buildCommonContentKey(study, hl, variant);
      if (key) {
        this.commonContent[key] = data;
      } else {
        console.warn("commonContent key is null — skipping set.");
      }
    },
    // moves retreived lesson content into Content Store
    setLessonContent(study, hl, jf, lesson, data) {
      const key = ContentKeys.buildLessonContentKey(study, hl, jf, lesson);
      if (key) {
        this.lessonContent[key] = data;
      } else {
        console.warn("lessonContent key is null — skipping set.");
      }
    },
    // moves retreived videoURLs  into Content Store which I plan to remove
    setVideoUrls(study, jf, data) {
      const key = ContentKeys.buildVideoUrlsKey(study, jf);
      if (key) {
        this.videoUrls[key] = data;
      } else {
        console.warn("videoUrls key is null — skipping set.");
      }
    },
    // this is the good stuff.  We get the common content from
    // either the database (if we can), or go to the API
    async loadCommonContent(hl, study, variant = null) {
      const data = await getCommonContent(hl, study, variant);
      this.setCommonContent(study, hl, data, variant);
      return data;
    },
    // this is the good stuff.  We get the interface content from
    // either the database (if we can), or go to the API
    async loadInterface(hl) {
      await getTranslatedInterface(hl);
      i18n.global.locale.value = hl;
      console.log("ContentStore.loadInterface changed interface to " + hl);
      return;
    },
    // this is the good stuff.  We get the lesson content from
    // either the database (if we can), or go to the API
    async loadLessonContent(hl, jf, study, lesson) {
      const validated = validateLessonNumber(unref(lesson));
      if (validated === null) {
        console.warn(`Invalid lesson '${unref(lesson)}'`);
        return null;
      }
      return await getLessonContent(study, hl, jf, validated);
    },
    // I want to get rid of this
    async loadVideoUrls(jf, study) {
      return await getJesusVideoUrls(jf, study);
    },
    // used in resetting
    clearAllContent() {
      this.commonContent = {};
      this.lessonContent = {};
      this.videoUrls = {};
      this._videoMetaByStudy = {};
    },

    setTranslationComplete(section, value) {
      if (
        Object.prototype.hasOwnProperty.call(this.translationComplete, section)
      ) {
        this.translationComplete[section] = value;
      }
    },

    clearTranslationComplete() {
      for (const k in this.translationComplete) {
        this.translationComplete[k] = false;
      }
    },

    // ---------- Video meta API  ----------

    /**
     * Return { provider, segments, meta } for a study.
     * Caches per study in state._videoMetaByStudy.
     * JESUS film (“jvideo”) is 61 segments and uses auto jf61 refs.
     */
    async getStudyVideoMeta(study) {
      if (this._videoMetaByStudy[study]) {
        return this._videoMetaByStudy[study];
      }

      let meta;
      switch (study) {
        case "jvideo":
          meta = {
            provider: "arclight",
            segments: 61,
            meta: {
              // tells the util to build refs like 1_<JF>-jf61LL-0-0
              autoJF61: true,
            },
          };
          break;

        default:
          // Example default: simple single-lesson vimeo
          meta = {
            provider: "vimeo",
            segments: 1,
            meta: {
              // vimeoId: "123456789",
              // or: lessons: { "1": { vimeoId: "..." } }
            },
          };
          break;
      }

      this._videoMetaByStudy[study] = meta;
      return meta;
    },

    /**
     * Manually override meta for a study (e.g., from config/API).
     */
    setStudyVideoMeta(study, value) {
      this._videoMetaByStudy[study] = value;
    },
  },

  persist: false,
});
