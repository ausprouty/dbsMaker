// src/services/useSeasonalService.js
import { computed } from "vue";
import { useSettingsStore } from "src/stores/SettingsStore";
import { http } from "src/lib/http";

function normalizeSeasonal(raw) {
  const safe = raw || {};

  // Accept multiple possible keys:
  // - new: paragraphs (array)
  // - old: paras (array)
  // - old: para (object like { "1": "...", "2": "..." })
  const paras = Array.isArray(safe.paragraphs)
    ? safe.paragraphs
    : Array.isArray(safe.paras)
    ? safe.paras
    : safe.para && typeof safe.para === "object"
    ? Object.values(safe.para)
    : [];

  // Accept multiple possible image keys:
  // - new: image
  // - old: imageUrl
  const imageUrl =
    typeof safe.imageUrl === "string" && safe.imageUrl.trim().length > 0
      ? safe.imageUrl
      : typeof safe.image === "string" && safe.image.trim().length > 0
      ? safe.image
      : null;

  return {
    key: safe.key || null,
    title: safe.title || "",
    summary: safe.summary || "",
    paras: paras.filter((p) => typeof p === "string" && p.trim().length > 0),
    imageUrl: imageUrl,
    starts: safe.starts || null,
    ends: safe.ends || null,
  };
}

export function useSeasonalService() {
  const settingsStore = useSettingsStore();
  console.log("entered useSeasonalService");

  const isExpired = computed(() => {
    if (!settingsStore.seasonalExpires) return true;
    return new Date() > new Date(settingsStore.seasonalExpires);
  });

  async function refreshSeasonal(site, languageCodeGoogle) {
    const siteKey = String(site || "").trim();
    const lang = String(languageCodeGoogle || "en").trim() || "en";

    console.log("[refreshSeasonal] called with:", {
      site: siteKey,
      languageCodeGoogle: lang,
    });

    if (!siteKey) {
      console.warn("[refreshSeasonal] missing site key, skipping");
      settingsStore.clearSeasonalContent();
      return;
    }

    const url = `/v2/translate/seasonal/${siteKey}/${lang}`;
    console.log("[refreshSeasonal] url:", url);

    try {
      const response = await http.get(url, {
        headers: {
          "Cache-Control": "no-cache",
          Pragma: "no-cache",
          "If-Modified-Since": "0",
        },
        // Treat 404 as a normal response (no throw) so we can clear intentionally.
        validateStatus: (status) =>
          (status >= 200 && status < 300) || status === 404,
        timeout: 15000,
      });
      console.log("[refreshSeasonal] response:", response);

      const payload = response && response.data ? response.data.data : null;

      // “No seasonal content” (intentional clear)
      if (
        !response ||
        response.status === 404 ||
        !payload ||
        !payload.seasonal
      ) {
        settingsStore.clearSeasonalContent();
        return;
      }

      const seasonalRaw = payload.seasonal;

      // Better logging than "[object Object]"
      console.log(
        "[refreshSeasonal] seasonalRaw:",
        JSON.stringify(seasonalRaw, null, 2)
      );

      const seasonal = normalizeSeasonal(seasonalRaw);

      // Better logging than "[object Object]"
      console.log(
        "[refreshSeasonal] seasona:",
        JSON.stringify(seasonal, null, 2)
      );

      settingsStore.setSeasonalContent({
        content: seasonal,
        ends: seasonal.ends,
      });
    } catch (err) {
      console.log("[refreshSeasonal] failure");
      // Transient error: keep existing seasonal content
      console.warn(
        "[refreshSeasonal] transient failure, keeping existing:",
        url,
        err
      );
    }
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
