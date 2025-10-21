<script setup>
import { ref, computed, watch } from 'vue';

const props = defineProps({
  languages:   { type: Array,  default: () => [] }, // full catalog
  recents:     { type: Array,  default: () => [] }, // MRU(2) [{...}]
  selectedHL:  { type: String, default: '' },       // currently selected HL
  labelMode:   { type: String, default: 'ethnicName (name)' },
  recentLabel: { type: String, default: 'Frequently Used' },
});
const emit = defineEmits(['select']);

// --- helpers ---
function labelFor(lang) {
  const ethnic = String(lang?.ethnicName || '').trim();
  const name   = String(lang?.name || '').trim();
  if (props.labelMode === 'ethnicName (name)' && ethnic) return `${ethnic} (${name})`;
  return name || ethnic || 'Unknown';
}
function findByHL(hl) {
  const list = Array.isArray(props.languages) ? props.languages : [];
  const key = String(hl || '');
  for (let i = 0; i < list.length; i++) {
    if (String(list[i].languageCodeHL || '') === key) return list[i];
  }
  return null;
}

// --- radios use HL string as the value ---
const model = ref(props.selectedHL || '');

// keep in sync if parent changes selectedHL
watch(() => props.selectedHL, (hl) => { model.value = String(hl || ''); });

// build full options for catalog
const options = computed(() => {
  const list = Array.isArray(props.languages) ? props.languages : [];
  return list.map((x) => ({
    label: labelFor(x),
    value: String(x.languageCodeHL || ''),
  }));
});

// normalized MRU(2) for chips (dedup by HL)
const recentChips = computed(() => {
  const seen = new Set();
  const src = Array.isArray(props.recents) ? props.recents : [];
  const out = [];
  for (let i = 0; i < src.length && out.length < 2; i++) {
    const hl = String(src[i]?.languageCodeHL || '');
    if (!hl || seen.has(hl)) continue;
    seen.add(hl);
    out.push(src[i]);
  }
  return out;
});

function pickHL(hl) {
  const lang = findByHL(hl);
  if (!lang) return;
  // update the radio selection to reflect chip click
  model.value = String(lang.languageCodeHL || '');
  emit('select', lang);
}

function onRadioChange(hl) {
  pickHL(hl);
}
</script>

<template>
  <div class="q-pa-md">
    <!-- MRU chips -->
    <div v-if="recentChips.length" class="q-mb-sm">
      <div class="text-caption q-mb-xs"><strong>{{ recentLabel }}</strong></div>
      <q-chip
        v-for="lang in recentChips"
        :key="lang.languageCodeHL"
        clickable
        color="primary"
        text-color="white"
        class="q-mr-sm q-mb-sm"
        @click="pickHL(lang.languageCodeHL)"
      >
        {{ labelFor(lang) }}
      </q-chip>
    </div>

    <!-- All languages as radios -->
    <q-option-group
      v-model="model"
      :options="options"
      type="radio"
      @update:model-value="onRadioChange"
      class="q-mt-sm"
    />
  </div>
</template>
