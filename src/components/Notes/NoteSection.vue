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
  "video",
  "look_back",
  "look_up",
  "look_forward",
]);

export default {
  name: "NoteSection",
  props: {
    section: {
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
      const n = Number(normIntish(settingsStore.lessonNumberForStudy));
      return Number.isInteger(n) && n > 0 ? String(n) : ""; // service expects strings
    });
    const sectionId = computed(() => {
      const s = normId(props.section).toLowerCase();
      return ALLOWED_SECTIONS.has(s) ? s : "";
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
      if (!ready.value) return;
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
