<script>
import { computed, onMounted } from "vue";
import { useI18n } from "vue-i18n";
import { useSafeI18n } from "src/composables/useSafeI18n";

import DbsSection from "src/components/Series/DbsSection.vue";
import LookupSection from "src/components/Series/LookupSection.vue";
import SeriesReviewLastLesson from "src/components/Series/SeriesReviewLastLesson.vue";

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
    const { locale, getLocaleMessage } = useI18n({ useScope: "global" });
    const { safeT, i18nReady } = useSafeI18n();
    // i18n-driven placeholders (reactive to locale)
    const lookBackNoteInstruction = computed(function () {
      return safeT("interface.lookBackNoteInstruction");
    });
    const lookUpNoteInstruction = computed(function () {
      return safeT("interface.lookUpNoteInstruction");
    });
    const lookForwardNoteInstruction = computed(function () {
      return safeT("interface.lookForwardNoteInstruction");
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

    onMounted(function () {
      const cur = locale.value;
      console.log("Active locale:", cur);

      const msg = getLocaleMessage(cur);
      console.log("Full messages for current locale:", msg);

      console.log(
        "interface.lessonLoading (raw):",
        msg.interface && msg.interface.lessonLoading
      );

      console.log(
        't("interface.lessonLoading") →',
        safeT("interface.lessonLoading")
      );
    });

    return {
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
  <div>
    <SeriesReviewLastLesson />
    <DbsSection
      studySection="look_back"
      :sectionContent="ccLookBack"
      :placeholder="lookBackNoteInstruction"
      :timing="ccTiming"
    />

    <LookupSection
      studySection="look_up"
      :sectionContent="ccLookUp"
      :placeholder="lookUpNoteInstruction"
      :languageCodeHL="languageCodeHL"
      :languageCodeJF="languageCodeJF"
      :study="study"
      :lesson="lesson"
      :timing="ccTiming"
    />

    <DbsSection
      studySection="look_forward"
      :sectionContent="ccLookForward"
      :placeholder="lookForwardNoteInstruction"
      :timing="ccTiming"
    />
  </div>
</template>
