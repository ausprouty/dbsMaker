<script setup>
import { computed, watch } from "vue";
import { useI18n } from "vue-i18n";
import DbsSection from "src/components/series/DbsSection.vue";

const props = defineProps({
  commonContent: { type: Object, required: true },
  languageCodeHL: { type: String, required: true },
  lesson: { type: Number, required: true },
  sectionKey: { type: String, required: true },
});

const { t } = useI18n({ useScope: "global" });
const videoNoteInstruction = computed(() =>
  t("interface.videoNoteInstruction")
);

watch(
  () => props.sectionKey,
  (newVal, oldVal) => {
    console.log("SectionKey changed from '" + oldVal + "' to '" + newVal + "'");
  }
);
</script>

<template>
  <div>
    <DbsSection
      :content="commonContent"
      :section="sectionKey"
      :placeholder="videoNoteInstruction"
      timing=""
    />
  </div>
</template>
