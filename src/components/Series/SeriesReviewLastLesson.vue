<script setup>
import { ref, onMounted, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useSettingsStore } from "src/stores/SettingsStore";
import { getNote } from "src/services/NoteService";
import { getStudyProgress } from "src/services/IndexedDBService";
import { buildNotesKey } from "src/utils/ContentKeyBuilder";

const { t } = useI18n();
const settingsStore = useSettingsStore();

const cleanedNote = ref("");
const noteLines = ref([]);
const hasNote = ref(false);
const reviewIntro = ref([]);

// Load previous note and intro paragraphs
const loadPreviousNote = async () => {
  const study = settingsStore.currentStudySelected;
  if (!study) {
    resetNote();
    return;
  }

  try {
    const progress = await getStudyProgress(study);
    const lastLesson = progress?.lastCompletedLesson;

    if (!lastLesson || typeof lastLesson !== "number") {
      resetNote();
      return;
    }

    const noteKey = buildNotesKey(study, lastLesson, "forward");
    const note = await getNote(noteKey);

    const trimmed = note?.trim();
    if (trimmed) {
      cleanedNote.value = trimmed;
      noteLines.value = trimmed
        .split(/\r?\n/)
        .filter((line) => line.trim() !== "");
      hasNote.value = true;
      reviewIntro.value = loadIntroParagraphs();
    } else {
      resetNote();
    }
  } catch (err) {
    console.error("❌ Failed to load previous note:", err);
    resetNote();
  }
};

function resetNote() {
  hasNote.value = false;
  cleanedNote.value = "";
  noteLines.value = [];
  reviewIntro.value = [];
}

function loadIntroParagraphs() {
  const paragraphs = [];
  let index = 1;
  while (true) {
    const key = `review.p${index}`;
    const text = t(key);
    if (!text || text === key) break;
    paragraphs.push(text);
    index++;
  }
  return paragraphs;
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
      <p><strong>📝 Last week you said:</strong></p>
      <p v-for="(line, index) in noteLines" :key="'note-' + index">
        {{ line }}
      </p>
    </template>
    <template v-else>
      <p>{{ t("review.empty") }}</p>
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

