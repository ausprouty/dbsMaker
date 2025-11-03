// src/composables/useInterfaceLocale.js

// called from MainLayout
import { useI18n } from "vue-i18n";
import { normHL } from "src/utils/normalize";

export function useInterfaceLocale() {
  const { locale } = useI18n({ useScope: "global" });

  // Trust the language object from the store
  function isRTL(lang) {
    const dir = String(
      lang?.textDirection || lang?.direction || ""
    ).toLowerCase();
    return dir === "rtl";
  }

  function applyInterfaceLanguageToWebpage(lang) {
    const isoCode = String(lang?.languageCodeIso || "").toLowerCase() || "en";
    const iso = String(lang?.script || "").toLowerCase() || isoCode;
    console.log("ApplyInterfaceLanguageToWebpage: " + iso);
    try {
      document.documentElement.lang = iso;
    } catch {}
    try {
      document.documentElement.dir = isRTL(lang) ? "rtl" : "ltr";
    } catch {}
    return Promise.resolve(hlCode);
  }

  return { applyInterfaceLanguageToWebpage };
}
