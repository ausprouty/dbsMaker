import { useSettingsStore } from "src/stores/SettingsStore";
import { getLanguageObjectFromHL } from "./detectLanguage";

export function syncLanguageFromRoute(route) {
  const settingsStore = useSettingsStore();
  const langCodeFromRoute = route.params.languageCodeHL;

  if (!langCodeFromRoute) return;

  const currentHL = settingsStore.languageSelected?.languageCodeHL;
  if (langCodeFromRoute !== currentHL) {
    const languageObject = getLanguageObjectFromHL(langCodeFromRoute);
    if (languageObject) {
      settingsStore.setLanguageObjectSelected(languageObject);
    } else {
      console.warn(`Unknown language code in route: ${langCodeFromRoute}`);
    }
  }
}
