import { boot } from 'quasar/wrappers'
import { i18n, loadPublicInterface } from 'src/lib/i18n'

export default boot(async ({ app }) => {
  app.use(i18n) // install first
  const fallback = await loadPublicInterface('eng00')
  i18n.global.setLocaleMessage('eng00', fallback)
  if (import.meta.env.DEV) {
    window.__i18n = i18n
    console.log('[i18n] installed, locale =', i18n.global.locale.value)
  }
})

// Re-export for convenience if you like:
export { i18n }
