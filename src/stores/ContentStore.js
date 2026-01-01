// src/stores/content.js
import { defineStore } from "pinia";
import * as ContentKeys from "src/utils/ContentKeyBuilder";
import { getCommonContent } from "../services/CommonContentService.js";
import { getLessonContent } from "../services/LessonContentService.js";
import { getTranslatedInterface } from "../services/InterfaceService.js";
import { buildVideoSource } from "@/utils/videoSource";
import { unref } from "vue";
import { normalizeSiteContentPayload } from "src/utils/normalizeSiteContent.js";
import { validateLessonNumber } from "./validators";
import { i18n } from "src/boot/i18n";
// for use by loadInterface

let lastInterfaceReq = 0;

export const useContentStore = defineStore("contentStore", {
  state: () => ({
    siteContent: {}, // {'siteContent-${hl}': json}
    commonContent: {}, // {'commonContent-${study}-${hl}': json}
    lessonContent: {}, // {'lessonContent-${study}-${hl}-${jf}-lesson-${n}': json}
    videoUrls: {}, // {'videoUrls-${study}-${jf}': [url1, url2]}
    // cache for video meta per study
    _videoMetaByStudy: {}, // { [study]: { provider, segments, meta } }
    translationComplete: {
      interface: false,
      commonContent: false,
      lessonContent: false,
    },
  }),

  getters: {
    commonContentFor:
      (state) =>
      (study, hl, variant = null) => {
        const key = ContentKeys.buildCommonContentKey(study, hl, variant);
        console.log("CommonContentFor was asked for " + key);
        const value = state.commonContent[key];
        console.log(value);

        if (!value) {
          return null;
        }
        if (typeof value !== "object") {
          console.warn(
            "[ContentStore.commonContentFor] non-object value in store",
            { key, study, hl, variant, value }
          );
          return null;
        }
        return value;
      },

    lessonContentFor: (state) => (study, hl, jf, lesson) => {
      const key = ContentKeys.buildLessonContentKey(study, hl, jf, lesson);
      "LessonContentFor was asked for " + key;
      const value = state.lessonContent[key];

      if (!value) {
        return null;
      }

      if (typeof value !== "object") {
        console.warn(
          "[ContentStore.lessonContentFor] non-object value in store",
          { key, study, hl, jf, lesson, value }
        );
        return null;
      }

      return value;
    },

    siteContentFor: (state) => (hl) => {
      const key = ContentKeys.buildSiteContentKey(hl);
      console.log("SiteContentFor was asked for " + key);
      const value = state.siteContent[key];

      if (!value) {
        return null;
      }

      if (typeof value !== "object") {
        console.warn(
          "[ContentStore.siteContentFor] non-object value in store",
          { key, hl, value }
        );
        return null;
      }

      return value;
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

    // moves retrieved common content into Content Store
    setCommonContent(study, hl, data, variant = null) {
      const key = ContentKeys.buildCommonContentKey(study, hl, variant);
      if (!key) {
        console.warn(
          "setCommonContent: commonContent key is null; skipping set.",
          { study, hl, variant }
        );
        return;
      }
      // Guard against accidentally storing the store itself
      if (data && typeof data === "object" && data.$id === "contentStore") {
        console.error(
          "setCommonContent: BUG – received contentStore instance as data.",
          { key, study, hl, variant }
        );
        return;
      }
      if (!data || typeof data !== "object") {
        console.warn(
          "setCommonContent: ignoring non-object commonContent payload.",
          { key, study, hl, variant, data }
        );
        return;
      }
      this.commonContent[key] = data;
    },

    // moves retrieved lesson content into Content Store
    setLessonContent(study, hl, jf, lesson, data) {
      const key = ContentKeys.buildLessonContentKey(study, hl, jf, lesson);
      if (!key) {
        console.warn(
          "setLessonContent: lessonContent key is null; skipping set.",
          { study, hl, jf, lesson }
        );
        return;
      }
      if (!data || typeof data !== "object") {
        console.warn("setLessonContent: ignoring non-object lesson payload.", {
          key,
          study,
          hl,
          jf,
          lesson,
          data,
        });
        return;
      }
      this.lessonContent[key] = data;
    },

    setSiteContent(hl, data) {
      const key = ContentKeys.buildSiteContentKey(hl);
      if (!key) {
        console.warn("setSiteContent: siteContent key is null; skipping set.", {
          hl,
        });
        return;
      }

      if (data && typeof data === "object" && data.$id === "contentStore") {
        console.error(
          "setSiteContent: BUG – received contentStore instance as data.",
          { key, hl }
        );
        return;
      }

      if (!data || typeof data !== "object") {
        console.warn(
          "setSiteContent: ignoring non-object siteContent payload.",
          { key, hl, data }
        );
        return;
      }

      const normalized = normalizeSiteContentPayload(data);
      if (!normalized) {
        console.warn("setSiteContent: failed to normalize siteContent.", {
          key,
          hl,
        });
        return;
      }

      this.siteContent[key] = normalized;
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
    async loadCommonContent(study, hl, variant = null) {
      const data = await getCommonContent(study, hl, variant);
      console.log(
        "loadCommonContent returned with the following, but I did nothing with it"
      );
      console.log(data);
      //this.setCommonContent(study, hl, data, variant);
      //getCommonContent already stores it via storeSetter/onInstall
      return data;
    },
    //  We get the interface content from
    // either the database (if we can), or go to the API
    async loadInterface(hl) {
      await getTranslatedInterface(hl); // fetch/cache only
      console.log("ContentStore.loadInterface changed interface to " + hl);
    },

    // We get the lesson content from
    // either the database (if we can), or go to the API
    async loadLessonContent(study, hl, jf, lesson) {
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
});
