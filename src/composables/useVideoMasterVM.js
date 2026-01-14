// src/composables/useVideoMasterVM.js
import { computed, watch, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useI18n } from "vue-i18n";

import { useSettingsStore } from "src/stores/SettingsStore";
import { useVideoParams } from "src/composables/useVideoParams";
import { useCommonContent } from "src/composables/useCommonContent";
import { useProgressTracker } from "src/composables/useProgressTracker";
import { useVideoSourceFromSpec } from "src/composables/useVideoSourceFromSpec";

import { normParamStr, isObj } from "src/utils/normalize.js";

export function useVideoMasterVM() {
  // Router & i18n
  const route = useRoute();
  const router = useRouter();
  const { t } = useI18n({ useScope: "global" });

  // Stores
  const settingsStore = useSettingsStore();

  // Study from route (:study)
  const currentStudyKeyRef = computed(function () {
    const s = normParamStr(route.params.study);
    return s || "jvideo";
  });

  // Resolve lesson/HL/JF/sectionKey via route → store → defaults
  const {
    lesson: lessonNumberRef,
    languageCodeHL: languageCodeHLRef,
    languageCodeJF: languageCodeJFRef,
    sectionKey: sectionKeyRef,
  } = useVideoParams({
    studyKey: currentStudyKeyRef,
    defaults: { lesson: 1, languageCodeHL: "eng00", languageCodeJF: "529" },
    syncToRoute: true,
  });

  // Common content

  const variantRef = computed(() => settingsStore.variantForCurrentStudy);

  const {
    commonContent: commonContentRef,
    topics: topicsRef,
    loadCommonContent,
  } = useCommonContent(currentStudyKeyRef, variantRef, languageCodeHLRef);

  // Explicit loading/error for content
  const contentLoadingRef = ref(false);
  const contentErrorRef = ref(null);

  async function reloadCommonContent() {
    contentLoadingRef.value = true;
    contentErrorRef.value = null;
    try {
      await loadCommonContent();
    } catch (e) {
      const msg =
        e && e.message ? String(e.message) : e != null ? String(e) : "Error";
      contentErrorRef.value = msg;
    } finally {
      contentLoadingRef.value = false;
    }
  }

  // Study title
  const studyTitleRef = computed(function () {
    const cc = commonContentRef.value;
    const studyBlock = cc && typeof cc === "object" ? cc.study : null;
    const raw =
      studyBlock && studyBlock.title != null ? String(studyBlock.title) : "";
    return raw.trim();
  });

  // Intro paragraphs (array | object | string → array<string>)
  const introParagraphsRef = computed(function () {
    const cc = commonContentRef.value;
    const studyBlock = cc && typeof cc === "object" ? cc.study : null;
    const para = studyBlock ? studyBlock.para : null;

    if (Array.isArray(para)) {
      const out = [];
      for (let i = 0; i < para.length; i++) {
        const s = String(para[i] == null ? "" : para[i]).trim();
        if (s) out.push(s);
      }
      return out;
    }
    if (para && typeof para === "object") {
      const keys = Object.keys(para).sort(function (a, b) {
        return Number(a) - Number(b);
      });
      const out = [];
      for (let j = 0; j < keys.length; j++) {
        const k = keys[j];
        const s = String(para[k] == null ? "" : para[k]).trim();
        if (s) out.push(s);
      }
      return out;
    }
    if (typeof para === "string") {
      const s = para.trim();
      return s ? [s] : [];
    }
    return [];
  });

  // Optional i18n fallback per-lesson topic
  const topicTitleRef = computed(function () {
    const n = Number(lessonNumberRef.value);
    if (!Number.isFinite(n) || n < 1) return "";
    const key = "commonContent.topic." + String(n);
    const val = t(key);
    return val === key ? "" : String(val).trim();
  });

  // Heading: prefer study title, fall back to topic title
  const headingRef = computed(function () {
    return studyTitleRef.value || topicTitleRef.value || "";
  });

  // Video spec from content
  const videoSpecRef = computed(function () {
    const cc = commonContentRef.value;
    if (!isObj(cc)) return {};
    const v = cc.video;
    return isObj(v) ? v : {};
  });

  // Build a single playable source
  const {
    source: videoSourceRef,
    loading: videoSourceLoadingRef,
    error: videoSourceErrorRef,
  } = useVideoSourceFromSpec({
    videoSpec: videoSpecRef,
    study: currentStudyKeyRef,
    lesson: lessonNumberRef,
    languageCodeJF: languageCodeJFRef,
    languageCodeHL: languageCodeHLRef,
  });

  // Progress tracking
  const {
    completedLessons: completedLessonsRef,
    isLessonCompleted,
    markLessonComplete,
    loadProgress,
    loading: progressLoadingRef,
    error: progressErrorRef,
  } = useProgressTracker(currentStudyKeyRef);

  // UI gates
  const showLanguageSelectRef = computed(function () {
    const spec = videoSpecRef.value;
    return !!(spec && spec.multiLanguage);
  });
  const showSeriesPassageRef = computed(function () {
    const spec = videoSpecRef.value;
    const n = spec && spec.segments != null ? Number(spec.segments) : NaN;
    return Number.isFinite(n) && n > 1;
  });

  // Keep commonContent fresh when study or HL changes
  watch([currentStudyKeyRef, languageCodeHLRef], function () {
    reloadCommonContent();
  });

  // Initial loads (defensive, never block forever)
  onMounted(async function () {
    function settledFrom(fn) {
      try {
        const p = fn();
        return Promise.resolve(p).catch(function () {});
      } catch (_) {
        return Promise.resolve();
      }
    }

    const contentLoadPromise = settledFrom(reloadCommonContent);
    const progressLoadPromise = settledFrom(loadProgress);

    const bootstrapTimeoutMs = 5000;
    const bootstrapTimeoutPromise = new Promise(function (resolve) {
      setTimeout(resolve, bootstrapTimeoutMs);
    });

    await Promise.race([
      Promise.allSettled([contentLoadPromise, progressLoadPromise]),
      bootstrapTimeoutPromise,
    ]);
  });

  // Update lesson and sync URL; avoid pushing identical location
  function updateLesson(nextLessonNumber) {
    const studyKey = currentStudyKeyRef.value || "jvideo";
    const lessonNumber = Number(nextLessonNumber) || 1;

    const currentParams = {
      study: String(route.params.study || ""),
      lesson: String(route.params.lesson || ""),
      languageCodeHL: String(route.params.languageCodeHL || ""),
      languageCodeJF: String(route.params.languageCodeJF || ""),
    };
    const nextParams = {
      study: studyKey,
      lesson: String(lessonNumber),
      languageCodeHL: languageCodeHLRef.value,
      languageCodeJF: languageCodeJFRef.value || undefined,
    };

    const noChange =
      currentParams.study === nextParams.study &&
      currentParams.lesson === nextParams.lesson &&
      currentParams.languageCodeHL === nextParams.languageCodeHL &&
      (currentParams.languageCodeJF || undefined) ===
        (nextParams.languageCodeJF || undefined);
    if (noChange) return;

    settingsStore.setLessonNumber(studyKey, lessonNumber);

    router
      .push({
        name: "VideoMaster",
        params: nextParams,
        query: route.query,
        hash: route.hash,
      })
      .catch(function () {});
  }

  // Unified page state
  const unifiedLoadingRef = computed(function () {
    const srcLoad = videoSourceLoadingRef && videoSourceLoadingRef.value;
    const progLoad = progressLoadingRef && progressLoadingRef.value;
    return contentLoadingRef.value || !!srcLoad || !!progLoad;
  });

  function readErrorValue(maybeRef) {
    try {
      if (!maybeRef || typeof maybeRef !== "object") return null;
      const v = maybeRef.value;
      return v == null || v === "" ? null : String(v);
    } catch (_) {
      return null;
    }
  }

  const unifiedErrorRef = computed(function () {
    return (
      readErrorValue(contentErrorRef) ||
      readErrorValue(progressErrorRef) ||
      readErrorValue(videoSourceErrorRef) ||
      null
    );
  });

  function hasPlayableSourceValue(s) {
    if (!s) return false;
    if (typeof s === "string") {
      return s.trim().length > 0;
    }
    if (s && typeof s === "object") {
      const candidate1 = s.src != null ? String(s.src).trim() : "";
      const candidate2 = s.url != null ? String(s.url).trim() : "";
      return candidate1.length > 0 || candidate2.length > 0;
    }
    return false;
  }

  const unifiedReadyRef = computed(function () {
    const hasSrc =
      videoSourceRef && hasPlayableSourceValue(videoSourceRef.value);
    const srcLoad = videoSourceLoadingRef && videoSourceLoadingRef.value;
    const progLoad = progressLoadingRef && progressLoadingRef.value;
    return !!hasSrc && !(contentLoadingRef.value || srcLoad || progLoad);
  });

  return {
    // content
    heading: headingRef,
    paras: introParagraphsRef,
    topics: topicsRef,

    // params
    lesson: lessonNumberRef,
    languageCodeHL: languageCodeHLRef,
    languageCodeJF: languageCodeJFRef,
    sectionKey: sectionKeyRef,

    // video
    videoSpec: videoSpecRef,
    showLanguageSelect: showLanguageSelectRef,
    showSeriesPassage: showSeriesPassageRef,
    source: videoSourceRef,

    // progress
    completedLessons: completedLessonsRef,
    isLessonCompleted,
    markLessonComplete,

    // actions
    updateLesson,
    commonContent: commonContentRef,

    // loaders (exposed if page wants to await)
    loadCommonContent: reloadCommonContent,
    loadProgress,

    // unified page state
    loading: unifiedLoadingRef,
    error: unifiedErrorRef,
    ready: unifiedReadyRef,
  };
}
