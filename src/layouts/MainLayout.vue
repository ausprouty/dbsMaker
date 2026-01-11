<script setup>
import { ref, provide, computed, onMounted, onBeforeUnmount, watch } from "vue";
import LanguageOptions from "src/components/Language/LanguageOptions.vue";
import ShareLink from "src/components/ShareLink.vue";
import SeasonalHeader from "src/components/Seasonal/SeasonalHeader.vue";
import { useContentStore } from "src/stores/ContentStore";
import { useInterfaceLocale } from "src/composables/useInterfaceLocale";
import { useLanguageRouting } from "src/composables/useLanguageRouting";
import { useSeasonalService } from "src/services/SeasonalService";
import { useSettingsStore } from "src/stores/SettingsStore";
import { normId } from "src/utils/normalize";
import { useRoute } from "vue-router";
import { useI18n } from "vue-i18n";

const route = useRoute();
const settingsStore = useSettingsStore();
const contentStore = useContentStore();
const app = normId(import.meta.env.VITE_APP) || "default";

const { isRTL, applyInterfaceLanguageToWebpage } = useInterfaceLocale();
const { locale } = useI18n();
const isRtl = computed(() => isRTL(settingsStore.textLanguageObjectSelected));
console.log("isRtl =", isRtl.value);

const brandTitle = computed(() => settingsStore.brandTitle || "Not Set");

const rightDrawerOpen = ref(false);

function toggleRightDrawer() {
  rightDrawerOpen.value = !rightDrawerOpen.value;
}
function closeRightDrawer() {
  rightDrawerOpen.value = false;
}
function openRightDrawer() {
  rightDrawerOpen.value = true;
}

function openLanguageSelect() {
  openRightDrawer();
}

provide("openLanguageSelect", openLanguageSelect);

// make seasonal content available to pages/components
const { ensureSeasonalValid, refreshSeasonal } = useSeasonalService();

async function loadSeasonalIfNeeded() {
  ensureSeasonalValid();
  if (!settingsStore.seasonalContent) {
    const obj = settingsStore.textLanguageObjectSelected || null;
    const lang =
      String(
        obj && obj.languageCodeGoogle ? obj.languageCodeGoogle : "en"
      ).trim() || "en";
    await refreshSeasonal(app, lang);
  }
}

// watch for language changes
const { changeLanguage } = useLanguageRouting();
console.log("changeLanguage", changeLanguage);

// Keep vue-i18n + <html lang|dir> in sync with the selected language.
// Watch only HL (string) to avoid re-running when unrelated props change.
const selectedHL = computed(() => {
  const obj = settingsStore.textLanguageObjectSelected || null;
  const hl = obj && obj.languageCodeHL ? String(obj.languageCodeHL) : "";
  return hl.trim();
});

let lastLangReq = 0;

watch(
  selectedHL,
  async (hl) => {
    if (!hl) return;

    const reqId = ++lastLangReq;

    const langObj = settingsStore.textLanguageObjectSelected || null;
    const google =
      String(
        langObj && langObj.languageCodeGoogle
          ? langObj.languageCodeGoogle
          : "en"
      ).trim() || "en";

    applyInterfaceLanguageToWebpage(langObj);

    // Start all in parallel
    const interfacePromise = contentStore.loadInterface(hl);
    const siteContentPromise = contentStore.loadSiteContent(hl);
    const seasonalPromise = refreshSeasonal(app, google);

    // Wait for interface first, then set locale
    try {
      await interfacePromise;
    } catch (err) {
      console.warn("[MainLayout] loadInterface failed for", hl, err);
    }

    // If another language change happened, stop here (do not apply effects)
    if (reqId !== lastLangReq) return;

    if (locale.value !== hl) locale.value = hl;

    // Let the others finish, but do not throw if they fail
    const settled = await Promise.allSettled([
      siteContentPromise,
      seasonalPromise,
    ]);

    // If another change happened while waiting, ignore logs/effects
    if (reqId !== lastLangReq) return;

    if (settled[0].status === "rejected") {
      console.warn(
        "[MainLayout] loadSiteContent failed for",
        hl,
        settled[0].reason
      );
    }
    if (settled[1].status === "rejected") {
      console.warn("[Seasonal] refreshSeasonal failed:", settled[1].reason);
    }
  },
  { immediate: true }
);

async function handleLanguageSelect(languageObject) {
  console.log("MainLayout handleLanguageSelect →", languageObject);
  const hl = String(languageObject?.languageCodeHL || "");
  const jf = String(languageObject?.languageCodeJF || "");
  if (!hl || !jf) {
    console.warn("[lang] missing HL/JF, abort");
    return;
  }

  try {
    // 1) Persist selection (MRU etc.)
    settingsStore.setTextLanguageObjectSelected(languageObject);
    // 2) Update the URL (guarded internally to avoid no-ops/loops).
    //    The watcher above will handle loadInterface + locale + html dir/lang.
    await changeLanguage(hl, jf);
  } catch (e) {
    console.warn("MainLayout switch failed:", e);
  } finally {
    console.log("MainLayout closing drawer");
    closeRightDrawer();
  }
}
provide("handleLanguageSelect", handleLanguageSelect); // expose for inject-usage

