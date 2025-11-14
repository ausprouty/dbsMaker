<script setup>
import { inject, computed, ref, watch } from "vue";
import { useVideoMasterVM } from "src/composables/useVideoMasterVM";
import VideoPlayer from "src/components/Video/VideoPlayer.vue";
import SeriesPassageSelect from "src/components/Series/SeriesPassageSelect.vue";
import VideoQuestions from "src/components/Video/VideoQuestions.vue";

function isObjectLike(v) {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

function toNonEmptyString(v) {
  const s = String(v == null ? "" : v).trim();
  return s;
}

const toggleRightDrawer = inject("toggleRightDrawer", function () {});

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

    <q-btn
      v-if="showLanguageSelect"
      :label="$t('interface.changeLanguage')"
      icon="language"
      no-caps
      class="mark-complete-btn q-mb-md"
      @click="toggleRightDrawer()"
    />

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
      {{ $t("interface.videoUnavailable") || "Video is not available." }}
    </q-banner>

    <VideoQuestions
      v-if="sectionKey && lesson"
      :commonContent="commonContent"
      :languageCodeHL="languageCodeHL"
      :lesson="lesson"
      :sectionKey="sectionKey"
      class="q-mt-md"
    />

    <q-btn
      :label="
        isThisLessonCompleted(lesson)
          ? $t('interface.completed')
          : $t('interface.notCompleted')
      "
      :disable="isThisLessonCompleted(lesson)"
      class="mark-complete-btn q-mt-md"
      @click="markThisLessonComplete(lesson)"
    />
  </q-page>
</template>

<style>
.q-page {
  background-color: white;
}
</style>
