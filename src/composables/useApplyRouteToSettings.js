App;
// src/composables/useApplyRouteToSettings.js
import { watch } from "vue";
import { useRoute } from "vue-router";
import { useSettingsStore } from "src/stores/SettingsStore";
import { applyRouteToSettingsStore } from "src/composables/applyRouteToSettingsStore";

export function useApplyRouteToSettings() {
  var route = useRoute();
  var settingsStore = useSettingsStore();

  watch(
    function () {
      return route.fullPath;
    },
    function () {
      applyRouteToSettingsStore(route, settingsStore);
    },
    { immediate: true }
  );

  return { settingsStore: settingsStore };
}
