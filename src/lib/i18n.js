// src/lib/i18n.js
import { createI18n } from 'vue-i18n'
import { applyDirection } from 'src/utils/i18nDirection'  // <-- add this util

export const i18n = createI18n({
  legacy: false,
  globalInjection: true,
  locale: 'eng00',
  fallbackLocale: 'eng00',
  messages: {},        // boot will inject eng00
  warnHtmlMessage: false
})

export async function loadPublicInterface(locale) {
  const base = (import.meta.env.BASE_URL || '/').replace(/\/+$/, '') + '/'
  const url = `${base}interface/${locale}.json`
  try {
    const res = await fetch(url, { cache: 'no-store' })
    return res.ok ? await res.json() : {}
  } catch {
    return {}
  }
}

// --- NEW: cache + switcher ---
const loaded = new Set()

/**
 * Ensure the interface bundle for `hl` is loaded, switch i18n to it,
 * and apply document direction from bundle meta.
 * Returns the loaded bundle (or {} if missing).
 */
export async function ensureInterfaceHL(hl = 'eng00') {
  const code = String(hl || 'eng00').trim() || 'eng00'

  // Load once
  if (!loaded.has(code)) {
    const bundle = await loadPublicInterface(code)
    if (bundle && Object.keys(bundle).length > 0) {
      i18n.global.setLocaleMessage(code, bundle)   // whole bundle (meta, interface, …)
    }
    loaded.add(code)
  }

  // Pick either requested or fallback if not actually available
  const available = i18n.global.availableLocales
  const next = available.includes(code) ? code : 'eng00'
  i18n.global.locale.value = next

  // Apply RTL/LTR based on the active bundle's meta
  try {
    const msg = i18n.global.getLocaleMessage(next)
    const dir = String(msg?.meta?.direction || '').toLowerCase()
    applyDirection(dir === 'rtl' ? 'rtl' : 'ltr')
  } catch {
    applyDirection('ltr')
  }

  return i18n.global.getLocaleMessage(next) || {}
}
