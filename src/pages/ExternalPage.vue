<script setup>
import { computed, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

const route = useRoute();
const router = useRouter();

const allowList = [
  'everyperson.com',
  'www.everyperson.com',
  'everystudent.com',
  'www.everystudent.com',
  'docs.google.com',
];

function isHttps(u) {
  try { return new URL(u).protocol === 'https:'; } catch { return false; }
}
function isAllowed(u) {
  try {
    const host = new URL(u).hostname.toLowerCase();
    return allowList.some(d => host === d || host.endsWith('.' + d));
  } catch { return false; }
}

// Pull from ?url=… first; else from /ask/:raw(.*) and add https:// if missing
const rawFromQuery = computed(() => String(route.query.url || '').trim());
const rawFromPath  = computed(() => String(route.params.raw || '').trim());

function normalizeToHttps(u) {
  if (!u) return '';
  return /^https?:\/\//i.test(u) ? u : `https://${u}`;
}

const rawUrl = computed(() => {
  // Prefer query if present; otherwise use path
  return rawFromQuery.value
    ? normalizeToHttps(rawFromQuery.value)
    : normalizeToHttps(rawFromPath.value);
});

const safeUrl = computed(() => {
  const u = rawUrl.value;
  if (!u) return '';
  if (!isHttps(u)) return '';
  if (!isAllowed(u)) return '';
  return u;
});

const hostLabel = computed(() => {
  try { return safeUrl.value ? new URL(safeUrl.value).hostname : ''; }
  catch { return ''; }
});

const opened = ref(false);
function openForm() {
  if (!safeUrl.value) return;
  window.open(safeUrl.value, '_blank', 'noopener');
  opened.value = true;
}
function goBack() { router.back(); }
</script>


<template>
  <q-page class="q-pa-md">
    <div class="page-width">
      <div v-if="safeUrl">
        <h2>
          You will find this resource at {{ hostLabel }}
        </h2>
        <p>
          We’ll open the page in a new browser tab so your place here is
          preserved. When you’re done, just return to this tab.
        </p>

        <div class="row items-center q-gutter-sm q-mt-sm">
          <q-btn
            label="Open Form in New Tab"
            color="primary"
            unelevated
            @click="openForm"
          />
          <q-btn
            label="Go Back"
            color="primary"
            outline
            @click="goBack"
          />
        </div>

        <div v-if="opened" class="text-positive q-mt-md">
          The form was opened in a new tab.
        </div>
      </div>

      <div v-else>
        <div class="text-negative q-mb-md">
          Sorry, that link is missing or not allowed.
        </div>
        <q-btn
          label="Go Back"
          color="primary"
          outline
          @click="goBack"
        />
      </div>
    </div>
  </q-page>
</template>

<style scoped>
</style>
