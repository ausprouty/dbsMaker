<script setup>
import { computed, onMounted, watch, inject } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { storeToRefs } from "pinia";

import { useSettingsStore } from "src/stores/SettingsStore";
import { DEFAULTS } from "src/constants/Defaults";
import { patchRouterForLogs } from "src/debug/patchRouterForLogs";

import { useCommonContent } from "src/composables/useCommonContent";
import { useSiteContent } from "src/composables/useSiteContent";

import { useProgressTracker } from "src/composables/useProgressTracker.js";
import { useInitializeSettingsStore } from "src/composables/useInitializeSettingsStore.js";

import SeriesPassageSelect from "src/components/Series/SeriesPassageSelect.vue";
import SeriesLessonFramework from "src/components/Series/SeriesLessonFramework.vue";

const route = useRoute();
const router = useRouter();

const { t, tm, locale } = useI18n({ useScope: "global" });

const settingsStore = useSettingsStore();
useInitializeSettingsStore(route, settingsStore);

console.log("[SeriesMaster] interface locale on mount:", locale.value);

const { languageCodeHLSelected, languageCodeJFSelected } =
  storeToRefs(settingsStore);

console.log(
  "[SeriesMaster] settings HL on mount:",
  languageCodeHLSelected.value
);

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

const computedLanguageHL = languageCodeHLSelected;
const computedLanguageJF = languageCodeJFSelected;

// Optional variant (?variant=wsu). Accept "variant" or "varient".
const computedVariant = computed(() => {
  const q = route.query;
  const v = q && (q.variant != null ? q.variant : q.varient);
  const raw = Array.isArray(v) ? v[0] : v;
  if (typeof raw !== "string") return null;
  const lower = raw.trim().toLowerCase();
  const clean = lower.replace(/[^a-z0-9-]/g, "");
  return clean || null;
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
  computedVariant
);

const {
  completedLessons,
  isLessonCompleted,
  markLessonComplete,
  loadProgress,
} = useProgressTracker(computedStudy);

// ---- UI: Language selector / drawer toggle ----

// --- UI: Language selector button ---
const showLanguageSelect = true;

// Layout provides ONE function: openLanguageSelect()
const openLanguageSelect = inject("openLanguageSelect", null);

function onChangeLanguageClick() {
  if (typeof openLanguageSelect === "function") {
    openLanguageSelect();
    return;
  }

  console.warn("[SeriesMaster] No language UI handler provided");
}

// useSiteContent is the single source of truth for already-normalized siteContent
// Assume it returns:
//   - siteContent (root object)
//   - indexParas (array of strings)
//   - getSection(key) -> { title, summary, paras }
const { siteContent, indexParas, getSection } = useSiteContent();
console.log("[SeriesMaster]", computedStudy.value);
const section = getSection(computedStudy.value);
console.log("[SeriesMaster]", section);
const pageTitle = section?.title || commonContent?.title || "";
console.log("[SeriesMaster]", pageTitle);
const pageParas = section?.paras || commonContent?.paras || "";
console.log("[SeriesMaster]", pageParas);

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

// Reload when study/languages/variant change
watch(
  [computedLanguageHL, computedLanguageJF, computedStudy, computedVariant],
  () => {
    loadCommonContent();
  }
);

// Log locale changes
watch(locale, (newVal, oldVal) => {
  console.log("[SeriesMaster] interface locale changed:", oldVal, "→", newVal);
});

// Child -> parent lesson change
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
