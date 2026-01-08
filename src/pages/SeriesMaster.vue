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

import { getActivePinia } from "pinia";
console.log("[SeriesMaster] activePinia =", getActivePinia());
const settingsStore = useSettingsStore();

try {
  useApplyRouteToSettings(settingsStore);
} catch (e) {
  console.error("[SeriesMaster] useApplyRouteToSettings failed", e);
  throw e;
}

const { textLanguageObjectSelected, videoLanguageSelected, variantForStudy } =
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

// ✅ TEXT language (HL) — reactive
const computedLanguageHL = computed(() => {
  var obj = textLanguageObjectSelected.value;
  return obj && obj.languageCodeHL ? String(obj.languageCodeHL) : "eng00";
});

// ✅ VIDEO language (JF) — reactive
const computedLanguageJF = computed(() => {
  var jf = videoLanguageSelected.value;
  return jf != null && String(jf).trim().length > 0 ? String(jf).trim() : "";
});

// ✅ Variant — simplest form: just use the getter
const computedVariant = computed(() => {
  var v = settingsStore.variantForCurrentStudy; // getter value
  v = v == null ? "" : String(v).trim();
  return v ? v : "default";
});

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

const showLanguageSelect = true;

const openLanguageSelect = inject("openLanguageSelect", null);

function onChangeLanguageClick() {
  if (typeof openLanguageSelect === "function") {
    openLanguageSelect();
    return;
  }

  console.warn("[SeriesMaster] No language UI handler provided");
}

const { getSection, loadSiteContent } = useSiteContent();

const section = computed(() => {
  // These lines create reactive dependencies (no-op reads)
  void computedLanguageHL.value;
  console.log("[SeriesMaster] computing section");
  const temp = getSection(computedStudy.value);
  console.log("[SeriesMaster]", temp);
  return temp;
});

console.log(section);
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
    console.log("[SeriesMaster] about to loadCommonContent");
    loadCommonContent();
    if (typeof loadSiteContent === "function") {
      console.log("[SeriesMaster] about to loadSiteContent");
      loadSiteContent(computedLanguageHL.value);
    }
    if (import.meta.env.DEV) {
      patchRouterForLogs(router);
    }
  } catch (err) {
    console.error("❌ Could not load common content", err);
  }
});
// update SiteContent when language changes
watch(
  computedLanguageHL,
  (n, o) => {
    console.log("[SeriesMaster] HL changed:", o, "→", n);
    loadSiteContent(n);
  },
  { immediate: true }
);
// update CommonContent when language, study or variant change
watch(
  [computedStudy, computedVariant, computedLanguageHL],
  ([study, variant, hl], [oldStudy, oldVariant, oldHl]) => {
    console.log(
      "[SeriesMaster] common inputs changed:",
      { oldStudy, oldVariant, oldHl },
      "→",
      { study, variant, hl }
    );
    loadCommonContent();
  },
  { immediate: true }
);

function updateLesson(nextLessonNumber) {
  settingsStore.setLessonNumber(computedStudy.value, nextLessonNumber);
}

watch(computedLanguageHL, (next, prev) => {
  const selected = textLanguageObjectSelected.value || null;
  const selectedHL =
    selected && selected.languageCodeHL ? String(selected.languageCodeHL) : "";

  console.log(
    "[SeriesMaster] HL changed:",
    prev,
    "→",
    next,
    "| selected:",
    selectedHL
  );
});

watch(section, (v) =>
  console.log("[SeriesMaster] section changed →", v && v.title, v)
);
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
