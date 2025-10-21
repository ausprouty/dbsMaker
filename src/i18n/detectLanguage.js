import languages from 'src/i18n/metadata/languages.json';

/**
 * Returns the full language object based on the browser's language.
 * Falls back to 'eng00' if no match is found.
 *
 * @returns {object} languageObject with { id, languageCodeHL, languageCodeJF, ... }
 */
export function getBrowserLanguageObject() {
  const browserLang = navigator.language || navigator.userLanguage;
  const isoCode = browserLang.split('-')[0].toLowerCase();

  const match = languages.find(lang =>
    lang.languageCodeIso?.toLowerCase().startsWith(isoCode)
  );

  return match || languages.find(lang => lang.languageCodeHL === 'eng00');
}

export function getLanguageObjectFromHL(langCodeFromRoute) {

  const match = languages.find(
    lang => lang.languageCodeIso.startsWith(langCodeFromRoute)
  );
  return match || languages.find(lang => lang.languageCodeHL === 'eng00');
}
