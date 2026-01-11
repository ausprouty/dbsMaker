<script setup>
import { ref, watch, computed } from "vue";
import { useNumeralClass } from "src/composables/useNumeralClass";
import BibleText from "src/components/Bible/BibleTextBar.vue";
import VideoBar from "src/components/Video/VideoBar.vue";
import NoteSection from "src/components/Notes/NoteSection.vue";
import { useContentStore } from "stores/ContentStore";
import { useI18n } from "vue-i18n";
import { useSafeI18n } from "src/composables/useSafeI18n";

const props = defineProps({
  studySection: { type: String, required: true },
  sectionContent: { type: Object, required: true },
  placeholder: { type: String, required: true },
  languageCodeHL: { type: String, required: true },
  languageCodeJF: { type: String, required: true },
  study: { type: String, required: true },
  lesson: { type: Number, required: true },
  timing: { type: String, required: true },
});

const numeralClass = useNumeralClass();
const contentStore = useContentStore();
const { t, getLocaleMessage } = useI18n({ useScope: "global" });
const { safeT, i18nReady } = useSafeI18n();

// reactive state
const lessonContent = ref(null);
const isLessonLoading = ref(false);
const loadError = ref(null);

// one function to (re)load content
async function loadLessonContent() {
  isLessonLoading.value = true;
  loadError.value = null;
  lessonContent.value = null;

  try {
    const result = await contentStore.loadLessonContent(
      props.study,
      props.languageCodeHL,
      props.languageCodeJF,
      props.lesson
    );
    lessonContent.value = result || null;
  } catch (err) {
    // you can log it if you like
    // console.error("Failed to load lesson content", err);
    loadError.value = "Could not load lesson content.";
  } finally {
    isLessonLoading.value = false;
  }
}

// react whenever these props change
watch(
  () => [props.study, props.languageCodeHL, props.languageCodeJF, props.lesson],
  () => {
    loadLessonContent();
  },
  { immediate: true }
);
/**
 * Defensive helpers so the template is safe
 */
const hasPassage = computed(() => {
  return (
    lessonContent.value &&
    lessonContent.value.passage &&
    lessonContent.value.passage.referenceLocalLanguage
  );
});

const hasVideo = computed(() => {
  return lessonContent.value && lessonContent.value.videoUrl;
});

const videoTitle = computed(() => {
  if (
    lessonContent.value &&
    lessonContent.value.passage &&
    lessonContent.value.passage.referenceLocalLanguage
  ) {
    return lessonContent.value.passage.referenceLocalLanguage;
  }
  return "";
});
</script>
<template>
  <h2 class="ltr dbs">{{ sectionContent.title }}</h2>
  <p class="timing">{{ timing }}</p>
  <ol :class="['dbs', numeralClass]">
    <li
      v-for="(item, index) in sectionContent.instruction"
      :key="'instruction-' + index"
    >
      {{ item }}
    </li>
  </ol>

  <div
    v-if="isLessonLoading"
    class="lesson-loading-banner"
    role="status"
    aria-live="polite"
  >
    <span class="lesson-loading-label">
      {{ safeT("interface.lessonLoading") }}
    </span>
  </div>
  <div v-else-if="loadError" class="text-negative">
    {{ loadError }}
  </div>

  <BibleText v-if="hasPassage" :passage="lessonContent.passage" />

  <VideoBar
    v-if="hasVideo"
    :videoUrl="lessonContent.videoUrl"
    :videoTitle="lessonContent.passage.referenceLocalLanguage"
  />

  <ol :class="['dbs', numeralClass]">
    <li
      v-for="(item, index) in sectionContent.question"
      :key="'question-' + index"
    >
      {{ item }}
    </li>
  </ol>
  <NoteSection :studySection="studySection" :placeholder="placeholder" />
</template>

<style scoped>
textarea {
  width: 100%;
  max-width: 640px;
  height: 100px;
  margin-top: 8px;
}
.lesson-loading-banner {
  margin-top: 20px;
  padding: 12px 16px;
  border-radius: 6px;

  background-color: var(--color-primary);
  color: var(--color-on-primary);

  font-size: 16px;
  font-weight: 600;

  box-shadow: 0 2px 6px var(--color-shadow);

  display: flex;
  align-items: center;
  justify-content: flex-start;
}

.lesson-loading-label {
  line-height: 1.4;
}
</style>
