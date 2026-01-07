// src/composables/useNumeralClass.js
import { computed } from "vue";
import { storeToRefs } from "pinia";
import { useSettingsStore } from "src/stores/SettingsStore";

export function useNumeralClass() {
  const settingsStore = useSettingsStore();
  const { textLanguageObjectSelected } = storeToRefs(settingsStore);
  const numeralClass = computed(() => {
    // Prefer the richer object from SettingsStore
    const lang = textLanguageObjectSelected.value || {};

    const numeralSet = lang.numeralSet || "latn";

    return "nums-" + numeralSet;
  });

  return numeralClass;
}
