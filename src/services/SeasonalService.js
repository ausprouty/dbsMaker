// src/services/useSeasonalService.js
import { computed } from "vue";
import { useSettingsStore } from "src/stores/SettingsStore";
import api from "src/services/api";

function normalizeSeasonal(raw) {
  const safe = raw || {};

  const paras = Array.isArray(safe.paras)
    ? safe.paras
    : safe.para && typeof safe.para === "object"
    ? Object.values(safe.para)
    : [];

  return {
    title: safe.title || "",
    summary: safe.summary || "",
    paras: paras.filter((p) => typeof p === "string" && p.trim().length > 0),
    imageUrl: safe.imageUrl || null,
    ends: safe.ends || null,
  };
}

export function useSeasonalService() {
  const settingsStore = useSettingsStore();

  const isExpired = computed(() => {
    if (!settingsStore.seasonalExpires) return true;
    return new Date() > new Date(settingsStore.seasonalExpires);
  });

  async function refreshSeasonal(site, languageCodeGoogle) {
    const url = `/api/v2/translate/seasonal/${site}/${languageCodeGoogle}`;

    const response = await api.get(url);

    if (!response || !response.data) {
      settingsStore.clearSeasonalContent();
      return;
    }

    // ✅ normalize here
    const seasonal = normalizeSeasonal(response.data);

    // ✅ store normalized data
    settingsStore.setSeasonalContent({
      content: seasonal,
      ends: seasonal.ends,
    });
  }

  function ensureSeasonalValid() {
    if (isExpired.value) {
      settingsStore.clearSeasonalContent();
    }
  }

  return {
    // ✅ return what the component actually uses
    seasonal: computed(() => settingsStore.seasonal),
    isExpired,
    refreshSeasonal,
    ensureSeasonalValid,
  };
}
