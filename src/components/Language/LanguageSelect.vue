<script setup>
import { ref, computed, watch, onMounted, inject } from "vue";
import { useSettingsStore } from "src/stores/SettingsStore";
import { languageLabel } from "src/utils/languageLabel";

const settingsStore = useSettingsStore();
defineEmits(["select"]);

const handleLanguageSelectInjected = inject("handleLanguageSelect", null);

const languageOptions = computed(function () {
  const list = Array.isArray(settingsStore.languages)
    ? settingsStore.languages
    : [];

  return list.map(function (lang) {
    return {
      label: languageLabel(lang),
      value: lang.languageCodeHL,
      lang: lang,
    };
  });
});

const selectedLanguage = ref(null);
// this function should return the underlying object
// { languageCodeHL: "eng00", name: "English", ethnicName: "...", ... }
function normalize(value) {
  if (!value) return null;

  // If it's already a "lang" object
  if (typeof value === "object" && value.languageCodeHL) {
    return value;
  }

  // If it's an option from q-select: { label, value, lang }
  if (typeof value === "object" && value.lang && value.lang.languageCodeHL) {
    return value.lang;
  }

  // If it's just an HL code like "eng00"
  const hl = String(value || "");
  if (!hl) return null;

  const src = Array.isArray(settingsStore.languages)
    ? settingsStore.languages
    : [];

  for (let i = 0; i < src.length; i++) {
    if (String(src[i].languageCodeHL || "") === hl) {
      return src[i];
    }
  }

  return null;
}

const filteredOptions = ref([]);
onMounted(function () {
  filteredOptions.value = languageOptions.value;
  selectedLanguage.value = normalize(
    settingsStore.textLanguageObjectSelected || null
  );
});
watch(languageOptions, function (opts) {
  filteredOptions.value = opts;
  selectedLanguage.value = normalize(
    settingsStore.textLanguageObjectSelected || null
  );
});

watch(
  function () {
    return settingsStore.textLanguageObjectSelected;
  },
  function (val) {
    selectedLanguage.value = normalize(val);
  },
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

function optionLabel(opt) {
  return opt && opt.label ? opt.label : "";
}

function handleChange(value) {
  const lang = normalize(value);
  if (!lang) return;

  selectedLanguage.value = lang;

  if (typeof handleLanguageSelectInjected === "function") {
    handleLanguageSelectInjected(lang);
    return;
  }

  if (typeof settingsStore.setTextLanguageObjectSelected === "function") {
    settingsStore.setTextLanguageObjectSelected(lang);
  } else {
    settingsStore.textLanguageObjectSelected = lang;
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
function chipLabel(lang) {
  return languageLabel(lang);
}
</script>

<template>
  <div class="q-pa-md">
    <div class="q-mb-md">
      <p>
        <strong>Current Language:</strong>
        {{
          settingsStore.textLanguageObjectSelected
            ? `${settingsStore.textLanguageObjectSelected.name} (${
                settingsStore.textLanguageObjectSelected.ethnicName || ""
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
