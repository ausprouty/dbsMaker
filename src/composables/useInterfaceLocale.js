// src/composables/useInterfaceLocale.js

// called from MainLayout
import { useI18n } from "vue-i18n";
import { normHL } from "src/utils/normalize";

export function useInterfaceLocale() {
  const { locale } = useI18n({ useScope: "global" });

    // Use HL codes as the i18n locale, e.g., "eng00"
  function mapToI18nCode(lang) {
    return normHL(lang?.languageCodeHL) || "eng00";
  }

  // Trust the language object from the store
  function isRTL(lang) {
    const dir = String(lang?.textDirection || lang?.direction || "").toLowerCase();
    return dir === "rtl";
  }

 function applyInterfaceLanguage(lang) {
    const hlCode  = mapToI18nCode(lang);        // e.g., "eng00" (your i18n key space)
    const isoCode = String(lang?.languageCodeIso || "").toLowerCase() || "en";
    if (locale && "value" in locale) locale.value = hlCode;
    try { document.documentElement.lang = isoCode; } catch {}
    try { document.documentElement.dir = isRTL(lang) ? "rtl" : "ltr"; } catch {}
    return Promise.resolve(hlCode);
  }

  return { applyInterfaceLanguage, mapToI18nCode };
}
