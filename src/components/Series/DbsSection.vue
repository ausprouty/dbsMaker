<script setup>
import { toRefs, watch } from "vue";
import NoteSection from "src/components/Notes/NoteSection.vue";
import { useNumeralClass } from "src/composables/useNumeralClass";

// keep the component name (useful for devtools)
defineOptions({
  name: "DbsSection",
});

const props = defineProps({
  studySection: { type: String, required: true }, // e.g. "look_back" or "look_forward"
  sectionContent: { type: Object, default: () => ({}) }, // safe fallback
  placeholder: { type: String, default: "Write your notes here" },
  timing: {
    type: String,
    default: "Spend 20 to 30 minutes on this section",
  },
});
const { sectionContent } = toRefs(props);
const numeralClass = useNumeralClass();
watch(
  sectionContent,
  (val) => {
    console.log("DbsSection sectionContent changed:", val);
  },
  { immediate: true }
);
</script>
<template>
  <section v-if="sectionContent && sectionContent.title">
    <h2 class="ltr dbs">{{ sectionContent.title }}</h2>
    <p class="timing">{{ timing }}</p>
    <ol :class="['dbs', numeralClass]">
      <li
        v-for="(item, index) in sectionContent.question"
        :key="'question-' + index"
      >
        {{ item }}
      </li>
    </ol>

    <NoteSection :studySection="studySection" :placeholder="placeholder" />
  </section>
</template>
<style>
.timing {
  color: var(--q-primary);
}
</style>
