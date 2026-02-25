<script setup>
import { ref, provide, computed, onMounted, onBeforeUnmount, watch } from "vue";
import LanguageOptions from "src/components/Language/TextLanguageOptions.vue";
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

// Hide language picker entirely when VITE_LANG_PICKER_TYPE=none
const langPickerType = String(
  import.meta.env.VITE_LANG_PICKER_TYPE || ""
).trim();
const showLangPicker = computed(() => {
  return langPickerType.toLowerCase() !== "none";
});

const { isRTL, applyInterfaceLanguageToWebpage } = useInterfaceLocale();
const { locale } = useI18n();
const isRtl = computed(() => {
  const obj = settingsStore.textLanguageObjectSelected;
  return obj && obj.languageDirection === "rtl";
});

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

provide("openLanguageSelect", openLanguageSelect);
function openLanguageSelect() {
  if (!showLangPicker.value) {
    return;
  }
  openRightDrawer();
}

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

watch(showLangPicker, function (show) {
  if (!show) rightDrawerOpen.value = false;
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
          v-if="showLangPicker"
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
      v-if="showLangPicker"
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
/* Base appbar */
.appbar {
  /* defaults (used if a class forgets to set them) */
  --appbar-bg: var(--color-surface);
  --appbar-fg: var(--color-text);
  --appbar-border: transparent;

  background: var(--appbar-bg);
  color: var(--appbar-fg);
  transition: background 120ms ease, color 120ms ease, box-shadow 120ms ease;
}

/* --- Responsive app title: wraps + shrinks on small screens --- */
/* Override Quasar's default nowrap/ellipsis on the title container */
.appbar .q-toolbar__title {
  white-space: normal !important;
  overflow: visible;
  line-height: 1.15;
  min-width: 0; /* important in flex toolbars so wrapping can occur */
  padding-right: 8px;
}

/* Two-line clamp for the link text */
.appbar .toolbar-title {
  flex: 1 1 auto;
  min-width: 0; /* important in flex rows */
  overflow: hidden;

  white-space: normal;
  word-break: break-word;
  line-height: 1.15;
  max-height: calc(2 * 1.15em);
}

@media (max-width: 600px) {
  .appbar .toolbar-title {
    font-size: 1.1rem;
  }
}

@media (max-width: 360px) {
  .appbar .toolbar-title {
    font-size: 1rem;
  }
}

/* Variants only set variables */
.appbar--surface {
  --appbar-bg: var(--color-surface);
  --appbar-fg: var(--color-text);
  --appbar-border: var(--color-border);
  border-bottom: 1px solid var(--appbar-border);
}

.appbar--primary {
  --appbar-bg: var(--color-primary);
  --appbar-fg: var(--color-on-primary);
}

.appbar--transparent {
  --appbar-bg: color-mix(in srgb, var(--color-surface) 75%, transparent);
  --appbar-fg: var(--color-text);
  --appbar-border: color-mix(in srgb, var(--color-border) 50%, transparent);

  backdrop-filter: blur(6px);
  border-bottom: 1px solid var(--appbar-border);
}

/* One underline rule */
.appbar::after {
  content: "";
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 3px;
  background: var(--q-secondary);
  opacity: 0.95;
  pointer-events: none;
  box-shadow: 0 1px 0 rgba(0, 0, 0, 0.25);
}

/* Make the title look like header text, not a browser link */
.toolbar-title,
.toolbar-title:link,
.toolbar-title:visited,
.toolbar-title:hover,
.toolbar-title:focus,
.toolbar-title:active {
  color: var(--appbar-fg);
  text-decoration: none;
}

/* Optional: a subtle hover cue */
.toolbar-title:hover {
  text-decoration: underline;
  text-decoration-thickness: 2px;
  text-underline-offset: 3px;
}
</style>
