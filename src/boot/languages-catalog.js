// src/boot/languages-catalog.js
import { boot } from 'quasar/wrappers'
import { useSettingsStore } from 'src/stores/SettingsStore'
import bundledCatalog from 'src/i18n/metadata/languages.json' // ultimate fallback

function isValidCatalog(list) {
  return Array.isArray(list) && list.length > 0 && list.every(x =>
    x && (x.languageCodeHL || x.hl) && (x.languageCodeJF || x.jf)
  );
}

function normalizeCatalog(list) {
  // Map possible alt keys like "hl"/"jf" to the expected shape
  return list.map(x => ({
    languageCodeHL: x.languageCodeHL ?? x.hl ?? '',
    languageCodeJF: x.languageCodeJF ?? x.jf ?? '',
    name: x.name ?? x.displayName ?? String(x.languageCodeHL ?? x.hl ?? ''),
    ethnicName: x.ethnicName ?? x.nativeName ?? '',
    languageCodeIso: x.languageCodeIso ?? x.languageCodeISO ?? x.iso ?? '',
    direction: x.direction || '',
    ...x
  }));
}

export default boot(async () => {
  const s = useSettingsStore();
  if (Array.isArray(s.languages) && s.languages.length) return;

  const base = (import.meta.env.BASE_URL || '/').replace(/\/+$/, '') + '/';

  // Try these in order
  const candidates = [
    // primary (prod & dev when served from /public or site root)
    `${base}config/languages.json`,
    // dev-only quirk (you mentioned it lives here during dev)
    `${base}public-guru/config/languages.json`,
    // optional override via env if you want
    import.meta.env.VITE_LANG_CONFIG_PATH || null,
  ].filter(Boolean);

  let loaded = null;
  let from = 'bundled';

  for (const url of candidates) {
    try {
      console.log (url)
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) continue;
      const json = await res.json();
      console.log (json)
      if (!isValidCatalog(json)) continue;
      loaded = normalizeCatalog(json);
      from = url;
      console.log (from)
      break;
    } catch {
      // try next
    }
  }

  if (!loaded) {
    loaded = normalizeCatalog(bundledCatalog);
  }

  s.setLanguages(loaded);

  if (import.meta.env.DEV) {
    console.log(`[languages] loaded ${loaded.length} entries from: ${from}`);
  }
});
