<script setup>
import { ref, provide, computed, onMounted, onBeforeUnmount, watch } from "vue";
import LanguageOptions from "src/components/Language/LanguageOptions.vue";
import ShareLink from "src/components/ShareLink.vue";
import { useContentStore } from "src/stores/ContentStore";
import { useInterfaceLocale } from "src/composables/useInterfaceLocale";
import { useLanguageRouting } from "src/composables/useLanguageRouting";
import { useSettingsStore } from "src/stores/SettingsStore";
import { useRoute, useRouter } from "vue-router";

const router = useRouter();
const route = useRoute();
const settingsStore = useSettingsStore();
const contentStore = useContentStore();

const { isRTL, applyInterfaceLanguageToWebpage } = useInterfaceLocale();
const isRtl = computed(() => isRTL(settingsStore.languageObjectSelected));
console.log("isRTL =", isRTL);

const brandTitle = computed(() => settingsStore.brandTitle || "Not Set");

const rightDrawerOpen = ref(false);
function toggleRightDrawer() {
  rightDrawerOpen.value = !rightDrawerOpen.value;
}
function closeRightDrawer() {
  rightDrawerOpen.value = false;
}

// make toggler available to pages/components
provide("toggleRightDrawer", toggleRightDrawer);

const { changeLanguage } = useLanguageRouting(); // CHANGED: use composable
console.log("changeLanguage", changeLanguage);

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
    settingsStore.setLanguageObjectSelected(languageObject);
    // 2) Ensure interface bundle is loaded for this HL
    await contentStore.loadInterface(hl);
    // 3) Apply i18n + <html lang|dir>
    applyInterfaceLanguageToWebpage(languageObject);
    // 4) Update the URL (guarded internally to avoid no-ops/loops)
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
    siteMeta = globalThisettingsStore.__SITE_META__;
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
onMounted(() => {
  window.addEventListener("scroll", onScroll, { passive: true });
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
.toolbar-title {
  color: inherit;
  text-decoration: none;
  font-size: 1.5rem;
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
.q-toolbar__title {
  font-size: 16px;
}
.toolbar-width,
.page-width {
  width: 100%;
  max-width: 1000px;
  margin: 0 auto;
}
</style>
