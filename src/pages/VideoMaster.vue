<script setup>
import { computed, ref, watch } from "vue";
import { useSafeI18n } from "src/composables/useSafeI18n";
import { useVideoMasterVM } from "src/composables/useVideoMasterVM";
import VideoPlayer from "src/components/Video/VideoPlayer.vue";
import SeriesPassageSelect from "src/components/Series/SeriesPassageSelect.vue";
import VideoQuestions from "src/components/Video/VideoQuestions.vue";
import { useApplyRouteToSettings } from "src/composables/useApplyRouteToSettings";
import { useSettingsStore } from "src/stores/SettingsStore";
import VideoLanguageOptions from "src/components/Language/VideoLanguageOptions.vue";
import { languageLabel } from "src/utils/languageLabel";

function isObjectLike(v) {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

function toNonEmptyString(v) {
  const s = String(v == null ? "" : v).trim();
  return s;
}
const showVideoLangPanel = ref(false);
function toggleVideoLanguageSelect() {
  showVideoLangPanel.value = !showVideoLangPanel.value;
}

const settingsStore = useSettingsStore();
useApplyRouteToSettings(settingsStore);

const {
  heading,
  paras,
  topics,

  lesson,
  languageCodeHL,
  languageCodeJF,
  sectionKey,

  showLanguageSelect,
  showSeriesPassage,
  source,

  completedLessons,
  isLessonCompleted,
  markLessonComplete,

  updateLesson,
  commonContent,
} = useVideoMasterVM();

/* ---------- Derived, safe display refs ---------- */

const safeHeadingRef = computed(function () {
  return toNonEmptyString(heading.value);
});

const safeParasRef = computed(function () {
  return Array.isArray(paras.value) ? paras.value : [];
});

const safeLanguageCodeHLRef = computed(function () {
  return toNonEmptyString(languageCodeHL.value) || "eng00";
});

const safeLanguageCodeJFRef = computed(function () {
  return toNonEmptyString(languageCodeJF.value) || "529";
});

// for interface:
const { safeT, i18nReady } = useSafeI18n();

/* Topic select fallback:
   Build [{ label, value }] where value maps to lesson numbers.
   Priority: topic.lesson || topic.id || topic.code || index+1
*/
const topicSelectOptionsRef = computed(function () {
  const src = Array.isArray(topics.value) ? topics.value : [];
  const out = [];
  for (let i = 0; i < src.length; i++) {
    const t = src[i];
    if (typeof t === "string") {
      const label = toNonEmptyString(t) || "Topic " + String(i + 1);
      out.push({ label: label, value: i + 1 });
      continue;
    }
    if (isObjectLike(t)) {
      const rawTitle =
        (t && t.title != null ? String(t.title) : "") ||
        (t && t.name != null ? String(t.name) : "") ||
        (t && t.label != null ? String(t.label) : "");
      const label = toNonEmptyString(rawTitle) || "Topic " + String(i + 1);

      const rawVal =
        (t && t.lesson != null ? Number(t.lesson) : NaN) ||
        (t && t.id != null ? Number(t.id) : NaN);
      let value = Number.isFinite(rawVal) ? rawVal : i + 1;

      // Allow codes/slugs as a last resort (not preferred for lessons)
      if (!Number.isFinite(value)) value = i + 1;

      out.push({ label: label, value: value });
      continue;
    }
    out.push({ label: "Topic " + String(i + 1), value: i + 1 });
  }
  return out;
});

const currentVideoLanguageLabel = computed(() => {
  const start = safeT("interface.currentLanguage", "Current Language");

  const vid = settingsStore.videoLanguageObjectSelected || null;
  const txt = settingsStore.textLanguageObjectSelected || null;

  const hasJF = (obj) =>
    obj && obj.languageCodeJF != null && String(obj.languageCodeJF).trim();

  const chosen = (hasJF(vid) ? vid : null) || (hasJF(txt) ? txt : null);

  const label = languageLabel(chosen); // your util
  return label ? `${start}: ${label}` : start;
});

const currentVideoLanguageLabelx = computed(() => {
  const start = safeT("interface.currentLanguage", "Current Language");

  const vid = settingsStore.videoLanguageObjectSelected || null;
  const txt = settingsStore.textLanguageObjectSelected || null;

  const chosen =
    (vid && String(vid.languageCodeJF || "").trim() ? vid : null) ||
    (txt && String(txt.languageCodeJF || "").trim() ? txt : null);

  const label = languageLabel(chosen, "ethnic-first");
  return label ? `${start}: ${label}` : start;
});

const hasTopicFallbackSelectRef = computed(function () {
  return (
    !showSeriesPassage.value &&
    topicSelectOptionsRef.value &&
    topicSelectOptionsRef.value.length > 1
  );
});

const selectedLessonValueRef = ref(
  Number(lesson.value) && Number(lesson.value) > 0 ? Number(lesson.value) : 1
);

// Keep the fallback select in sync with the route/store lesson
watch(
  lesson,
  function (n) {
    const num = Number(n);
    selectedLessonValueRef.value = Number.isFinite(num) && num > 0 ? num : 1;
  },
  { immediate: true }
);

// When the user picks from the fallback select, update via your handler
function handleSelectLessonChange(nextVal) {
  const num = Number(nextVal);
  if (Number.isFinite(num) && num > 0) {
    updateLesson(num);
  }
}

/* Video source: guard against bad shapes.
   Accept a non-empty string, or an object with a non-empty "url".
*/
const safeVideoSourceRef = computed(function () {
  const s = source.value;
  if (typeof s === "string") {
    const str = toNonEmptyString(s);
    return str ? str : null;
  }
  if (isObjectLike(s)) {
    const src = s && s.src != null ? toNonEmptyString(s.src) : "";
    const url = s && s.url != null ? toNonEmptyString(s.url) : "";
    // If either is present, pass the object through as-is so VideoPlayer can decide
    if (src || url) return s;
  }
  return null;
});

/* Completion helpers: keep defensive wrappers so template stays simple */
function isThisLessonCompleted(n) {
  try {
    return !!isLessonCompleted(n);
  } catch (e) {
    return false;
  }
}

function markThisLessonComplete(n) {
  try {
    markLessonComplete(n);
  } catch (e) {
    /* no-op */
  }
}
</script>

<template>
  <q-page padding>
    <h2 v-if="safeHeadingRef">{{ safeHeadingRef }}</h2>

    <div v-if="safeParasRef.length">
      <p v-for="(p, i) in safeParasRef" :key="'para-' + i">{{ p }}</p>
    </div>

    <div class="current-lang-row q-mb-md">
      <q-btn
        v-if="showLanguageSelect"
        :label="safeT('interface.changeVideoLanguage', 'Change video language')"
        icon="language"
        no-caps
        class="mark-complete-btn"
        @click="toggleVideoLanguageSelect()"
      />

      <div
        v-if="currentVideoLanguageLabel"
        class="current-lang-pill"
        :title="currentVideoLanguageLabel"
      >
        <span class="current-lang-text">{{ currentVideoLanguageLabel }}</span>
      </div>
    </div>

    <!-- Right-side panel (same styling approach as text picker) -->
    <q-drawer
      v-model="showVideoLangPanel"
      side="right"
      bordered
      overlay
      :width="360"
    >
      <div class="q-pa-md">
        <div class="h2">
          {{ safeT("interface.videoLanguage", "Video language") }}
        </div>

        <VideoLanguageOptions @select="showVideoLangPanel = false" />
      </div>
    </q-drawer>

    <SeriesPassageSelect
      v-if="showSeriesPassage"
      :study="$route.params.study"
      :topics="topics"
      :lesson="lesson"
      :completedLessons="completedLessons"
      :isLessonCompleted="isLessonCompleted"
      :markLessonComplete="markLessonComplete"
      class="q-mb-md"
      @updateLesson="updateLesson"
    />

    <div v-else-if="hasTopicFallbackSelectRef" class="q-mb-md">
      <q-select
        v-model="selectedLessonValueRef"
        :options="topicSelectOptionsRef"
        option-label="label"
        option-value="value"
        emit-value
        map-options
        outlined
        dense
        label="Select a topic"
        @update:model-value="handleSelectLessonChange"
      />
    </div>

    <div v-if="safeVideoSourceRef">
      <VideoPlayer :source="safeVideoSourceRef" />
    </div>
    <q-banner v-else inline-actions class="bg-warning text-black q-mb-md">
      {{ safeT("interface.videoLoading", "Video Loading.") }}
    </q-banner>

    <VideoQuestions
      v-if="commonContent"
      :commonContent="commonContent"
      :languageCodeHL="languageCodeHL"
      :lesson="lesson"
      sectionKey="response"
      class="q-mt-md"
    />

    <q-btn
      :label="
        isThisLessonCompleted(lesson)
          ? safeT('interface.completed', 'Completed')
          : safeT('interface.notCompleted', 'Mark Completed')
      "
      :disable="isThisLessonCompleted(lesson)"
      class="mark-complete-btn q-mt-md"
      @click="markThisLessonComplete(lesson)"
    />
  </q-page>
</template>

<style scoped>
.q-page {
  background-color: white;
}

.current-lang-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.current-lang-pill {
  display: inline-flex;
  align-items: center;

  padding: 0.25rem 0.65rem;
  border-radius: 999px;

  background: rgba(0, 0, 0, 0.06);
  border: 1px solid rgba(0, 0, 0, 0.12);

  max-width: 100%;
}

.current-lang-text {
  display: inline-block;

  font-size: 0.95rem;
  font-weight: 600;
  line-height: 1.2;

  max-width: 60ch; /* tune as needed */
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

@media (max-width: 420px) {
  .current-lang-row {
    align-items: flex-start;
  }
  .current-lang-text {
    max-width: 34ch;
  }
}
</style>
