// src/composables/useBannerForKey.js

/*  Useable composable to get banner image URL for a given section and key, based on the menu configuration.
Example usage:
import { useBannerForKey } from "src/composables/useBannerForKey";
const { getBanner } = useBannerForKey();
const banner = getBanner("page", "deepavali"); // "/images/deepavali-banner.webp"
*/
import { computed } from "vue";
import { useSettingsStore } from "src/stores/SettingsStore";

function normId(v) {
  const s = String(v == null ? "" : v).trim();
  if (!s) return "";
  return s.toLowerCase();
}

// usage:
// const { getBanner } = useBannerForKey();
// const banner = getBanner("series", "ctc");
export function useBannerForKey() {
  const settingsStore = useSettingsStore();

  // menu should be the array you showed
  const menu = computed(() => {
    const m = settingsStore.menu;
    return Array.isArray(m) ? m : [];
  });

  function getBanner(section, key) {
    const sectionNorm = normId(section); // "page" | "series"
    const keyNorm = normId(key); // "karma" | "ctc" etc.
    if (!sectionNorm || !keyNorm) return null;

    const prefix = `/${sectionNorm}/`; // "/page/" or "/series/"

    const item = menu.value.find((x) => {
      if (!x || !x.route || !x.key) return false;
      if (normId(x.key) !== keyNorm) return false;
      return String(x.route).startsWith(prefix);
    });

    const banner = item && item.banner ? String(item.banner).trim() : "";
    return banner ? banner : null;
  }

  return { getBanner };
}
