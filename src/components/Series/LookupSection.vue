<script setup>
import { ref, watch, computed } from "vue";
import { useNumeralClass } from "src/composables/useNumeralClass";
import BibleText from "src/components/Bible/BibleTextBar.vue";
import VideoBar from "src/components/Video/VideoBar.vue";
import NoteSection from "src/components/Notes/NoteSection.vue";
import { useContentStore } from "stores/ContentStore";
import { useI18n } from "vue-i18n";

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
  <h2 v-if="isLessonLoading">
    {{ t("interface.lessonLoading") }}
  </h2>
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

  <style scoped>
    textarea {
      width: 100%;
      height: 100px;
      margin-top: 8px;
    }
  </style>
</template>
