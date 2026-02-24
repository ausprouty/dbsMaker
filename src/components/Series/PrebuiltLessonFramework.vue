<script setup>
import { computed, onMounted, watch, ref } from "vue";
import { useContentStore } from "src/stores/ContentStore";

const props = defineProps({
  study: { type: String, required: true },
  lesson: { type: Number, required: true },
  languageCodeHL: { type: String, default: "eng00" },
  commonContent: { type: Object, default: null },
});
console.log("[PrebuiltLessonFramework] Props:", props);

const contentStore = useContentStore();

const loading = ref(false);
const error = ref(null);
const page = ref(null);

// only one JF language for now
const languageCodeJF = 529;

async function loadLessonContent() {
  loading.value = true;
  error.value = null;
  page.value = null;

  try {
    const returned = await contentStore.loadLessonContent(
      props.study,
      props.languageCodeHL,
      languageCodeJF,
      props.lesson
    );

    // If the service returns data, use it.
    // If it only cached to the store, read it back from the store.
    page.value =
      returned ||
      contentStore.lessonContentFor(
        props.study,
        props.languageCodeHL,
        languageCodeJF,
        props.lesson
      ) ||
      null;

    if (!page.value) {
      error.value = "Lesson content was not available.";
    }
  } catch (e) {
    error.value = "Could not load lesson content.";
  } finally {
    loading.value = false;
  }
}

const title = computed(() => {
  const p = page.value;
  return p && typeof p.title === "string" ? p.title : "";
});

const introLines = computed(() => {
  const p = page.value;
  return p && Array.isArray(p.intro) ? p.intro : [];
});

const segments = computed(() => {
  const p = page.value;
  return p && Array.isArray(p.text_segments) ? p.text_segments : [];
});

const question = computed(() => {
  const p = page.value;
  return p && typeof p.question === "string" ? p.question : "";
});

const further = computed(() => {
  const p = page.value;
  return p && Array.isArray(p.further_reading) ? p.further_reading : [];
});

async function reload() {
  await loadLessonContent();
}

onMounted(reload);
watch(
  () => [props.study, props.lesson, props.languageCodeHL],
  () => {
    reload();
  }
);
</script>

<template>
  <div>
    <div v-if="loading" class="q-mb-md">Loading</div>

    <div v-else-if="error" class="text-negative q-mb-md">
      {{ error }}
    </div>

    <div v-else-if="page">
      <h2 class="q-mt-none q-mb-sm">
        {{ title }}
      </h2>

      <p v-for="(line, i) in introLines" :key="'intro-' + i" class="q-mb-sm">
        {{ line }}
      </p>

      <div v-for="(s, i) in segments" :key="'seg-' + i" class="q-mb-md">
        <div class="text-subtitle1 q-mb-xs">
          {{ s && typeof s.label === "string" ? s.label : "" }}
        </div>

        <p
          v-for="(ln, j) in s && Array.isArray(s.lines) ? s.lines : []"
          :key="'seg-' + i + '-ln-' + j"
          class="q-mb-sm"
        >
          {{ ln }}
        </p>
      </div>

      <div v-if="question" class="q-mt-lg">
        <div class="text-subtitle1 q-mb-xs">Question</div>
        <p class="q-mb-none">
          {{ question }}
        </p>
      </div>

      <div v-if="further.length" class="q-mt-md">
        <div class="text-subtitle1 q-mb-xs">Further reading</div>
        <ul class="q-mb-none">
          <li v-for="(r, i) in further" :key="'ref-' + i">
            {{ r }}
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>
