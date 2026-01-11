// src/composables/useVideoParams.js
import { computed, unref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useSettingsStore } from "src/stores/SettingsStore";

/*
  Store is the source of truth.
  Options:
    studyKey: string|ref (required)
    syncToRoute: boolean (default true)
*/
export function useVideoParams(options) {
  options = options || {};
  var studyKey = options.studyKey;
  var syncToRoute = options.syncToRoute !== false;

  var route = useRoute();
  var router = useRouter();
  var settingsStore = useSettingsStore();

  var resolvedStudyKey = computed(function () {
    return String(
      unref(studyKey) || settingsStore.currentStudySelected || "dbs"
    );
  });

  var lesson = computed(function () {
    var key = resolvedStudyKey.value;
    var fn = settingsStore.lessonNumberForStudy;
    if (typeof fn === "function") {
      var n = Number(fn(key));
      return n > 0 ? n : 1;
    }
    return 1;
  });

  var languageCodeHL = computed(function () {
    var obj = settingsStore.textLanguageObjectSelected;
    var hl = obj && obj.languageCodeHL ? String(obj.languageCodeHL) : "";
    return hl || "eng00";
  });

  var languageCodeJF = computed(function () {
    var v = settingsStore.videoLanguageObjectSelected;
    v = v == null ? "" : String(v).trim();
    if (v) return v;

    // Useful fallback if video language has not been chosen yet
    var obj = settingsStore.textLanguageObjectSelected;
    var jf = obj && obj.languageCodeJF ? String(obj.languageCodeJF) : "";
    return jf || "529";
  });

  var sectionKey = computed(function () {
    return lesson.value > 0 ? "video-" + lesson.value : "";
  });

  function syncRoute() {
    if (!syncToRoute) return;

    // Keep params (study/lesson) but move language to query:
    // ?t=eng00&jf=20615&var=apply
    var name = route.name || "VideoMaster";
    var params = Object.assign({}, route.params);
    params.study = String(resolvedStudyKey.value);
    params.lesson = String(lesson.value);

    var query = Object.assign({}, route.query);
    query.t = languageCodeHL.value;
    query.jf = languageCodeJF.value || undefined;

    // variant stored in settingsStore (null means drop)
    if (settingsStore.variant) query.var = settingsStore.variant;
    else delete query.var;

    router
      .replace({ name: name, params: params, query: query, hash: route.hash })
      .catch(function () {});
  }

  // Only store -> route (URL normalization)
  watch(
    function () {
      return [
        String(resolvedStudyKey.value),
        String(lesson.value),
        String(languageCodeHL.value),
        String(languageCodeJF.value),
        String(settingsStore.variant || ""),
      ];
    },
    function () {
      syncRoute();
    },
    { immediate: true }
  );

  return {
    lesson: lesson,
    languageCodeHL: languageCodeHL,
    languageCodeJF: languageCodeJF,
    sectionKey: sectionKey,
  };
}
