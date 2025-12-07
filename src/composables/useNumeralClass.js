// src/composables/useNumeralClass.js
import { computed } from "vue";
import { storeToRefs } from "pinia";
import { useSettingsStore } from "src/stores/SettingsStore";

export function useNumeralClass() {
  const settingsStore = useSettingsStore();
  const { languageObjectSelected } = storeToRefs(settingsStore);
  const numeralClass = computed(() => {
    // Prefer the richer object from SettingsStore
    const lang = languageObjectSelected.value || {};

    const numeralSet = lang.numeralSet || "latn";

    return "nums-" + numeralSet;
  });

  return numeralClass;
}
