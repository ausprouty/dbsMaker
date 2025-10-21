// src/composables/useProgressTracker.js
import { ref } from "vue";
import {
  getStudyProgress,
  saveStudyProgress,
} from "src/services/IndexedDBService";

export function useProgressTracker(study) {
  const completedLessons = ref([]);
  const lastCompletedLesson = ref(null);

  const loadProgress = async () => {
    const progress = await getStudyProgress(study);
    completedLessons.value = progress.completedLessons || [];
    lastCompletedLesson.value = progress.lastCompletedLesson || null;
  };

  const isLessonCompleted = (lesson) => {
    return completedLessons.value.includes(lesson);
  };

  const markLessonComplete = async (lesson) => {
    const progress = await getStudyProgress(study);

    if (!progress.completedLessons.includes(lesson)) {
      progress.completedLessons.push(lesson);
    }

    progress.lastCompletedLesson = lesson;

    await saveStudyProgress(study, progress);

    completedLessons.value = [...progress.completedLessons];
    lastCompletedLesson.value = lesson;
  };

  return {
    completedLessons,
    lastCompletedLesson,
    isLessonCompleted,
    markLessonComplete,
    loadProgress,
  };
}
