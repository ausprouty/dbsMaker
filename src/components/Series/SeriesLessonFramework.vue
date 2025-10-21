<script>
import { computed, watch, onMounted } from "vue";
import { useContentStore } from "stores/ContentStore";
import { useI18n } from "vue-i18n";

import DbsSection from "src/components/series/DbsSection.vue";
import LookupSection from "src/components/series/LookupSection.vue";
import SeriesReviewLastLesson from "src/components/series/SeriesReviewLastLesson.vue";

export default {
  name: "SeriesLessonFramework",
  components: { DbsSection, LookupSection, SeriesReviewLastLesson },

  props: {

    languageCodeHL: { type: String, required: true },
    languageCodeJF: { type: String, required: true },
    study: { type: String, required: true },
    lesson: { type: Number, required: true },
    commonContent: { type: Object, required: true },
  },

  setup(props) {
    const contentStore = useContentStore();
    const { t } = useI18n({ useScope: "global" });

    const lessonContent = computed(function () {
      return contentStore.lessonContentFor(
        props.study,
        props.languageCodeHL,
        props.languageCodeJF,
        props.lesson
      );
    });

    // i18n-driven placeholders (reactive to locale)
    const lookBackNoteInstruction = computed(function () {
      return t("interface.lookBackNoteInstruction");
    });
    const lookUpNoteInstruction = computed(function () {
      return t("interface.lookUpNoteInstruction");
    });
    const lookForwardNoteInstruction = computed(function () {
      return t("interface.lookForwardNoteInstruction");
    });

    // Safe fallbacks for template (no optional chaining)
    const ccLookBack = computed(function () {
      return props.commonContent && props.commonContent.look_back
        ? props.commonContent.look_back
        : {};
    });
    const ccLookUp = computed(function () {
      return props.commonContent && props.commonContent.look_up
        ? props.commonContent.look_up
        : {};
    });
    const ccLookForward = computed(function () {
      return props.commonContent && props.commonContent.look_forward
        ? props.commonContent.look_forward
        : {};
    });
    const ccTiming = computed(function () {
      return props.commonContent && props.commonContent.timing
        ? props.commonContent.timing
        : "";
    });

    async function loadLessonContent() {
      await contentStore.loadLessonContent(
        props.languageCodeHL,
        props.languageCodeJF,
        props.study,
        props.lesson
      );
    }

    watch(
      function () {
        return [props.lesson, props.languageCodeHL, props.languageCodeJF];
      },
      async function () {
        await loadLessonContent();
      }
    );

    onMounted(function () {
      loadLessonContent();
    });

    return {
      lessonContent,
      lookBackNoteInstruction,
      lookUpNoteInstruction,
      lookForwardNoteInstruction,
      ccLookBack,
      ccLookUp,
      ccLookForward,
      ccTiming,
    };
  },
};
</script>

<template>
  <div v-if="!lessonContent">
    <h2 class="warning">Your lesson content is loading...</h2>
  </div>
  <div v-else>
    <h1 class="title dbs">{{ lessonContent.title }}</h1>
    <SeriesReviewLastLesson />
    <DbsSection
      section="look_back"
      :content="ccLookBack"
      :placeholder="lookBackNoteInstruction"
      :timing="ccTiming"
    />

    <LookupSection
      section="look_up"
      :commonContent="ccLookUp"
      :lessonContent="lessonContent"
      :placeholder="lookUpNoteInstruction"
      :timing="ccTiming"
    />

    <DbsSection
      section="look_forward"
      :content="ccLookForward"
      :placeholder="lookForwardNoteInstruction"
      :timing="ccTiming"
    />
  </div>
</template>
