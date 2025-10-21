<script setup>
import { computed } from "vue";
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

// Label reacts to locale changes
const topicLabel = computed(() => t("interface.topic"));

// Normalize completed lessons once
const completedSet = computed(
  () => new Set((props.completedLessons || []).map(n => Number(n)))
);

// Options with completion flag (and numeric value)
const markedTopics = computed(() => {
  const topics = Array.isArray(props.topics) ? props.topics : [];
  return topics.map(topic => {
    const valueNum = Number(topic.value);
    return {
      ...topic,
      value: valueNum,
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
  <div>
    <q-select
      filled
      v-model="selectedLesson"
      :options="markedTopics"
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
              <div class="text-body1">{{ scope.opt.label }}</div>
              <div v-if="scope.opt.completed">
                <q-icon name="check_circle" color="green" size="sm" class="q-ml-xs" />
              </div>
            </div>
          </q-item-section>
        </q-item>
      </template>
    </q-select>
  </div>
</template>