// Guarded key: safe even if route is temporarily undefined during HMR/boot
const routeFullPathKeyRef = computed(function () {
  try {
    return route && typeof route.fullPath === "string" ? route.fullPath : "";
  } catch (_e) {
    return "";
  }
});

watch(routeFullPathKeyRef, function () {
  rightDrawerOpen.value = false;
});

const appbarStyle = computed(function () {
  // Prefer route.meta.appbar if present
  try {
    if (route && route.meta && route.meta.appbar != null) {
      return route.meta.appbar;
    }
  } catch (_e) {}
  // Fallback: global site meta
  var siteMeta;
  try {
    siteMeta = globalThis.__SITE_META__;
  } catch (_e) {
    siteMeta = null;
  }
  if (siteMeta && siteMeta.appbar && siteMeta.appbar.style != null) {
    return siteMeta.appbar.style;
  }
  return "surface";
});

const appbarClass = computed(() => ({
  "appbar--surface": appbarStyle.value === "surface",
  "appbar--primary": appbarStyle.value === "primary",
  "appbar--transparent": appbarStyle.value === "transparent",
}));

const scrolled = ref(false);
function onScroll() {
  scrolled.value = window.scrollY > 2;
}
onMounted(async () => {
  window.addEventListener("scroll", onScroll, { passive: true });
  await loadSeasonalIfNeeded();
});
onBeforeUnmount(() => {
  window.removeEventListener("scroll", onScroll);
});

const actionBtnColor = computed(() =>
  appbarStyle.value === "primary" ? "white" : "primary"
);
</script>

<template>
  <q-layout
    view="lHh lpr lFf"
    :dir="isRtl ? 'rtl' : 'ltr'"
    :class="{ 'rtl-mode': isRtl }"
  >
    <q-header
      :elevated="appbarStyle === 'surface' || scrolled"
      class="appbar"
      :class="appbarClass"
    >
      <q-toolbar>
        <q-btn flat dense round icon="menu" aria-label="Menu" to="/index" />

        <q-toolbar-title>
          <router-link to="/index" class="toolbar-title">
            {{ brandTitle }}
          </router-link>
        </q-toolbar-title>

        <q-space />
        <ShareLink />

        <q-btn
          flat
          dense
          round
          icon="language"
          :color="actionBtnColor"
          aria-label="Language selector"
          @click="toggleRightDrawer"
        />
      </q-toolbar>
    </q-header>

    <q-drawer
      side="right"
      v-model="rightDrawerOpen"
      overlay
      elevated
      :width="320"
    >
      <!-- CHANGED: listen for select; the component will emit a full lang object -->
      <LanguageOptions @select="handleLanguageSelect" />
    </q-drawer>

    <q-page-container>
      <SeasonalHeader class="q-mb-md" />
      <router-view />
    </q-page-container>
  </q-layout>
</template>

<style>
.appbar {
  background: var(--appbar-bg);
  color: var(--appbar-fg);
  transition: background 120ms ease, color 120ms ease, box-shadow 120ms ease;
}
.appbar--surface {
  --appbar-bg: var(--color-surface);
  --appbar-fg: var(--color-text);
  border-bottom: 1px solid var(--color-border);
}
.appbar--primary {
  --appbar-bg: var(--color-primary);
  --appbar-fg: var(--color-on-primary);
}
.appbar--transparent {
  --appbar-bg: color-mix(in srgb, var(--color-surface) 75%, transparent);
  --appbar-fg: var(--color-text);
  backdrop-filter: blur(6px);
  border-bottom: 1px solid
    color-mix(in srgb, var(--color-border) 50%, transparent);
}

.footer {
  background-color: darkgrey;
  color: white;
  padding: 10px;
  text-align: center;
  width: 100%;
  margin: 0 auto;
}
h2 {
  font-size: 2rem;
}

.toolbar-width,
.page-width {
  width: 100%;
  max-width: 1000px;
  margin: 0 auto;
}
/* --- Responsive app title: wraps + shrinks on small screens --- */

/* Let the Quasar title area actually wrap */
.q-toolbar__title {
  white-space: normal !important; /* override Quasar nowrap */
  overflow: visible; /* avoid clipping */
  line-height: 1.15;
  padding-right: 8px; /* a little breathing room */
}

/* Make the router-link behave like a two-line title */
.q-toolbar__title {
  white-space: normal !important;
  line-height: 1.15;
}

.toolbar-title {
  color: inherit;
  text-decoration: none;

  display: -webkit-box;
  -webkit-box-orient: vertical;
  overflow: hidden;

  /* 2-line clamp (WebKit/Blink) */
  -webkit-line-clamp: 2;

  /* helpful wrapping behaviour */
  word-break: break-word;
  line-height: 1.15;
}

/* Smaller screens: reduce font and keep 2-line clamp */
@media (max-width: 600px) {
  .toolbar-title {
    font-size: 1.1rem;
  }
}

/* Very small screens: slightly smaller again */
@media (max-width: 360px) {
  .toolbar-title {
    font-size: 1rem;
  }
}
</style>
