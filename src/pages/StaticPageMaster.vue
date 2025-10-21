<script setup>
import { ref, computed, watch, onMounted } from "vue";
import { useRoute } from "vue-router";

const route = useRoute();

const base = (import.meta.env && import.meta.env.BASE_URL) || "/";

const loading = ref(true);
const notFound = ref(false);
const errorMsg = ref("");
const html = ref("");
console.log (route.params.page);

const pageSlug = computed(() => String(route.params.page || "").trim());

function join() {
  const parts = Array.from(arguments).filter(Boolean).map(String);
  let out = parts
    .map((p, i) =>
      i === 0 ? p.replace(/\/+$/, "") : p.replace(/^\/+|\/+$/g, "")
    )
    .join("/");
  if (!out.startsWith("/")) out = "/" + out;
  return out;
}

const menuUrl = computed(() => join(base, "config", "menu.json"));
console.log(menuUrl.value);
const contentUrl = computed(() =>
  join(base, "content", `${pageSlug.value}.html`)
);
console.log(contentUrl.value);

function normRoute(r) {
  if (!r) return "";
  let s = String(r);
  if (!s.startsWith("/")) s = "/" + s;
  return s.replace(/\/+$/, ""); // strip trailing slash
}

async function loadPage() {
  console.log("loadPage from StaticPageMaster");
  loading.value = true;
  notFound.value = false;
  errorMsg.value = "";
  html.value = "";

  const slug = pageSlug.value;
  if (!slug) {
    notFound.value = true;
    loading.value = false;
    return;
  }

  try {

    const m = await fetch(menuUrl.value, { cache: "no-store" });
    if (!m.ok) throw new Error(`menu.json (${m.status})`);
    const items = await m.json(); // [{ key, title, image, route, maxLessons }, ...]

    const wanted = normRoute(`/page/${slug}`);
    const exists =
      Array.isArray(items) &&
      items.some((it) => normRoute(it && it.route) === wanted);

    if (!exists) {
      notFound.value = true;
      loading.value = false;
      return;
    }
    const c = await fetch(contentUrl.value, { cache: "no-store" });
    if (!c.ok) throw new Error(`${slug}.html (${c.status})`);
    html.value = await c.text();
  } catch (e) {
    errorMsg.value = String(e && e.message ? e.message : e);
  } finally {
    loading.value = false;
  }
}

onMounted(loadPage);
watch(() => route.params.page, loadPage);
</script>

<template>
  <q-page padding class="q-pa-md">
    <div v-if="loading" class="q-my-xl flex flex-center">
      <q-spinner-dots size="32px" />
    </div>

    <q-banner
      v-else-if="notFound"
      class="bg-warning text-black q-mb-md"
      rounded
    >
      Sorry, that page isn’t in the menu for this site.
    </q-banner>

    <q-banner
      v-else-if="errorMsg"
      class="bg-negative text-white q-mb-md"
      rounded
    >
      {{ errorMsg }}
    </q-banner>

    <div v-else v-html="html" />
  </q-page>
</template>

<style scoped>
:deep(img) {
  max-width: 100%;
  height: auto;
}
</style>
