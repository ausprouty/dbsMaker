<script>
import {
  ref,
  watch,
  onMounted,
  onBeforeUnmount,
  computed,
  nextTick,
} from "vue";
import { useSettingsStore } from "src/stores/SettingsStore";
import { getNote, saveNote } from "src/services/NoteService";
import debounce from "lodash.debounce";
// optional: reuse your shared helpers
import { normId, normIntish } from "src/utils/normalize";

const ALLOWED_SECTIONS = new Set([
  "look_back",
  "look_up",
  "look_forward",
  "response",
]);

export default {
  name: "NoteSection",
  props: {
    studySection: {
      type: String,
      required: true,
      validator: (v) =>
        ALLOWED_SECTIONS.has(
          String(v ?? "")
            .trim()
            .toLowerCase()
        ),
    },
    placeholder: { type: String, default: "Write your notes here" },
  },
  setup(props) {
    const note = ref("");
    const textareaRef = ref(null);
    const settingsStore = useSettingsStore();

    // Hardened params as computeds
    const studyId = computed(() => normId(settingsStore.currentStudySelected));
    const lessonId = computed(() => {
      const n = settingsStore.lessonNumberForStudy(); // call the function
      return Number.isInteger(n) && n > 0 ? String(n) : "";
    });

    const sectionId = computed(() => {
      const s = normId(props.studySection).toLowerCase();
      return ALLOWED_SECTIONS.has(s) ? s : "";
    });
    console.log("NoteSection", {
      studyId: studyId.value,
      lessonId: lessonId.value,
      sectionId: sectionId.value,
    });
    const ready = computed(
      () => !!studyId.value && !!lessonId.value && !!sectionId.value
    );

    const autoResize = () => {
      const el = textareaRef.value;
      if (!el) return;
      el.style.height = "auto";
      el.style.height = el.scrollHeight + "px";
    };

    const loadNote = async () => {
      if (!ready.value) {
        note.value = "";
        return;
      }
      try {
        note.value = await getNote(
          studyId.value,
          lessonId.value,
          sectionId.value
        );
        await nextTick();
        autoResize();
      } catch (e) {
        console.error(
          "[NoteSection] loadNote failed",
          {
            study: studyId.value,
            lesson: lessonId.value,
            section: sectionId.value,
          },
          e
        );
      }
    };

    const saveNoteContent = debounce(async (newVal) => {
      console.log("saveNoteContent: " + newVal);
      if (!ready.value) return;
      console.log("saveNoteContentReady");
      try {
        await saveNote(
          studyId.value,
          lessonId.value,
          sectionId.value,
          String(newVal ?? "")
        );
      } catch (e) {
        console.warn("[NoteSection] saveNote failed", e);
      }
    }, 800);

    // Reload note when any param changes
    watch([studyId, lessonId, sectionId], loadNote);

    // Persist on edits
    watch(note, (val) => {
      saveNoteContent(val);
      autoResize();
    });

    onMounted(loadNote);
    onBeforeUnmount(() => {
      if (saveNoteContent.flush) saveNoteContent.flush();
    });

    return { note, textareaRef, autoResize, saveNoteContent };
  },
};
</script>

<template>
  <textarea
    ref="textareaRef"
    class="dbs-notes notes"
    v-model="note"
    :placeholder="placeholder"
    @input="autoResize"
    @blur="saveNoteContent.flush && saveNoteContent.flush()"
  />
</template>
