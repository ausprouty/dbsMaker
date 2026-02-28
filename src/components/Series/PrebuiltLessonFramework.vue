<script setup>
import { computed, onMounted, watch, ref } from "vue";
import { useContentStore } from "src/stores/ContentStore";

const props = defineProps({
  study: { type: String, required: true },
  lesson: { type: Number, required: true },
  languageCodeHL: { type: String, default: "eng00" },
  languageCodeJF: { type: Number, default: 529 },
  commonContent: { type: Object, default: null },
  lessonKey: { type: String, default: null },
});

const contentStore = useContentStore();

const loading = ref(false);
const error = ref(null);
const returnedPage = ref(null);

const pageFromStore = computed(() => {
  try {
    return (
      contentStore.lessonContentFor(
        props.study,
        props.languageCodeHL,
        props.languageCodeJF,
        props.lesson
      ) || null
    );
  } catch (e) {
    return null;
  }
});

const page = computed(() => {
  return pageFromStore.value || returnedPage.value || null;
});

async function loadLessonContent() {
  loading.value = true;
  error.value = null;
  returnedPage.value = null;

  try {
    const returned = await contentStore.loadLessonContent(
      props.study,
      props.languageCodeHL,
      props.languageCodeJF,
      props.lesson
    );

    returnedPage.value = returned || null;

    if (!page.value) {
      error.value = "Lesson content was not available.";
    }
  } catch (e) {
    error.value = "Could not load lesson content.";
  } finally {
    loading.value = false;
  }
}

onMounted(loadLessonContent);

watch(
  () => [
    props.study,
    props.lesson,
    props.languageCodeHL,
    props.languageCodeJF,
    props.lessonKey,
  ],
  () => {
    loadLessonContent();
  }
);

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

function safeStr(v) {
  return typeof v === "string" ? v : "";
}

function iconName(raw) {
  const s = safeStr(raw).trim();
  if (!s) return "";
  if (s.startsWith("mdi-")) return s;
  if (s.startsWith("o_") || s.startsWith("img:") || s.startsWith("svguse:"))
    return s;
  return s;
}

function markerClass(marker) {
  const m = safeStr(marker).trim().toLowerCase();
  return m ? `marker-${m}` : "";
}
</script>

<template>
  <div class="lesson">
    <div v-if="loading" class="q-mb-md">Loading</div>

    <div v-else-if="error" class="text-negative q-mb-md">
      {{ error }}
    </div>

    <div v-else-if="page">
      <h2 class="lesson-title q-mt-none q-mb-sm">
        {{ title }}
      </h2>

      <div v-if="introLines.length" class="intro-ellipse q-mb-md">
        <p v-for="(line, i) in introLines" :key="'intro-' + i" class="q-mb-sm">
          {{ line }}
        </p>
      </div>

      <div v-for="(s, i) in segments" :key="'seg-' + i" class="segment q-mb-md">
        <div class="segment-header q-mb-xs segment-heading">
          <q-icon
            v-if="s && s.icon"
            :name="iconName(s.icon)"
            size="20px"
            class="segment-icon"
          />
          <div class="segment-label text-subtitle1">
            {{ s && typeof s.label === "string" ? s.label : "" }}
          </div>
        </div>

        <p
          v-for="(ln, j) in s && Array.isArray(s.lines) ? s.lines : []"
          :key="'seg-' + i + '-ln-' + j"
          class="q-mb-sm"
        >
          {{ ln }}
        </p>
      </div>

      <div v-if="question" class="question-ellipse q-mt-lg">
        <div class="question-title q-mb-xs">Question</div>
        <p class="q-mb-none">
          {{ question }}
        </p>
      </div>

      <div v-if="further.length" class="q-mt-md">
        <div class="further-title q-mb-xs">Further reading</div>
        <ul class="q-mb-none">
          <li v-for="(r, i) in further" :key="'ref-' + i">
            {{ r }}
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>

<style scoped>
.lesson {
  color: var(--prebuilt-body-color, var(--color-text));
  font-family: var(--prebuilt-body-font, "Open Sans", sans-serif);
  font-size: var(--prebuilt-body-size, 1rem);
  line-height: var(--prebuilt-body-line-height, 1.65);
  max-width: var(--prebuilt-body-max-width, 720px);
  font-size: 1.1rem;
}

.lesson-title {
  color: var(--prebuilt-page-title-color, var(--color-primary));
}
.segment-heading,
.question-title {
  color: var(--prebuilt-section-color, var(--q-accent));
}

.further-title {
  color: var(--prebuilt-further-color, var(--color-secondary));
}

/* Segment header layout */
.segment-header {
  display: flex;
  align-items: center;
  gap: 10px;
}
/* 1) Make section headers less dominant */
.segment-heading {
  color: color-mix(
    in srgb,
    var(--prebuilt-section-color, var(--q-accent)) 70%,
    var(--color-text)
  );
}

/* Make the icon match the header colour */
.segment-icon {
  color: currentColor;
  font-size: 18px !important; /* you currently pass size=20px */
  opacity: 0.85;
}

/* Intro ellipse */
.intro-ellipse {
  border: var(--prebuilt-intro-border-width, 2px) solid
    var(--prebuilt-intro-border-color, var(--color-secondary));
  background: var(--prebuilt-intro-bg, var(--color-neutral));
  border-radius: 9999px;
  padding: var(--prebuilt-intro-pad, 16px 18px);
}
.intro-ellipse p:last-child {
  margin-bottom: 0;
}

/* Remove old left bar */
.segment {
  padding: 0;
  border: none;
}

/* 2) Reduce label size + weight */
.segment-label {
  font-weight: 600; /* was 700 */
  font-size: 1rem; /* or 0.98rem */
  letter-spacing: 0.1px;
}

/* Question ellipse */
.question-ellipse {
  border: var(--prebuilt-intro-border-width, 2px) solid
    var(--prebuilt-intro-border-color, var(--color-secondary));
  background: var(--prebuilt-intro-bg, var(--color-neutral));
  border-radius: 9999px;
  padding: 14px 18px;
}

/* Further reading bigger */
.further-title {
  font-size: 1.15rem;
  font-weight: 800;
}

.prebuilt-banner {
  height: var(--prebuilt-banner-height, 160px);
  border-bottom: var(--prebuilt-banner-border-height, 2px) solid
    var(--prebuilt-banner-border-color, var(--color-secondary));
  border-radius: var(--prebuilt-banner-radius, 0px);
  background-image: var(--prebuilt-banner-image, none);
  background-position: var(--prebuilt-banner-position, center left);
  background-size: cover;
  background-repeat: no-repeat;
  overflow: hidden;
}

.prebuilt-banner__overlay {
  height: 100%;
  width: 100%;
  background: var(--prebuilt-banner-overlay);
  display: flex;
  align-items: flex-end;
  padding: 0 var(--prebuilt-banner-pad-x, 24px) 14px
    var(--prebuilt-banner-pad-x, 24px);
}

.prebuilt-banner__title {
  font-family: var(--prebuilt-title-font, "Georgia", serif);
  font-size: var(--prebuilt-title-size, 1.7rem);
  font-weight: var(--prebuilt-title-weight, 500);
  letter-spacing: var(--prebuilt-title-letter-spacing, 0.6px);
  line-height: var(--prebuilt-title-line-height, 1.2);
  color: var(--prebuilt-title-color, var(--color-neutral));
  text-shadow: var(--prebuilt-title-shadow, none);
  max-width: var(--prebuilt-banner-text-max-width, 900px);
}
</style>
