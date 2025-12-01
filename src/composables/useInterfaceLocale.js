// src/composables/useInterfaceLocale.js

// called from MainLayout
import { useI18n } from "vue-i18n";

export function useInterfaceLocale() {
  const { locale } = useI18n({ useScope: "global" });

  // Trust the language object from the store
  function isRTL(lang) {
    const dir = String(lang?.textDirection || "").toLowerCase();
    return dir === "rtl";
  }

  function applyInterfaceLanguageToWebpage(lang) {
    const webLanguage =
      String(lang?.languageCodeGoogle || "").toLowerCase() || "en";
    console.log("ApplyInterfaceLanguageToWebpage: " + webLanguage);
    try {
      document.documentElement.lang = webLanguage;
    } catch {}
    try {
      document.documentElement.dir = isRTL(lang) ? "rtl" : "ltr";
    } catch {}
    return;
  }

  return { applyInterfaceLanguageToWebpage };
}
