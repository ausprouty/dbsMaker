// src/boot/menu-hydrate.js
import { boot } from "quasar/wrappers";
import { useSettingsStore } from "src/stores/SettingsStore";

// Validate menu array items: { key: string, maxLessons?: number, ... }
function validateMenu(data) {
  if (!Array.isArray(data)) return null;
  const ok = [];
  for (const item of data) {
    if (!item || typeof item.key !== "string" || !item.key.trim()) continue;
    const o = { ...item, key: item.key.trim() };
    if (o.maxLessons != null) {
      const n = Number(o.maxLessons);
      if (Number.isInteger(n) && n > 0) o.maxLessons = n;
      else delete o.maxLessons;
    }
    ok.push(o);
  }
  return ok.length ? ok : null;
}

async function fetchFirst(urls) {
  for (const url of urls) {
    try {
      const res = await fetch(url, import.meta.env.DEV ? { cache: 'no-store' } : undefined);
      if (!res.ok) {
        console.warn('[menu-hydrate] fetch failed', res.status, url);
        continue;
      }

      const ct = (res.headers.get('content-type') || '').toLowerCase();
      if (!ct.includes('application/json')) {
        console.warn('[menu-hydrate] non-JSON response', ct || '(none)', url);
        // peek at first chars to help debug
        const head = (await res.text()).slice(0, 60);
        console.warn('[menu-hydrate] head:', head);
        continue;
      }

      return await res.json();
    } catch (e) {
      console.warn('[menu-hydrate] fetch error', url, e);
    }
  }
  return null;
}


export default boot(async () => {
  const store = useSettingsStore();
  store.normalizeShapes?.();

  // Skip if already hydrated and non-empty
  if (Array.isArray(store.menu) && store.menu.length > 0) {
    store.menuStatus = "ready";
    if (typeof store.markHydrated === "function") store.markHydrated("menu");
    else store.hydration = { ...(store.hydration || {}), menu: true };
    return;
  }

  store.menuStatus = "loading";
  store.menuError = null;

  const base = (import.meta.env.BASE_URL || "/").replace(/\/+$/, "/");
  const site = String(import.meta.env.VITE_APP || "default");
  const ver = String(import.meta.env.VITE_APP_VERSION || "dev");

  // Try site-specific path first if you serve per-site assets, then fall back
  const urls = [
    `${base}config/menu.json?v=${ver}`,
    `${base}menu.json?v=${ver}`,
  ];

  let menu;
  try {
    const raw = await fetchFirst(urls);
    const validated = validateMenu(raw);
    if (!validated) {
      store.menuStatus = "error";
      store.menuError = "Menu failed to load or was invalid.";
      return;
    }

    // Prepare lessonNumber/maxLessons without clobbering existing progress
    const nextLessons = { ...(store.lessonNumber || {}) };
    const nextMax = { ...(store.maxLessons || {}) };

    for (const { key, maxLessons } of validated) {
      if (nextLessons[key] == null) nextLessons[key] = 1;
      if (Number.isInteger(maxLessons) && maxLessons > 0) nextMax[key] = maxLessons;
    }

    // Avoid unnecessary writes if the menu is the same
    const sameLength =
      Array.isArray(store.menu) && store.menu.length === validated.length;
    const sameKeys =
      sameLength &&
      store.menu.every((m, i) => m?.key === validated[i]?.key);

    if (!sameKeys) menu = validated;

    store.$patch({
      ...(menu ? { menu } : null),
      menuStatus: "ready",
      menuError: null,
      lessonNumber: nextLessons,
      maxLessons: nextMax,
    });
  } catch (e) {
    console.error("[menu-hydrate] unexpected error", e);
    store.menuStatus = "error";
    store.menuError = "Unexpected error while loading the menu.";
  } finally {
    if (typeof store.markHydrated === "function") store.markHydrated("menu");
    else store.hydration = { ...(store.hydration || {}), menu: true };
  }
});
