// src/i18n/loadInterfaceTranslation.js

import { getTranslatedInterface } from "src/services/InterfaceService";

/**
 * Loads and applies the specified language using the InterfaceService.
 * Falls back to default language if unavailable.
 *
 * @param {string} languageCodeHL- The language code to load (e.g., 'eng00', 'spa00').
 */
export async function loadInterfaceTranslation(languageCodeHL) {
  console.log(
    "src/i18n/loadInterfaceTranslation is calling services/InterfaceService/getTranslatedInterface with " +
      languageCodeHL
  );
  await getTranslatedInterface(languageCodeHL);
}
