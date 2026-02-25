<script setup>
import { computed, onMounted, watchEffect, watch, ref } from "vue";
import { useContentStore } from "src/stores/ContentStore";

const props = defineProps({
  study: { type: String, required: true },
  lesson: { type: Number, required: true },
  languageCodeHL: { type: String, default: "eng00" },
  languageCodeJF: { type: Number, default: 529 },
  commonContent: { type: Object, default: null },
  lessonKey: { type: String, default: null }, // for forcing remount if needed
});

const contentStore = useContentStore();

const loading = ref(false);
const error = ref(null);

// Keep both: what the service returned *and* what is in the store.
const returnedPage = ref(null);

// ---- Debugging state ----
const debug = ref({
  reqId: 0,
  lastStartedAt: null,
  lastFinishedAt: null,
  args: null,
  returnedType: null,
  returnedKeys: null,
  storeHadValue: null,
  storeKeys: null,
  error: null,
  storeLookupError: null, // <-- add this
});

function nowIso() {
  try {
    return new Date().toISOString();
  } catch (e) {
    return "";
  }
}

function safeKeys(obj) {
  if (!obj || typeof obj !== "object") return null;
  try {
    return Object.keys(obj);
  } catch (e) {
    return null;
  }
}

function describeError(e) {
  if (!e) return { message: "Unknown error" };

  const out = {
    message: e.message || String(e),
    name: e.name,
    stack: e.stack,
  };

  // If the store throws Axios-ish errors, these help a lot.
  if (e.response) {
    out.httpStatus = e.response.status;
    out.httpStatusText = e.response.statusText;
    out.httpData = e.response.data;
  }
  if (e.request) {
    out.hasRequest = true;
  }
  if (e.config) {
    out.httpMethod = e.config.method;
    out.httpUrl = e.config.url;
    out.httpParams = e.config.params;
  }

  return out;
}

// Store lookup state (kept OUT of computed to avoid side effects)
const storeLookupError = ref(null);
const pageFromStoreValue = ref(null);

watchEffect(() => {
  // re-run whenever any reactive used below changes:
  // props.study, props.languageCodeHL, props.lesson, or store state touched by lessonContentFor
  try {
    storeLookupError.value = null;
    pageFromStoreValue.value =
      contentStore.lessonContentFor(
        props.study,
        props.languageCodeHL,
        languageCodeJF,
        props.lesson
      ) || null;
  } catch (e) {
    storeLookupError.value = describeError(e);
    pageFromStoreValue.value = null;
  }
  // Mirror into debug for UI visibility (no mutation inside computed)
  debug.value.storeLookupError = storeLookupError.value;
});

const pageFromStore = computed(() => pageFromStoreValue.value);

// The page we will render: prefer store (reactive), else service return (one-off).
const page = computed(() => {
  return pageFromStore.value || returnedPage.value || null;
});

async function loadLessonContent() {
  const myReqId = debug.value.reqId + 1;
  debug.value.reqId = myReqId;

  loading.value = true;
  error.value = null;
  returnedPage.value = null;
  debug.value.storeLookupError = null;
  debug.value.lastStartedAt = nowIso();
  debug.value.lastFinishedAt = null;
  debug.value.error = null;
  debug.value.args = {
    study: props.study,
    languageCodeHL: props.languageCodeHL,
    languageCodeJF,
    lesson: props.lesson,
  };
  debug.value.returnedType = null;
  debug.value.returnedKeys = null;
  debug.value.storeHadValue = null;
  debug.value.storeKeys = null;

  console.log("[PrebuiltLessonFramework] loadLessonContent start", {
    reqId: myReqId,
    ...debug.value.args,
  });

  try {
    const returned = await contentStore.loadLessonContent(
      props.study,
      props.languageCodeHL,
      languageCodeJF,
      props.lesson
    );

    // If another request started after this one, ignore this result.
    if (debug.value.reqId !== myReqId) {
      console.warn("[PrebuiltLessonFramework] stale result ignored", {
        reqId: myReqId,
        currentReqId: debug.value.reqId,
      });
      return;
    }

    debug.value.returnedType = returned === null ? "null" : typeof returned;
    debug.value.returnedKeys = safeKeys(returned);

    console.log("[PrebuiltLessonFramework] loadLessonContent returned", {
      reqId: myReqId,
      returned,
      returnedType: debug.value.returnedType,
      returnedKeys: debug.value.returnedKeys,
    });

    // Keep whatever the service returned (if anything).
    returnedPage.value = returned || null;

    // Immediately inspect what is in the store *right now*.
    const fromStoreNow = pageFromStore.value;
    debug.value.storeHadValue = !!fromStoreNow;
    debug.value.storeKeys = safeKeys(fromStoreNow);

    console.log("[PrebuiltLessonFramework] store lookup after load", {
      reqId: myReqId,
      storeHadValue: debug.value.storeHadValue,
      storeKeys: debug.value.storeKeys,
      fromStoreNow,
    });

    if (!page.value) {
      error.value = "Lesson content was not available.";
    }
  } catch (e) {
    // If another request started after this one, ignore the error too.
    if (debug.value.reqId !== myReqId) {
      console.warn("[PrebuiltLessonFramework] stale error ignored", {
        reqId: myReqId,
        currentReqId: debug.value.reqId,
      });
      return;
    }

    const details = describeError(e);
    debug.value.error = details;

    console.error("[PrebuiltLessonFramework] loadLessonContent error", {
      reqId: myReqId,
      details,
      raw: e,
    });

    // Keep the user-facing message simple but consistent.
    error.value = "Could not load lesson content.";
  } finally {
    if (debug.value.reqId === myReqId) {
      debug.value.lastFinishedAt = nowIso();
      loading.value = false;
    }
  }
}

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

// ---- Render helpers (your current schema assumptions) ----
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
</script>

<template>
  <div>
    <!-- Debug panel -->
    <div
      class="q-pa-sm q-mb-md"
      style="border: 1px solid #ddd; border-radius: 8px"
    >
      <div class="text-subtitle2 q-mb-xs">Debug</div>
      <div class="text-caption">
        <div><strong>reqId:</strong> {{ debug.reqId }}</div>
        <div><strong>started:</strong> {{ debug.lastStartedAt }}</div>
        <div><strong>finished:</strong> {{ debug.lastFinishedAt }}</div>
        <div class="q-mt-xs">
          <strong>args:</strong>
          <pre style="margin: 6px 0 0 0; white-space: pre-wrap">{{
            debug.args
          }}</pre>
        </div>
        <div class="q-mt-xs">
          <strong>returnedType:</strong> {{ debug.returnedType }}
          <span v-if="debug.returnedKeys">
            | <strong>returnedKeys:</strong> {{ debug.returnedKeys }}</span
          >
        </div>
        <div class="q-mt-xs">
          <strong>storeHadValue:</strong> {{ debug.storeHadValue }}
          <span v-if="debug.storeKeys">
            | <strong>storeKeys:</strong> {{ debug.storeKeys }}</span
          >
        </div>
        <div v-if="debug.error" class="q-mt-xs">
          <strong>error details:</strong>
          <pre style="margin: 6px 0 0 0; white-space: pre-wrap">{{
            debug.error
          }}</pre>
        </div>
      </div>
    </div>

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
