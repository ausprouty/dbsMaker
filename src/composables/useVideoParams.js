// src/composables/useVideoParams.js
import { computed, unref, watch, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useSettingsStore } from "src/stores/SettingsStore";
import { normPositiveInt, normParamStr } from "src/utils/normalize";

/*
  Priority per field:
  1) route params (if present & valid)
  2) store
  3) provided defaults

  Options:
    studyKey: string|ref (required)
    defaults: { lesson, languageCodeHL, languageCodeJF }
    syncToRoute: boolean (default true)
*/
export function useVideoParams(options) {
  const {
    studyKey,
    defaults = { lesson: 1, languageCodeHL: "eng00", languageCodeJF: "529" },
    syncToRoute = true,
  } = options || {};

  const route = useRoute();
  const router = useRouter();
  const settingsStore = useSettingsStore();

  // ---- Unref once & normalise ---------------------------------------------
  const resolvedStudyKey = computed(() => normParamStr(unref(studyKey)));

  // ---- Route candidates -----------------------------------------------------
  const routeLesson = computed(() => normPositiveInt(route.params.lesson));
  const routeHL = computed(() => normParamStr(route.params.languageCodeHL));
  const routeJF = computed(() => normParamStr(route.params.languageCodeJF));

  // ---- Store candidates -----------------------------------------------------
  const storeLesson = computed(() => {
    const fn = settingsStore.lessonNumberForStudy;
    if (typeof fn === "function") {
      const n = Number(fn(resolvedStudyKey.value));
      if (Number.isFinite(n) && n > 0) return n;
    } else {
      const n = Number(settingsStore.lessonNumber);
      if (Number.isFinite(n) && n > 0) return n;
    }
    return undefined;
  });

  const storeHL = computed(() => {
    const s = settingsStore.languageCodeHLSelected;
    return s && String(s).trim() ? String(s).trim() : undefined;
  });

  const storeJF = computed(() => {
    const s = settingsStore.languageCodeJFSelected;
    return s != null ? String(s) : undefined;
  });

  // ---- Resolved values ------------------------------------------------------
  const lesson = computed(
    () => routeLesson.value || storeLesson.value || Number(defaults.lesson || 1)
  );

  const languageCodeHL = computed(
    () => routeHL.value || storeHL.value || String(defaults.languageCodeHL)
  );

  const languageCodeJF = computed(() => {
    const v = routeJF.value || storeJF.value || String(defaults.languageCodeJF);
    return v == null ? "" : String(v);
  });

  const sectionKey = computed(() =>
    lesson.value > 0 ? "video-" + lesson.value : ""
  );

  // ---- Apply to store / router ---------------------------------------------
  // not sure we need this
  function applyToStore() {
    const key = resolvedStudyKey.value;
    settingsStore.setCurrentStudy(key);
    settingsStore.setLessonNumber(key, Number(lesson.value));
    settingsStore.setLanguageCodeHL(languageCodeHL.value);
    settingsStore.setLanguageCodeJF(languageCodeJF.value);
  }

  function applyToRouteIfEnabled() {
    if (!syncToRoute) return;

    const resolvedStudy = String(unref(studyKey));
    const next = {
      study: resolvedStudy,
      lesson: String(lesson.value),
      languageCodeHL: languageCodeHL.value,
      languageCodeJF: languageCodeJF.value || undefined, // drop if empty
    };

    const cur = route.params;
    const changed =
      cur.study !== next.study ||
      cur.lesson !== next.lesson ||
      cur.languageCodeHL !== next.languageCodeHL ||
      cur.languageCodeJF !== next.languageCodeJF;

    if (changed) {
      router
        .replace({
          name: route.name || "VideoMaster",
          params: next,
          query: route.query,
          hash: route.hash,
        })
        .catch(() => {});
    }
  }

  // 1) Route -> Store (when URL changes)
  watch(
    () => [
      route.params.lesson,
      route.params.languageCodeHL,
      route.params.languageCodeJF,
      String(unref(studyKey)),
    ],
    () => {
      applyToStore(); // keep store aligned with the URL
      applyToRouteIfEnabled(); // normalize URL if needed
    },
    { immediate: true }
  );
  // 2) Store -> Route (when user changes dropdowns etc.)
  watch(
    () => {
      const resolvedStudy = String(unref(studyKey));
      // watch the exact per-study lesson cell so reactivity triggers
      const lessonByStudy = (settingsStore.lessonNumber || {})[resolvedStudy];
      return [
        settingsStore.languageCodeHLSelected,
        settingsStore.languageCodeJFSelected,
        lessonByStudy,
        resolvedStudy,
      ];
    },
    () => {
      applyToRouteIfEnabled(); // this is what updates /video/jvideo/2/...
    }
  );

  onMounted(() => {
    applyToStore();
    applyToRouteIfEnabled();
  });

  return {
    lesson,
    languageCodeHL,
    languageCodeJF,
    sectionKey,
    // expose if you want manual re-apply
    // applyToStore,
  };
}
