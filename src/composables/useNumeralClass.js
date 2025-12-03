// src/composables/useNumeralClass.js
import { computed } from "vue";
import { useStore } from "vuex";
import { listClassForLanguage } from "src/utils/numerals";

export function useNumeralClass() {
  const store = useStore();

  const languageSelected = computed(() => store.getters.languageSelected);

  const numeralClass = computed(() =>
    listClassForLanguage(languageSelected.value)
  );

  return {
    languageSelected,
    numeralClass,
  };
}
