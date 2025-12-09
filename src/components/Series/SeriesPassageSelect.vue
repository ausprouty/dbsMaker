<script setup>
import { computed } from "vue";
import { useLocalizedDigits } from "src/composables/useLocalizedDigits";
import { useSettingsStore } from "src/stores/SettingsStore";
import { useI18n } from "vue-i18n";

const props = defineProps({
  study: String,
  topics: { type: Array, default: () => [] },
  lesson: { type: [Number, String], default: 1 },
  markLessonComplete: Function,
  isLessonCompleted: Function,
  completedLessons: { type: Array, default: () => [] },
});

const emit = defineEmits(["updateLesson"]);
const settingsStore = useSettingsStore();
const { t } = useI18n({ useScope: "global" });
const { toLocalizedDigits } = useLocalizedDigits();

// Label reacts to locale changes
const topicLabel = computed(() => t("interface.topic"));

// Normalize completed lessons once
const completedSet = computed(
  () => new Set((props.completedLessons || []).map((n) => Number(n)))
);

// Build options: normalise value, mark completed, localise label digits
const selectOptions = computed(() => {
  const topics = Array.isArray(props.topics) ? props.topics : [];

  return topics.map((topic, index) => {
    // Work out a numeric value for the lesson
    const valueNum = Number(
      topic.value != null
        ? topic.value
        : topic.lesson != null
        ? topic.lesson
        : index + 1
    );

    const lessonNumber = valueNum;

    const baseLabel =
      topic.label ||
      topic.title ||
      t("interface.lessonNumber", { n: lessonNumber });

    return {
      ...topic,
      value: valueNum,
      label: toLocalizedDigits(baseLabel),
      completed: completedSet.value.has(valueNum),
    };
  });
});

// v-model is just a Number; default to 1
const selectedLesson = computed({
  get() {
    const n = Number(props.lesson);
    return Number.isFinite(n) && n > 0 ? n : 1;
  },
  set(value) {
    const v = Number(value) || 1;
    const studyKey = props.study || "dbs";
    settingsStore.setLessonNumber(studyKey, v);
    emit("updateLesson", v);
  },
});
</script>

<template>
  <div v-if="selectOptions && selectOptions.length">
    <q-select
      filled
      v-model="selectedLesson"
      :options="selectOptions"
      option-label="label"
      option-value="value"
      emit-value
      map-options
      :label="topicLabel"
      class="select"
    >
      <template #option="scope">
        <q-item
          v-bind="scope.itemProps"
          :class="{ 'completed-option': scope.opt.completed }"
        >
          <q-item-section>
            <div class="row items-center no-wrap">
              <div class="text-body1">
                {{ scope.opt.label }}
              </div>
              <div v-if="scope.opt.completed">
                <q-icon
                  name="check_circle"
                  color="green"
                  size="sm"
                  class="q-ml-xs"
                />
              </div>
            </div>
          </q-item-section>
        </q-item>
      </template>
    </q-select>
  </div>
  <div v-else class="q-mb-md text-grey">Loading lessons…</div>
</template>
