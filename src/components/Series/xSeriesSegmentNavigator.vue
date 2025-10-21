<script setup>
import { ref, computed, onMounted, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useSettingsStore } from "src/stores/SettingsStore";
import { getNote } from "src/services/NoteService";
import { getStudyProgress } from "src/services/IndexedDBService";
import { buildNotesKey } from "src/utils/ContentKeyBuilder";

const { t } = useI18n({ useScope: "global" });
const settingsStore = useSettingsStore();

const cleanedNote = ref("");
const noteLines = ref([]);
const hasNote = ref(false);

// Locale-reactive intro paragraphs: review.p1, review.p2, ...
const reviewIntro = computed(function () {
  const paras = [];
  for (let i = 1; i < 50; i++) { // reasonable upper bound
    const key = "review.p" + i;
    const text = t(key);
    if (!text || text === key) break; // stop when missing
    paras.push(text);
  }
  return paras;
});

// Resolve last completed lesson from various shapes
function resolveLastLesson(progress) {
  if (!progress) return null;

  // If it's an array of numbers (e.g., [1,2,3]) → use max
  if (Array.isArray(progress)) {
    const nums = progress.filter(function (n) { return typeof n === "number"; });
    return nums.length ? Math.max.apply(null, nums) : null;
  }

  // Object shapes we might see
  if (typeof progress === "object") {
    if (typeof progress.lastCompletedLesson === "number") {
      return progress.lastCompletedLesson;
    }
    if (Array.isArray(progress.completed)) {
      const nums = progress.completed.filter(function (n) { return typeof n === "number"; });
      return nums.length ? Math.max.apply(null, nums) : null;
    }
  }

  return null;
}

// Load previous note (for last completed lesson of current study)
async function loadPreviousNote() {
  const study = settingsStore.currentStudySelected;
  if (!study) {
    resetNote();
    return;
  }

  try {
    const progress = await getStudyProgress(study);
    const lastLesson = resolveLastLesson(progress);

    if (typeof lastLesson !== "number" || !isFinite(lastLesson)) {
      resetNote();
      return;
    }

    const noteKey = buildNotesKey(study, lastLesson, "forward");
    const note = await getNote(noteKey);

    const trimmed = note ? String(note).trim() : "";
    if (trimmed) {
      cleanedNote.value = trimmed;
      noteLines.value = trimmed.split(/\r?\n/).filter(function (line) {
        return line.trim() !== "";
      });
      hasNote.value = true;
    } else {
      resetNote();
    }
  } catch (err) {
    console.error("❌ Failed to load previous note:", err);
    resetNote();
  }
}

function resetNote() {
  hasNote.value = false;
  cleanedNote.value = "";
  noteLines.value = [];
}

onMounted(loadPreviousNote);

// React when study changes
watch(function () { return settingsStore.currentStudySelected; }, loadPreviousNote);
</script>

<template>
  <div class="last-week-box">
    <template v-if="hasNote">
      <p v-for="(para, i) in reviewIntro" :key="'review-' + i">
        {{ para }}
      </p>
      <p><strong>Last week you said:</strong></p>
      <p v-for="(line, i) in noteLines" :key="'note-' + i">
        {{ line }}
      </p>
    </template>

    <template v-else>
      <p>{{ t('review.empty') }}</p>
    </template>
  </div>
</template>

<style scoped>
.last-week-box {
  background-color: var(--color-minor1);
  border-left: 6px solid var(--color-highlight-scripture);
  padding: 16px 20px;
  margin-bottom: 24px;
  border-radius: 8px;
  box-shadow: 2px 2px 8px var(--color-shadow);
  font-size: 15px;
  color: var(--color-minor2);
  transition: background-color 0.3s ease;
}
.last-week-box strong {
  color: var(--color-primary);
  font-size: 16px;
}
.last-week-box p {
  margin: 8px 0;
  line-height: 1.5;
}
</style>
