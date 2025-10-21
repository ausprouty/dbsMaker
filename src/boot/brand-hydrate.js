/* eslint-disable no-undef */
// src/boot/brand-hydrate.js
import { boot } from "quasar/wrappers";
import { useSettingsStore } from "src/stores/SettingsStore";

function readInlineSiteMeta() {
  try {
    if (typeof document === "undefined") return null;
    const el = document.getElementById("__SITE_META__");
    if (el?.textContent) return JSON.parse(el.textContent);
  } catch (e) {
    console.warn("[brand-hydrate] bad __SITE_META__ JSON", e);
  }
  return null;
}

function readGlobalSiteMeta() {
  try {
    if (typeof window !== "undefined" && "__SITE_META__" in window) {
      return window.__SITE_META__;
    }
  } catch {}
  return null;
}

export default boot(async () => {
  const store = useSettingsStore();

  // Skip if already set
  const current = (store.brandTitle || "").trim();
  if (current) {
    console.log("[brand-hydrate] brandTitle already set →", current);
    return;
  }

  const envTitle = String(
    import.meta.env.VITE_APP_TITLE || import.meta.env.VITE_TITLE || ""
  ).trim();

  // Prefer inline <script id="__SITE_META__">…</script>
  const meta = readInlineSiteMeta() || readGlobalSiteMeta();
  const injectedTitle = String(
    meta?.title || meta?.env?.VITE_APP_TITLE || meta?.env?.VITE_TITLE || ""
  ).trim();

  const title = envTitle || injectedTitle || "App";

  console.log(
    "[brand-hydrate] envTitle:", envTitle,
    "| injectedTitle:", injectedTitle,
    "| chosen:", title
  );

  if (typeof store.setBrandTitle === "function") {
    store.setBrandTitle(title);
  } else {
    store.brandTitle = title;
  }

  if (typeof document !== "undefined" && document.title !== title) {
    document.title = title;
  }

  if (!envTitle && !injectedTitle) {
    console.warn("[brand-hydrate] no title found; used default");
  }

  if (typeof store.markHydrated === "function") {
    store.markHydrated("brand");
  } else {
    try { store.hydration = { ...(store.hydration || {}), brand: true }; } catch {}
  }
});
