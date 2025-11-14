<script setup>
import { ref, watch, onMounted } from "vue";
import BibleText from "src/components/Bible/BibleTextBar.vue";
import VideoBar from "src/components/Video/VideoBar.vue";
import NoteSection from "src/components/Notes/NoteSection.vue";

const props = defineProps({
  section: { type: String, required: true },
  commonContent: { type: Object, required: true },
  lessonContent: { type: Object, required: true },
  placeholder: { type: String, default: "Write your notes here" },
  timing: { type: String, default: "Spend 20 to 30 minutes on this section" },
});
</script>
<template>
  <section v-if="commonContent">
    <h2 class="ltr dbs">{{ commonContent.title }}</h2>
    <p class="timing">{{ timing }}</p>
    <ol class="ltr dbs">
      <li
        v-for="(item, index) in commonContent.instruction"
        :key="'instruction-' + index"
      >
        {{ item }}
      </li>
    </ol>

    <BibleText
      v-if="lessonContent && lessonContent.passage"
      :passage="lessonContent.passage"
    />

    <VideoBar
      v-if="lessonContent.videoUrl"
      :videoUrl="lessonContent.videoUrl"
      :videoTitle="lessonContent.passage.referenceLocalLanguage"
    />

    <ol class="ltr dbs">
      <li
        v-for="(item, index) in commonContent.question"
        :key="'question-' + index"
      >
        {{ item }}
      </li>
    </ol>
    <NoteSection :section="section" :placeholder="placeholder" />
  </section>
</template>

<style scoped>
textarea {
  width: 100%;
  height: 100px;
  margin-top: 8px;
}
</style>
