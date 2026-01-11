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

const videoLanguages = computed(() => {
  return (store.languages || []).filter((lang) => {
    return Array.isArray(lang.channels) && lang.channels.includes("video");
  });
});

const Impl = computed(() =>
  mode.value === "radio"
    ? defineAsyncComponent(() => import("./LanguageRadioButtons.vue"))
    : defineAsyncComponent(() => import("./LanguageSelect.vue"))
);

function findByJF(jf) {
  const list = store && Array.isArray(store.languages) ? store.languages : [];
  const key = String(jf || "");
  for (let i = 0; i < list.length; i++) {
    if (String(list[i].languageCodeJF || "") === key) return list[i];
  }
  return null;
}

function normalizePicked(v) {
  if (v && typeof v === "object") return v;
  return findByJF(v) || null;
}

function handlePick(v) {
  const lang = normalizePicked(v);
  if (!lang) return;

  // JF is the key for video selection
  const jf = String(lang.languageCodeJF || "");
  if (!jf) return;

  if (typeof store.setVideoLanguageSelected === "function") {
    store.setVideoLanguageSelected(jf);
  } else {
    store.videoLanguageSelected = jf;
  }

  emit("select", lang);
}

const selectedJF = computed(() => {
  return store && store.videoLanguageSelected
    ? String(store.videoLanguageSelected)
    : "";
});
</script>

<template>
  <component
    :is="Impl"
    :languages="videoLanguages"
    :recents="[]"
    :valueKey="'languageCodeJF'"
    :selectedValue="selectedJF"
    @select="handlePick"
  />
</template>
