<script setup>
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { useBibleReference } from "src/composables/useBibleReference";

const props = defineProps({
  passageReference: { type: String, default: "No reference found" },
  biblePassage: { type: Object, required: true },
});

const { t } = useI18n({ useScope: "global" });
const { cleanReference } = useBibleReference();

const displayReference = computed(function () {
  return cleanReference(props.passageReference);
});

const readMoreLabel = computed(function () {
  return t("interface.readMore");
});

// If you want a "Read {title}" heading instead of raw reference:
// const readLabel = computed(function () {
//   var title = displayReference.value
//   return title ? t('interface.read', { title: title }).trim() : t('interface.readPlain')
// })
</script>

<template>
  <div class="bible-container">
    <div>
      <h3 class="dbs">{{ displayReference }}</h3>
    </div>
    <div
      v-if="biblePassage && biblePassage.passageText"
      v-html="biblePassage.passageText"
      class="bible-text"
    />
    <div>
      <a
        v-if="biblePassage && biblePassage.passageUrl"
        :href="biblePassage.passageUrl"
        class="readmore-button"
        target="_blank"
        rel="noopener"
      >
        {{ readMoreLabel }}
      </a>
    </div>
  </div>
</template>

<style scoped>
.bible-container {
  margin-top: 20px;
  padding: 15px;
  background-color: #f9f9f9;
  border: 1px solid #ddd;
  border-radius: 5px;
}
.bible-text {
  font-size: 16px;
  line-height: 1.5;
}
</style>
