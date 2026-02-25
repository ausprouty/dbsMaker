<script setup>
import { computed, inject, onMounted, watch } from "vue";
import { storeToRefs } from "pinia";
import { useI18n } from "vue-i18n";

import { useSettingsStore } from "src/stores/SettingsStore";
import { useProgressTracker } from "src/composables/useProgressTracker.js";
import { useApplyRouteToSettings } from "src/composables/useApplyRouteToSettings";
import { useSafeI18n } from "src/composables/useSafeI18n";
import { useCommonContent } from "src/composables/useCommonContent";
import { buildLessonContentKey } from "src/utils/ContentKeyBuilder";

import SeriesPassageSelect from "src/components/Series/SeriesPassageSelect.vue";
import PrebuiltLessonFramework from "src/components/Series/PrebuiltLessonFramework.vue";

useI18n({ useScope: "global" });
const { safeT } = useSafeI18n();

const settingsStore = useSettingsStore();

try {
  useApplyRouteToSettings(settingsStore);
} catch (e) {
  console.error("[PrebuiltSeriesMaster] useApplyRouteToSettings failed", e);
  throw e;
}

const { textLanguageObjectSelected, videoLanguageObjectSelected } =
  storeToRefs(settingsStore);

const openLanguageSelect = inject("openLanguageSelect", null);

const computedStudy = computed(() => {
  return settingsStore.currentStudySelected || "paw";
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

// ---- Aliases (defensive)
// Some code paths / older template refs may still use languageCodeHL/JF.
// Keeping these aliases prevents "ReferenceError: languageCodeJF is not defined"
// if any lingering reference exists.
const languageCodeHL = computedLanguageHL;
const languageCodeJF = computedLanguageJF;

const computedVariant = computed(() => {
  const raw = settingsStore.variantForCurrentStudy;
  const v = raw == null ? "" : String(raw).trim();
  return v ? v : "default";
});

const lessonKey = computed(() => {
  return (
    buildLessonContentKey(
      computedStudy.value,
      computedLanguageHL.value,
      computedLanguageJF.value,
      computedLessonNumber.value
    ) || "lessonContent-invalid"
  );
});

const {
  commonContent,
  topics,
  loadCommonContent,
  loading: commonLoading,
  error: commonError,
} = useCommonContent(computedStudy, computedVariant, computedLanguageHL);

const {
  completedLessons,
  isLessonCompleted,
  markLessonComplete,
  loadProgress,
} = useProgressTracker(computedStudy);

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
  console.warn("[PrebuiltSeriesMaster] No language UI handler provided");
}

function updateLesson(nextLessonNumber) {
  settingsStore.setLessonNumber(computedStudy.value, nextLessonNumber);
}

onMounted(() => {
  loadProgress();
});

watch(computedLanguageHL, (next, prev) => {
  console.log("[PrebuiltSeriesMaster] HL changed:", prev, "→", next);
  loadCommonContent();
});

watch(
  () => computedStudy.value,
  (next, prev) => {
    console.log("[PrebuiltSeriesMaster] study changed:", prev, "→", next);
    loadCommonContent();
  }
);

watch(
  () => computedVariant.value,
  (next, prev) => {
    console.log("[PrebuiltSeriesMaster] variant changed:", prev, "→", next);
    loadCommonContent();
  }
);

watch(
  () => computedLessonNumber.value,
  (next, prev) => {
    console.log("[PrebuiltSeriesMaster] lesson changed:", prev, "→", next);
  }
);
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
      :topics="topics"
      :lesson="computedLessonNumber"
      :markLessonComplete="markLessonComplete"
      :isLessonCompleted="isLessonCompleted"
      :completedLessons="completedLessons"
      @updateLesson="updateLesson"
      class="q-mb-md"
    />

    <hr />

    <PrebuiltLessonFramework
      :study="computedStudy"
      :lesson="computedLessonNumber"
      :languageCodeHL="languageCodeHL"
      :languageCodeJF="languageCodeJF"
      :commonContent="commonContent"
      :lessonKey="lessonKey"
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
