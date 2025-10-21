import { boot } from 'quasar/wrappers'
import { http, attachInterceptors /*, patchGlobalAxios */ } from 'src/lib/http'

export default boot(({ app }) => {
  attachInterceptors()
  // patchGlobalAxios()
  app.config.globalProperties.$http = http

  if (import.meta.env.DEV && typeof window !== 'undefined') {
    window.currentApi = http                   // <-- expose the axios instance
    window.API_BASE = http.defaults.baseURL    // <-- easy-to-read base
    console.log('[Axios] base =', http.defaults.baseURL)
  }
})

export { http }
