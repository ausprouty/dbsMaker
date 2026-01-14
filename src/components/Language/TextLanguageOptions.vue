<script setup>
import { computed, defineAsyncComponent } from "vue";
import { useSettingsStore } from "src/stores/SettingsStore";

const store = useSettingsStore();
const emit = defineEmits(["select"]);

const mode = computed(() => {
  if (store && store.languageSelectorMode) return store.languageSelectorMode;
  const envMode = String(
    import.meta.env.VITE_LANGUAGE_PICKER_TYPE || ""
  ).toLowerCase();
  return envMode === "radio" || envMode === "select" ? envMode : "select";
});
const textLanguages = computed(() => {
  return (store.languages || []).filter(
    (lang) => Array.isArray(lang.channels) && lang.channels.includes("text")
  );
});

const Impl = computed(() =>
  mode.value === "radio"
    ? defineAsyncComponent(() => import("./LanguageRadioButtons.vue"))
    : defineAsyncComponent(() => import("./LanguageSelect.vue"))
);

function findByHL(hl) {
  const list = store && Array.isArray(store.languages) ? store.languages : [];
  const key = String(hl || "");
  for (let i = 0; i < list.length; i++) {
    if (String(list[i].languageCodeHL || "") === key) return list[i];
  }
  return null;
}

function normalizePicked(v) {
  // Child may pass the whole object or just the HL code
  if (v && typeof v === "object") return v;
  return findByHL(v) || null;
}

function handlePick(v) {
  const lang = normalizePicked(v);
  if (!lang) return;

  // HL is the key for text selection
  const hl = String(lang.languageCodeHL || "");
  if (!hl) return;

  // Commit the selection here
  // Prefer a store action if you have one; fallback to direct assignment.
  if (typeof store.setTextLanguageObjectSelected === "function") {
    store.setTextLanguageObjectSelected(lang);
  } else {
    store.textLanguageObjectSelected = lang;
  }

  // Optional: still bubble up for callers that care
  emit("select", lang);
}
</script>

<template>
  <h2>Text Language</h2>
  <component
    :is="Impl"
    :languages="textLanguages"
    :recents="store.languagesUsed"
    :selectedHL="store.textLanguageObjectSelected?.languageCodeHL || ''"
    @select="handlePick"
  />
</template>
