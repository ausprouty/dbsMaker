// src/composables/useApplyRouteToSettings.js
import { watch } from "vue";
import { useRoute } from "vue-router";
import { applyRouteToSettingsStore } from "src/composables/applyRouteToSettingsStore";

export function useApplyRouteToSettings(settingsStore) {
  if (!settingsStore) {
    throw new Error("useApplyRouteToSettings: settingsStore is required");
  }

  var route = useRoute();

  watch(
    function () {
      return route.fullPath;
    },
    function () {
      try {
        applyRouteToSettingsStore(route, settingsStore);
      } catch (err) {
        console.console.error(
          "[useApplyRouteToSettings] applyRouteToSettingsStore failed",
          err,
          { fullPath: route.fullPath }
        );
      }
    },
    { immediate: true, flushd: "post" }
  );

  return { settingsStore: settingsStore };
}
