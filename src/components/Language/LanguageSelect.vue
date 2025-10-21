<script setup>
import { ref, computed, watch, onMounted, inject } from "vue";
import { useSettingsStore } from "src/stores/SettingsStore";

const settingsStore = useSettingsStore();
defineEmits(["select"]);

const handleLanguageSelectInjected = inject("handleLanguageSelect", null);

const languageOptions = computed(function () {
  const list = Array.isArray(settingsStore.languages)
    ? settingsStore.languages
    : [];
  return list.map(function (lang) {
    const name = String(lang.name || "").trim();
    const ethnic = String(lang.ethnicName || "").trim();
    const label = ethnic ? name + " (" + ethnic + ")" : name || "Unknown";
    return Object.assign({ label: label }, lang);
  });
});

const selectedLanguage = ref(null);

function normalize(value) {
  if (!value) return null;
  const hl = typeof value === "object"
    ? String(value.languageCodeHL || "")
    : String(value || "");
  if (!hl) return null;
  const opts = languageOptions.value;
  for (var i = 0; i < opts.length; i++) {
    if (String(opts[i].languageCodeHL || "") === hl) return opts[i];
  }
  return null;
}

const filteredOptions = ref([]);
onMounted(function () {
  filteredOptions.value = languageOptions.value;
  selectedLanguage.value =
    normalize(settingsStore.languageObjectSelected || null);
});
watch(languageOptions, function (opts) {
  filteredOptions.value = opts;
  selectedLanguage.value =
    normalize(settingsStore.languageObjectSelected || null);
});

watch(
  function () { return settingsStore.languageObjectSelected; },
  function (val) { selectedLanguage.value = normalize(val); },
  { immediate: true }
);

function onFilter(val, update) {
  const needle = String(val || "").toLowerCase();
  update(function () {
    const opts = languageOptions.value;
    filteredOptions.value = needle
      ? opts.filter(function (o) {
          return o.label.toLowerCase().indexOf(needle) !== -1;
        })
      : opts;
  });
}

function optionLabel(opt) { return opt && opt.label ? opt.label : ""; }

function handleChange(value) {
  const lang = normalize(value);
  if (!lang) return;

  selectedLanguage.value = lang;

  if (typeof handleLanguageSelectInjected === "function") {
    handleLanguageSelectInjected(lang);
    return;
  }

  if (typeof settingsStore.setLanguageObjectSelected === "function") {
    settingsStore.setLanguageObjectSelected(lang);
  } else {
    settingsStore.languageObjectSelected = lang;
  }

  if (typeof settingsStore.addRecentLanguage === "function") {
    settingsStore.addRecentLanguage(lang);
  } else {
    var list = (settingsStore.languagesUsed || []).filter(function (x) {
      return x.languageCodeHL !== lang.languageCodeHL;
    });
    list.unshift(lang);
    settingsStore.languagesUsed = list.slice(0, 2);
    try {
      localStorage.setItem(
        "lang:recents",
        JSON.stringify(settingsStore.languagesUsed)
      );
      localStorage.setItem("lang:selected", JSON.stringify(lang));
    } catch (e) {}
  }
}

// === MRU(2) chips (restored) ===
const recents = computed(function () {
  const src = Array.isArray(settingsStore.languagesUsed)
    ? settingsStore.languagesUsed
    : [];
  return src.slice(0, 2);
});

// Label helper for raw store objects (not necessarily option instances)
function chipLabel(raw) {
  if (!raw) return "";
  const name = String(raw.name || "").trim();
  const ethnic = String(raw.ethnicName || "").trim();
  return ethnic ? name + " (" + ethnic + ")" : name || "Unknown";
}
</script>

<template>
  <div class="q-pa-md">
    <div class="q-mb-md">
      <p>
        <strong>Current Language:</strong>
        {{
          settingsStore.languageObjectSelected
            ? `${settingsStore.languageObjectSelected.name} (${
                settingsStore.languageObjectSelected.ethnicName || ""
              })`.replace(/\(\s*\)$/, "")
            : "None"
        }}
      </p>
    </div>

    <q-select
      filled
      v-model="selectedLanguage"
      :options="filteredOptions"
      :label="$t ? $t('interface.changeLanguage') : 'Change Language'"
      use-input
      :input-debounce="200"
      :option-label="optionLabel"
      :emit-value="false"
      @filter="onFilter"
      @update:model-value="handleChange"
    />

    <div v-if="recents && recents.length" class="q-mt-md">
      <p class="q-mb-xs"><strong>Frequently Used:</strong></p>
      <q-chip
        v-for="lang in recents"
        :key="lang.languageCodeHL"
        clickable
        color="primary"
        text-color="white"
        class="q-mr-sm q-mb-sm"
        @click="handleChange(lang)"
      >
        {{ chipLabel(lang).replace(/\(\s*\)$/, "") }}
      </q-chip>
    </div>
  </div>
</template>
