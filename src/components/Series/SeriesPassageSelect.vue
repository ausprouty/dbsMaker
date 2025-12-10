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

// text direction
const isRtl = computed(
  () => settingsStore.languageObjectSelected?.textDirection === "rtl"
);
</script>

<template>
  <div
    v-if="selectOptions && selectOptions.length"
    :dir="isRtl ? 'rtl' : 'ltr'"
  >
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
      :input-class="isRtl ? 'text-right' : ''"
    >
      <template #option="scope">
        <q-item
          v-bind="scope.itemProps"
          :class="[
            { 'completed-option': scope.opt.completed },
            isRtl ? 'text-right justify-end' : '',
          ]"
        >
          <q-item-section :class="isRtl ? 'text-right' : ''">
            <div
              class="row items-center no-wrap"
              :class="isRtl ? 'justify-end' : ''"
            >
              <div class="text-body1">
                {{ scope.opt.label }}
              </div>
              <div v-if="scope.opt.completed">
                <q-icon
                  name="check_circle"
                  color="green"
                  size="sm"
                  :class="isRtl ? 'q-mr-xs' : 'q-ml-xs'"
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

<style scoped>
.topic-select--rtl {
  direction: rtl;
}

/* Move the floating label to the right */
.topic-select--rtl :deep(.q-field__label) {
  left: auto !important;
  right: 0.75rem;
  text-align: right;
  transform-origin: right top;
}

/* Right-align the displayed value inside the field */
.topic-select--rtl :deep(.q-field__control),
.topic-select--rtl :deep(.q-field__native) {
  justify-content: flex-end;
  text-align: right;
}
</style>
