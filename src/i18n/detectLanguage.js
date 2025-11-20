import languages from "src/i18n/metadata/languages.json";
import { getTranslatedInterface } from "src/services/InterfaceService";

/**
 * Returns the full language object based on the browser's language.
 * Falls back to 'eng00' if no match from the list of languages that we can do dbs for.
 *
 * @returns {object} languageObject with { id, languageCodeHL, languageCodeJF, ... }
 */
export function getBrowserLanguageObject() {
  const browserLang = navigator.language || navigator.userLanguage;
  const isoCode = browserLang.split("-")[0].toLowerCase();

  const match = languages.find((lang) =>
    lang.languageCodeIso?.toLowerCase().startsWith(isoCode)
  );

  return match || languages.find((lang) => lang.languageCodeHL === "eng00");
}

/**
 * Try to resolve a language object for a given HL code.
 * 1) Check local languages.json
 * 2) If not found, ask the interface API
 * 3) If all fails, fall back to eng00
 *
 * @param {string} languageCodeHL
 * @returns {Promise<object|null>}
 */
export async function getLanguageObjectFromHL(languageCodeHL) {
  if (!languageCodeHL) {
    return fallbackToEnglish();
  }

  // 1) Local lookup first
  const localMatch = languages.find(
    (lang) => lang.languageCodeHL === languageCodeHL
  );
  if (localMatch) {
    return localMatch;
  }

  // 2) Ask the API to give us its best
  try {
    const iface = await getTranslatedInterface(languageCodeHL);
    console.log(iface);

    // ⚠️ Adjust this to match your real interface shape.
    // For example, if the interface metadata is at iface.meta.language:
    const fromInterface = iface?.meta?.languageCodeHL || null;

    if (fromInterface) {
      return fromInterface;
    }
  } catch (err) {
    console.warn(
      "[detectLanguage] getTranslatedInterface failed for",
      languageCodeHL,
      err
    );
  }

  // 3) Last-resort fallback
  return fallbackToEnglish();
}

function fallbackToEnglish() {
  return languages.find((lang) => lang.languageCodeHL === "eng00") || null;
}
