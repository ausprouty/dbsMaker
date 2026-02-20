<script>
import { computed, inject, onMounted, ref, watch } from "vue";
import { useRoute } from "vue-router";
import { storeToRefs } from "pinia";
import { useI18n } from "vue-i18n";

import { useSettingsStore } from "src/stores/SettingsStore";
import { useProgressTracker } from "src/composables/useProgressTracker.js";
import { useApplyRouteToSettings } from "src/composables/useApplyRouteToSettings";
import { useSafeI18n } from "src/composables/useSafeI18n";

import SeriesPassageSelect from "src/components/Series/SeriesPassageSelect.vue";
import PrebuiltLessonFramework from "src/components/Series/PrebuiltLessonFramework.vue";

export default {
  name: "PrebuiltSeriesMaster",
  components: {
    SeriesPassageSelect,
    PrebuiltLessonFramework,
  },

  setup() {
    const route = useRoute();

    useI18n({ useScope: "global" });
    const { safeT } = useSafeI18n();

    const settingsStore = useSettingsStore();
    useApplyRouteToSettings(settingsStore);

    const { textLanguageObjectSelected, videoLanguageObjectSelected } =
      storeToRefs(settingsStore);

    const openLanguageSelect = inject("openLanguageSelect", null);

    const seriesCode = computed(() => {
      const p =
        route.params && route.params.seriesCode
          ? String(route.params.seriesCode)
          : "";

      if (p) return p;

      const path = route.path || "";
      const parts = path.split("/").filter(Boolean);
      const i = parts.indexOf("jsonSeries");

      if (i >= 0 && parts[i + 1]) {
        return String(parts[i + 1]);
      }

      return "paw";
    });

    const computedStudy = computed(() => {
      return settingsStore.currentStudySelected || "dbs";
    });

    const computedLessonNumber = computed(() => {
      if (typeof settingsStore.lessonNumberForStudy === "function") {
        return settingsStore.lessonNumberForStudy(computedStudy.value);
      }

      return typeof settingsStore.lessonNumber === "number"
        ? settingsStore.lessonNumber
        : 1;
    });

    const computedLanguageHL = computed(() => {
      var obj = textLanguageObjectSelected.value;
      return obj && obj.languageCodeHL ? String(obj.languageCodeHL) : "eng00";
    });

    const computedLanguageJF = computed(() => {
      var obj = videoLanguageObjectSelected.value;
      return obj && obj.languageCodeJF ? String(obj.languageCodeJF) : "529";
    });

    const computedVariant = computed(() => {
      var v = settingsStore.variantForCurrentStudy;
      v = v == null ? "" : String(v).trim();
      return v ? v : "default";
    });

    const lessonKey = computed(() => {
      return [
        "jsonSeries",
        seriesCode.value,
        computedLanguageHL.value,
        computedLanguageJF.value,
        computedStudy.value,
        computedVariant.value,
        computedLessonNumber.value,
      ].join("|");
    });

    const {
      completedLessons,
      isLessonCompleted,
      markLessonComplete,
      loadProgress,
    } = useProgressTracker(computedStudy);

    const commonContent = ref(null);
    const commonLoading = ref(false);
    const commonError = ref("");

    const http = inject("http", null);

    function buildCommonContentUrl() {
      const hl = computedLanguageHL.value;
      const subject = seriesCode.value;
      const variant = computedVariant.value;

      const qs = "variant=" + encodeURIComponent(variant);

      return "/v2/commonContent/" + hl + "/" + subject + "?" + qs;
    }

    async function loadCommonContent() {
      commonLoading.value = true;
      commonError.value = "";

      try {
        const url = buildCommonContentUrl();

        console.log("[JsonSeriesMaster] loading commonContent:", url);

        if (!http || typeof http.get !== "function") {
          throw new Error(
            "No http client injected. Provide inject('http') with get()."
          );
        }

        const res = await http.get(url);
        const data = res && res.data ? res.data : res;

        commonContent.value = data;

        console.log("[JsonSeriesMaster] commonContent loaded:", data);
      } catch (e) {
        console.error("[JsonSeriesMaster] commonContent load failed:", e);
        commonError.value = e && e.message ? String(e.message) : "Load failed";
        commonContent.value = null;
      } finally {
        commonLoading.value = false;
      }
    }

    const topicsForSelect = computed(() => {
      const cc = commonContent.value;
      const topicObj = cc && cc.topic ? cc.topic : null;

      if (!topicObj) return [];

      const keys = Object.keys(topicObj).sort((a, b) => {
        return Number(a) - Number(b);
      });

      const arr = [""];

      keys.forEach((k) => {
        arr.push(String(topicObj[k]));
      });

      return arr;
    });

    const introLines = computed(() => {
      const cc = commonContent.value;
      const study = cc && cc.study ? cc.study : null;
      const para = study && study.para ? study.para : null;

      if (!para) return [];

      const keys = Object.keys(para).sort((a, b) => {
        return Number(a) - Number(b);
      });

      return keys.map((k) => String(para[k]));
    });

    const showLanguageSelect = true;

    function onChangeLanguageClick() {
      if (typeof openLanguageSelect === "function") {
        openLanguageSelect();
        return;
      }
      console.warn("[JsonSeriesMaster] No language UI handler provided");
    }

    function updateLesson(nextLessonNumber) {
      settingsStore.setLessonNumber(computedStudy.value, nextLessonNumber);
    }

    onMounted(() => {
      loadProgress();
      loadCommonContent();
    });

    watch(computedLanguageHL, (next, prev) => {
      console.log("[JsonSeriesMaster] HL changed:", prev, "→", next);
      loadCommonContent();
    });

    watch(
      () => seriesCode.value,
      (next, prev) => {
        console.log("[JsonSeriesMaster] seriesCode changed:", prev, "→", next);
        loadCommonContent();
      }
    );

    watch(
      () => computedVariant.value,
      (next, prev) => {
        console.log("[JsonSeriesMaster] variant changed:", prev, "→", next);
        loadCommonContent();
      }
    );

    watch(
      () => computedLessonNumber.value,
      (next, prev) => {
        console.log("[JsonSeriesMaster] lesson changed:", prev, "→", next);
      }
    );

    return {
      safeT,
      seriesCode,
      computedStudy,
      computedLessonNumber,
      computedLanguageHL,
      computedLanguageJF,
      computedVariant,
      lessonKey,

      completedLessons,
      isLessonCompleted,
      markLessonComplete,
      loadProgress,

      showLanguageSelect,
      onChangeLanguageClick,
      updateLesson,

      commonContent,
      commonLoading,
      commonError,

      topicsForSelect,
      introLines,
    };
  },
};
</script>

