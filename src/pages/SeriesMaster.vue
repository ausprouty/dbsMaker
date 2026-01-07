<script setup>
import { computed, onMounted, watch, inject } from "vue";
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { storeToRefs } from "pinia";

import { useSettingsStore } from "src/stores/SettingsStore";
import { patchRouterForLogs } from "src/debug/patchRouterForLogs";

import { useCommonContent } from "src/composables/useCommonContent";
import { useSiteContent } from "src/composables/useSiteContent";

import { useProgressTracker } from "src/composables/useProgressTracker.js";
import { useApplyRouteToSettings } from "src/composables/useApplyRouteToSettings";

import SeriesPassageSelect from "src/components/Series/SeriesPassageSelect.vue";
import SeriesLessonFramework from "src/components/Series/SeriesLessonFramework.vue";

const router = useRouter();

const { t, locale } = useI18n({ useScope: "global" });

const settingsStore = useSettingsStore();
useApplyRouteToSettings();

console.log("[SeriesMaster] interface locale on mount:", locale.value);

const { textLanguageObjectSelected, videoSelectedLanguage, variantForStudy } =
  storeToRefs(settingsStore);

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

const computedLanguageHL = textLanguageObjectSelected;
const computedLanguageJF = videoSelectedLanguage;

// variantForStudy is now sourced from SettingsStore (hydrated from the route)
const computedvariantForStudy = computed(() => {
  const v =
    variantForStudy && variantForStudy.value != null
      ? variantForStudy.value
      : null;
  return v ? String(v) : null;
});

console.log(
  "[SeriesMaster] study/langHL:",
  computedStudy.value,
  computedLanguageHL.value
);

// ---- Lesson content readiness ----

const { commonContent, topics, loadCommonContent } = useCommonContent(
  computedStudy,
  computedLanguageHL,
  computedvariantForStudy
);

const {
  completedLessons,
  isLessonCompleted,
  markLessonComplete,
  loadProgress,
} = useProgressTracker(computedStudy);

// ---- UI: Language selector / drawer toggle ----

const showLanguageSelect = true;

const openLanguageSelect = inject("openLanguageSelect", null);

function onChangeLanguageClick() {
  if (typeof openLanguageSelect === "function") {
    openLanguageSelect();
    return;
  }

  console.warn("[SeriesMaster] No language UI handler provided");
}

const { getSection } = useSiteContent();

const section = computed(() => getSection(computedStudy.value));

const pageTitle = computed(() => {
  const s = section.value;
  return (
    (s && s.title) || (commonContent.value && commonContent.value.title) || ""
  );
});

const pageParas = computed(() => {
  const s = section.value;
  return (
    (s && s.paras) || (commonContent.value && commonContent.value.paras) || []
  );
});

onMounted(() => {
  try {
    loadProgress();
    loadCommonContent();
    if (import.meta.env.DEV) {
      patchRouterForLogs(router);
    }
  } catch (err) {
    console.error("❌ Could not load common content", err);
  }
});

watch(
  [
    computedLanguageHL,
    computedLanguageJF,
    computedStudy,
    computedvariantForStudy,
  ],
  () => {
    loadCommonContent();
  }
);

watch(locale, (newVal, oldVal) => {
  console.log("[SeriesMaster] interface locale changed:", oldVal, "→", newVal);
});

function updateLesson(nextLessonNumber) {
  settingsStore.setLessonNumber(computedStudy.value, nextLessonNumber);
}
</script>

<template>
  <template v-if="commonContent">
    <q-page padding>
      <h1 class="dbs">
        {{ pageTitle }}
      </h1>

      <p v-for="(para, i) in pageParas" :key="i">
        {{ para }}
      </p>

      <q-btn
        v-if="showLanguageSelect"
        :label="t('interface.changeLanguage')"
        icon="language"
        no-caps
        class="mark-complete-btn q-mb-md"
        @click="onChangeLanguageClick"
      />

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

      <SeriesLessonFramework
        :key="`${computedStudy}-${
          computedvariantForStudy || ''
        }-${computedLessonNumber}`"
        :languageCodeHL="computedLanguageHL"
        :languageCodeJF="computedLanguageJF"
        :study="computedStudy"
        :lesson="computedLessonNumber"
        :commonContent="commonContent"
      />

      <q-btn
        :label="
          isLessonCompleted(computedLessonNumber)
            ? t('interface.completed')
            : t('interface.notCompleted')
        "
        :disable="isLessonCompleted(computedLessonNumber)"
        class="mark-complete-btn"
        @click="markLessonComplete(computedLessonNumber)"
      />
    </q-page>
  </template>

  <template v-else>
    <q-page padding>
      <div class="text-negative text-h6">Topic Loading.</div>
    </q-page>
  </template>
</template>
