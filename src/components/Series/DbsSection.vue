<script>
import NoteSection from "src/components/notes/NoteSection.vue";

export default {
  name: "DbsSection",
  components: {
    NoteSection,
  },
  props: {
    section: { type: String, required: true }, // e.g. "back, up, forwrd"
    content: { type: Object, default: () => ({}) }, // safe fallback
    placeholder: { type: String, default: "Write your notes here" },
    timing: { type: String, default: "Spend 20 to 30 minutes on this section" },
  },
};
</script>
<template>
  <section v-if="content">
    <h2 class="ltr dbs">{{ content.title }}</h2>
    <p class="timing">{{ timing }}</p>
    <ol class="ltr dbs">
      <li v-for="(item, index) in content.question" :key="'question-' + index">
        {{ item }}
      </li>
    </ol>

    <NoteSection :section="section" :placeholder="placeholder" />
  </section>
</template>
<style>
  .timing{
    color:var(--q-primary);
  }
</style>
