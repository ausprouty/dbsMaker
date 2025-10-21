<script setup>
import { computed, defineAsyncComponent } from 'vue';
import { useSettingsStore } from 'src/stores/SettingsStore';

const store = useSettingsStore();
const emit = defineEmits(['select']);

const mode = computed(() => {
  if (store && store.languageSelectorMode) return store.languageSelectorMode;
  const envMode = String(import.meta.env.VITE_LANGUAGE_PICKER_TYPE || '')
    .toLowerCase();
  return envMode === 'radio' || envMode === 'select' ? envMode : 'select';
});

const Impl = computed(() =>
  mode.value === 'radio'
    ? defineAsyncComponent(() => import('./LanguageRadioButtons.vue'))
    : defineAsyncComponent(() => import('./LanguageSelect.vue'))
);

function findByHL(hl) {
  const list = store && Array.isArray(store.languages) ? store.languages : [];
  for (let i = 0; i < list.length; i++) {
    if (String(list[i].languageCodeHL || '') === String(hl || '')) return list[i];
  }
  return null;
}

function normalizePicked(v) {
  // Child may pass the whole object or just the HL code
  if (v && typeof v === 'object') return v;
  const found = findByHL(v);
  return found || null;
}

function handlePick(v) {
  const lang = normalizePicked(v);
  if (!lang) return;
  // Ensure both codes exist
  if (!lang.languageCodeHL || !lang.languageCodeJF) return;
  emit('select', lang);
}
</script>

<template>
  <component
    :is="Impl"
    :languages="store.languages"
    @select="handlePick"
    @update:model-value="handlePick"
  />
</template>
