<script setup>
import { ref, computed, watch } from "vue";
import { useI18n } from "vue-i18n";
const { t, te } = useI18n();
import { languageLabel } from "src/utils/languageLabel";

const props = defineProps({
  languages: { type: Array, default: () => [] }, // full catalog
  recents: { type: Array, default: () => [] }, // MRU(2) [{...}]
  // Back-compat: selectedHL is still accepted for TEXT pickers
  selectedHL: { type: String, default: "" },
  // New: generic selected value (HL, JF, etc.)
  selectedValue: { type: String, default: "" },
  // New: which field to use as the radio value (languageCodeHL, languageCodeJF, ...)
  valueKey: { type: String, default: "languageCodeHL" },
  labelMode: { type: String, default: "ethnicName (name)" },
});
const emit = defineEmits(["select"]);
const recentLabelText = computed(() =>
  te("interface.frequentlyUsed")
    ? t("interface.frequentlyUsed")
    : "Frequently Used"
);

// --- helpers ---

// --- label helper ---
function labelFor(lang) {
  // If your languageLabel() supports a mode argument, this will use it.
  // If it does not, it will still work because the extra arg is ignored in JS.
  return languageLabel(lang, props.labelMode);
}

function getKeyValue(lang) {
  if (!lang || typeof lang !== "object") return "";
  const k = props.valueKey || "languageCodeHL";
  return String(lang[k] || "");
}
function findByValue(val) {
  const list = Array.isArray(props.languages) ? props.languages : [];
  const key = String(val || "");
  for (let i = 0; i < list.length; i++) {
    const v = getKeyValue(list[i]);
    if (v === key) return list[i];
  }
  return null;
}

function initialSelected() {
  // Prefer generic selectedValue if provided, else fall back to selectedHL for older callers.
  const v = props.selectedValue ? String(props.selectedValue) : "";
  if (v) return v;
  return String(props.selectedHL || "");
}

// --- radios use selected value string as the value ---
const model = ref(initialSelected());

// keep in sync if parent changes selectedHL
watch(
  () => [props.selectedValue, props.selectedHL, props.valueKey],
  () => {
    model.value = initialSelected();
  }
);

// build full options for catalog
const options = computed(() => {
  const list = Array.isArray(props.languages) ? props.languages : [];
  return list.map((x) => ({
    label: labelFor(x),
    value: getKeyValue(x),
  }));
});

// normalized MRU(2) for chips (dedup by valueKey)
const recentChips = computed(() => {
  const seen = new Set();
  const src = Array.isArray(props.recents) ? props.recents : [];
  const out = [];
  for (let i = 0; i < src.length && out.length < 2; i++) {
    const item = src[i];
    const v = getKeyValue(item);
    if (!v || seen.has(v)) continue;
    seen.add(v);
    out.push(item);
  }
  return out;
});

function pickValue(val) {
  const lang = findByValue(val);
  if (!lang) return;
  // update the radio selection to reflect chip click
  model.value = getKeyValue(lang);
  emit("select", lang);
}

function onRadioChange(val) {
  pickValue(val);
}
</script>

<template>
  <div class="q-pa-md">
    <!-- MRU chips -->
    <div v-if="recentChips.length" class="q-mb-sm">
      <div class="text-caption q-mb-xs">
        <strong>{{ recentLabelText }}</strong>
      </div>
      <q-chip
        v-for="lang in recentChips"
        :key="getKeyValue(lang) || labelFor(lang)"
        clickable
        color="primary"
        text-color="white"
        class="q-mr-sm q-mb-sm"
        @click="pickValue(getKeyValue(lang))"
      >
        {{ languageLabel(lang) }}
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
