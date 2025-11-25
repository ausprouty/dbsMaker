<script setup>
import { computed, onMounted, watch, unref, inject } from "vue";
import { useRoute } from "vue-router";
import { useRouter } from "vue-router";

import { useI18n } from "vue-i18n";
import { useSettingsStore } from "src/stores/SettingsStore";

import { DEFAULTS } from "src/constants/Defaults";
import { storeToRefs } from "pinia";
import { patchRouterForLogs } from "src/debug/patchRouterForLogs";

import { useCommonContent } from "src/composables/useCommonContent";
import { useProgressTracker } from "src/composables/useProgressTracker.js";
import { useInitializeSettingsStore } from "src/composables/useInitializeSettingsStore.js";
import SeriesPassageSelect from "src/components/Series/SeriesPassageSelect.vue";
//import SeriesSegmentNavigator from "src/components/series/xSeriesSegmentNavigator.vue";
import SeriesLessonFramework from "src/components/Series/SeriesLessonFramework.vue";

const route = useRoute();
const router = useRouter();
const { t } = useI18n({ useScope: "global" });
const settingsStore = useSettingsStore();

useInitializeSettingsStore(route, settingsStore);

const computedStudy = computed(function () {
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

const { languageCodeHLSelected, languageCodeJFSelected } =
  storeToRefs(settingsStore);
const computedLanguageHL = languageCodeHLSelected;
const computedLanguageJF = languageCodeJFSelected;

// Optional variant (?variant=wsu). Accept "variant" or misspelled "varient".
const computedVariant = computed(function () {
  const q = route.query;
  const v = q && (q.variant != null ? q.variant : q.varient);
  const raw = Array.isArray(v) ? v[0] : v;
  if (typeof raw !== "string") return null;
  const lower = raw.trim().toLowerCase();
  const clean = lower.replace(/[^a-z0-9-]/g, "");
  return clean || null;
});

console.log(unref(computedStudy), unref(computedLanguageHL));

// ---- Lesson content readiness ----

const { commonContent, topics, loadCommonContent } = useCommonContent(
  computedStudy,
  computedLanguageHL,
  computedVariant
);

const {
  completedLessons,
  isLessonCompleted,
  markLessonComplete,
  loadProgress,
} = useProgressTracker(computedStudy);

// ---- UI: Language selector button  drawer toggle ----
// Prefer a store flag; fall back to DEFAULTS; else default true
const showLanguageSelect = computed(() => {
  const v = settingsStore.showLanguageSelect;
  if (typeof v === "boolean") return v;
  if (DEFAULTS && typeof DEFAULTS.showLanguageSelect === "boolean") {
    return DEFAULTS.showLanguageSelect;
  }
  return true;
});

// Try to get a toggler from the layout via provide/inject.
// Support either `toggleRightDrawer` or older `handleLanguageSelect`.
const providedToggleRightDrawer = inject("toggleRightDrawer", null);
const handleLanguageSelect = inject("handleLanguageSelect", null);
const toggleRightDrawer =
  providedToggleRightDrawer ??
  (handleLanguageSelect
    ? () => handleLanguageSelect()
    : () => {
        // last-ditch: try store API if you have one, otherwise no-op
        if (typeof settingsStore.setRightDrawerOpen === "function") {
          settingsStore.setRightDrawerOpen(true);
        } else {
          console.warn("[SeriesMaster] No drawer toggler provided");
        }
      });

onMounted(function () {
  try {
    loadProgress();
    loadCommonContent();
    if (import.meta.env.DEV) patchRouterForLogs(router);
  } catch (err) {
    console.error("❌ Could not load common content", err);
  }
});

// Reload when study/languages/variant change
watch(
  [computedLanguageHL, computedLanguageJF, computedStudy, computedVariant],
  function () {
    loadCommonContent();
  }
);

// Child -> parent lesson change
function updateLesson(nextLessonNumber) {
  settingsStore.setLessonNumber(computedStudy.value, nextLessonNumber);
}
</script>

<template>
  <template v-if="commonContent">
    <q-page padding>
      <h1 class="dbs">{{ t(`${computedStudy}.title`) }}</h1>

      <p v-for="(para, index) in $tm(`${computedStudy}.para`)" :key="index">
        {{ para }}
      </p>

      <q-btn
        v-if="showLanguageSelect"
        :label="$t('interface.changeLanguage')"
        icon="language"
        no-caps
        class="mark-complete-btn q-mb-md"
        @click="toggleRightDrawer()"
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
          computedVariant || ''
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