<template>
  <q-page padding>
    <q-btn
      v-if="showLanguageSelect"
      :label="safeT('interface.changeTextLanguage', 'Change text language')"
      icon="language"
      no-caps
      class="mark-complete-btn q-mb-md"
      @click="onChangeLanguageClick"
    />

    <div v-if="commonLoading" class="q-mb-md">
      {{ safeT("interface.loading", "Loading…") }}
    </div>

    <div v-else-if="commonError" class="q-mb-md text-negative">
      {{ safeT("interface.error", "Error") }}: {{ commonError }}
    </div>

    <div v-else class="q-mb-md">
      <div v-for="(line, idx) in introLines" :key="idx" class="q-mb-sm">
        {{ line }}
      </div>
    </div>

    <SeriesPassageSelect
      :study="computedStudy"
      :topics="topicsForSelect"
      :lesson="computedLessonNumber"
      :markLessonComplete="markLessonComplete"
      :isLessonCompleted="isLessonCompleted"
      :completedLessons="completedLessons"
      @updateLesson="updateLesson"
      class="q-mb-md"
    />

    <hr />

    <JsonLessonFramework
      :key="lessonKey"
      :seriesCode="seriesCode"
      :lesson="computedLessonNumber"
      :languageCodeHL="computedLanguageHL"
      :commonContent="commonContent"
    />

    <q-btn
      :label="
        isLessonCompleted(computedLessonNumber)
          ? safeT('interface.completed', 'Completed')
          : safeT('interface.notCompleted', 'Mark Complete')
      "
      :disable="isLessonCompleted(computedLessonNumber)"
      class="mark-complete-btn q-mt-md"
      @click="markLessonComplete(computedLessonNumber)"
    />
  </q-page>
</template>
