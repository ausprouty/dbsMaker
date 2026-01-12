import { useSettingsStore } from "src/stores/SettingsStore";
import { getLanguageObjectFromHL } from "./detectLanguage";
import { getTranslatedInterface } from "src/services/InterfaceService";

export function syncLanguageFromRoute(route) {
  const settingsStore = useSettingsStore();
  const langCodeFromRoute = route.params.languageCodeHL;
  console.log("from route: " + langCodeFromRoute);

  if (!langCodeFromRoute) return;

  const currentHL = settingsStore.textLanguageSelected?.languageCodeHL;
  console.log("current languageCodeHL:" + currentHL);
  if (langCodeFromRoute !== currentHL) {
    //const languageObject = getLanguageObjectFromHL(langCodeFromRoute);
    //console.log(languageObject);
    // if (languageObject) {
    //   settingsStore.setTextLanguageObjectSelected(languageObject);
    // } else {
    //   console.warn(`Unknown language code in route: ${langCodeFromRoute}`);
    // }
    console.log("getting interface for: " + langCodeFromRoute);
    getTranslatedInterface(langCodeFromRoute);
  }
}
