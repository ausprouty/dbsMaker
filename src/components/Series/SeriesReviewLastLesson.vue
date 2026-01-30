<script setup>
import { ref, onMounted, watch, computed } from "vue";
import { useSettingsStore } from "src/stores/SettingsStore";
import { getNote } from "src/services/NoteService";
import { getStudyProgress } from "src/services/IndexedDBService";
import { useSiteContent } from "src/composables/useSiteContent";

const settingsStore = useSettingsStore();

const hl = computed(function () {
  var obj = settingsStore.textLanguageObjectSelected || null;
  var code = obj && obj.languageCodeHL ? String(obj.languageCodeHL) : "";
  code = code.trim();
  return code ? code : "eng00";
});

const cleanedNote = ref("");
const noteLines = ref([]);
const hasNote = ref(false);

// get siteContent for this language
const { getSection } = useSiteContent(hl);
const review = computed(function () {
  return getSection("review");
});

const reviewIntro = computed(function () {
  return review.value.paras || [];
});
const reviewEmpty = computed(function () {
  var s = review.value.empty || "";
  s = String(s).trim();
  return s;
});

// Load previous note and intro paragraphs
const loadPreviousNote = async () => {
  const study = settingsStore.currentStudySelected;
  console.log(study);
  if (!study) {
    console.log("[SeriesReview] study not found");
    resetNote();
    return;
  }

  try {
    const progress = await getStudyProgress(study);
    const lastLesson = progress?.lastCompletedLesson;

    if (!lastLesson || typeof lastLesson !== "number") {
      console.log("[SeriesReview] can not find last lesson");
      resetNote();
      return;
    }
    const note = await getNote(study, lastLesson, "look_forward");
    console.log("[SeriesReview] note: ", note);
    const trimmed = note?.trim();
    console.log("[SeriesReview] trimmed: ", trimmed);
    if (trimmed) {
      cleanedNote.value = trimmed;
      noteLines.value = trimmed
        .split(/\r?\n/)
        .filter((line) => line.trim() !== "");
      hasNote.value = true;
      console.log("[SeriesReview] hasNote: ", hasNote.value);
    } else {
      resetNote();
    }
  } catch (err) {
    console.error("❌ Failed to load previous note:", err);
    resetNote();
  }
};

function resetNote() {
  console.log("[SeriesReview] resetNote() called");
  hasNote.value = false;
  cleanedNote.value = "";
  noteLines.value = [];
}

onMounted(loadPreviousNote);

// Optional: Watch if currentStudySelected changes in real time
watch(() => settingsStore.currentStudySelected, loadPreviousNote);
</script>

<template>
  <div class="last-week-box">
    <template v-if="hasNote">
      <p v-for="(para, index) in reviewIntro" :key="'review-' + index">
        {{ para }}
      </p>
      <p v-for="(line, index) in noteLines" :key="'note-' + index">
        <b> {{ line }}</b>
      </p>
    </template>
    <template v-else>
      <p>{{ reviewEmpty }}</p>
    </template>
  </div>
</template>

<style scoped>
.last-week-box {
  background-color: var(--color-minor1); /* soft beige background */
  border-left: 6px solid var(--color-highlight-scripture); /* visual cue for importance */
  padding: 16px 20px;
  margin-bottom: 24px;
  border-radius: 8px;
  box-shadow: 2px 2px 8px var(--color-shadow); /* subtle depth */
  font-size: 15px;
  color: var(--color-minor2); /* warm dark brown text */
  transition: background-color 0.3s ease;
}

.last-week-box strong {
  color: var(--color-primary); /* warm brown header */
  font-size: 16px;
}

.last-week-box p {
  margin: 8px 0;
  line-height: 1.5;
}
</style>
