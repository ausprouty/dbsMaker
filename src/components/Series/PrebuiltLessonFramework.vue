<script setup>
import { computed, watch, ref } from "vue";
import { useContentStore } from "src/stores/ContentStore";
import { getPassage } from "src/services/PassageLoaderService";

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
const passageOpen = ref(false);
const passageItem = ref(null);
const passageError = ref("");

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

let loadingSeq = 0;

async function loadLessonContent() {
  const seq = (loadingSeq += 1);

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

    if (seq !== loadingSeq) return; // newer request won
    returnedPage.value = returned || null;

    if (!page.value) {
      error.value = "Lesson content was not available.";
    }
  } catch (e) {
    if (seq !== loadingSeq) return;
    error.value = "Could not load lesson content.";
  } finally {
    if (seq === loadingSeq) {
      loading.value = false;
    }
  }
}

async function prefetchFurtherReading() {
  const list = further.value || [];
  if (!list.length) return;

  for (let i = 0; i < list.length; i += 1) {
    const entry = list[i];
    if (!entry) continue;
    try {
      await getPassage({
        entry,
        languageCodeHL: props.languageCodeHL,
      });
    } catch (e) {}
  }
}

async function openPassage(entry) {
  passageError.value = "";
  passageItem.value = null;
  passageOpen.value = true;
  console.log("[FurtherReading click] raw entry:", entry);

  console.log("[FurtherReading click] hl:", props.languageCodeHL);

  try {
    const rec = await getPassage({
      entry,
      languageCodeHL: props.languageCodeHL,
    });
    passageItem.value = rec || null;
    if (!rec || rec.error) {
      passageError.value =
        rec && rec.error ? rec.error : "Passage not available.";
    }
  } catch (e) {
    passageError.value = "Passage not available.";
  }
}

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
  },
  { immediate: true }
);

watch(
  () => props.languageCodeHL + "|" + JSON.stringify(further.value || []),
  () => {
    if (further.value && further.value.length) {
      prefetchFurtherReading();
    }
  },
  { immediate: true }
);

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
            <button type="button" class="further-link" @click="openPassage(r)">
              {{ r }}
            </button>
          </li>
        </ul>
      </div>
    </div>
    <q-dialog v-model="passageOpen">
      <q-card style="max-width: 900px; width: 92vw">
        <q-card-section class="text-h6">
          {{
            passageItem && passageItem.ref
              ? passageItem.ref
              : passageItem && passageItem.entry
              ? passageItem.entry
              : ""
          }}
        </q-card-section>
        <q-card-section>
          <div v-if="passageError" class="text-negative">
            {{ passageError }}
          </div>
          <div
            v-else-if="passageItem && passageItem.text"
            v-html="passageItem.text"
          />
          <div v-else>Loading</div>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Close" v-close-popup />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </div>
</template>

<style scoped>
.lesson {
  color: var(--prebuilt-body-color, var(--color-text));
  font-family: var(--prebuilt-body-font, "Open Sans", sans-serif);
  font-size: var(--prebuilt-body-size, 1rem);
  line-height: var(--prebuilt-body-line-height, 1.7);
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
    var(--prebuilt-section-color, var(--q-accent)) 92%,
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
  color: var(--prebuilt-further-color, var(--color-secondary));
}

.further-link {
  appearance: none;
  background: transparent;
  border: 0;
  padding: 0;
  cursor: pointer;
  text-align: left;
  color: var(--prebuilt-body-color, var(--color-text));
  text-decoration: underline;
  text-underline-offset: 3px;
}

.further-link:hover {
  opacity: 0.85;
}
</style>
