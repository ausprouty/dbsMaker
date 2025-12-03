<script setup>
import NoteSection from "src/components/Notes/NoteSection.vue";
import { useNumeralClass } from "src/composables/useNumeralClass";

// keep the component name (useful for devtools)
defineOptions({
  name: "DbsSection",
});

const props = defineProps({
  section: { type: String, required: true }, // e.g. "back, up, forward"
  content: { type: Object, default: () => ({}) }, // safe fallback
  placeholder: { type: String, default: "Write your notes here" },
  timing: {
    type: String,
    default: "Spend 20 to 30 minutes on this section",
  },
});

const { numeralClass } = useNumeralClass();
</script>
<template>
  <section v-if="content">
    <h2 class="ltr dbs">{{ content.title }}</h2>
    <p class="timing">{{ timing }}</p>
    <ol :class="['dbs', numeralClass]">
      <li v-for="(item, index) in content.question" :key="'question-' + index">
        {{ item }}
      </li>
    </ol>

    <NoteSection :section="section" :placeholder="placeholder" />
  </section>
</template>
<style>
.timing {
  color: var(--q-primary);
}
</style>
