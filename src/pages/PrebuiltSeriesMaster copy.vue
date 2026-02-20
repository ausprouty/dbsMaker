<script setup>
import { computed, onMounted, watch, inject } from "vue";
import { useRoute, useRouter } from "vue-router";
import { storeToRefs } from "pinia";
import { useI18n } from "vue-i18n";

import { useSettingsStore } from "src/stores/SettingsStore";
import { useProgressTracker } from "src/composables/useProgressTracker.js";
import { useApplyRouteToSettings } from "src/composables/useApplyRouteToSettings";
import { useSafeI18n } from "src/composables/useSafeI18n";

import SeriesPassageSelect from "src/components/Series/SeriesPassageSelect.vue";
import JsonLessonFramework from "src/components/Series/PrebuiltLessonFramework.vue";

const route = useRoute();
const router = useRouter();

useI18n({ useScope: "global" });
const { safeT } = useSafeI18n();

const settingsStore = useSettingsStore();
useApplyRouteToSettings(settingsStore);

const { textLanguageObjectSelected, videoLanguageObjectSelected } =
  storeToRefs(settingsStore);

const seriesCode = computed(() => {
  const p =
    route.params && route.params.seriesCode
      ? String(route.params.seriesCode)
      : "";

  if (p) {
    return p;
  }

  const path = route.path || "";
  const parts = path.split("/").filter(Boolean);
  const i = parts.indexOf("jsonSeries");
  if (i >= 0 && parts[i + 1]) {
    return String(parts[i + 1]);
  }

  return "paw";
});

const computedStudy = computed(
  () => settingsStore.currentStudySelected || "dbs"
);

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

const showLanguageSelect = true;
const openLanguageSelect = inject("openLanguageSelect", null);

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
});

watch(computedLanguageHL, (next, prev) => {
  console.log("[JsonSeriesMaster] HL changed:", prev, "→", next);
});

watch(
  () => seriesCode.value,
  (next, prev) => {
    console.log("[JsonSeriesMaster] seriesCode changed:", prev, "→", next);
  }
);

watch(
  () => computedLessonNumber.value,
  (next, prev) => {
    console.log("[JsonSeriesMaster] lesson changed:", prev, "→", next);
  }
);
</script>

<template>
  <q-page padding>
    <p>I reached this page</p>
    <q-btn
      v-if="showLanguageSelect"
      :label="safeT('interface.changeTextLanguage', 'Change text language')"
      icon="language"
      no-caps
      class="mark-complete-btn q-mb-md"
      @click="onChangeLanguageClick"
    />

    <SeriesPassageSelect
      :study="computedStudy"
      :topics="[]"
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
      :commonContent="null"
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
