/* eslint-env serviceworker */

import {clientsClaim} from 'workbox-core'
import {enable as enableNavigationPreload} from 'workbox-navigation-preload'
import {
  precacheAndRoute,
  cleanupOutdatedCaches,
  createHandlerBoundToURL
} from 'workbox-precaching'
import {registerRoute, NavigationRoute} from 'workbox-routing'
import {StaleWhileRevalidate, NetworkFirst} from 'workbox-strategies'
import {CacheableResponsePlugin} from 'workbox-cacheable-response'
import {ExpirationPlugin} from 'workbox-expiration'

// --- Activation strategy ---
self.skipWaiting()
clientsClaim()
enableNavigationPreload()

// --- Precache ---
precacheAndRoute(self.__WB_MANIFEST || [], {
  ignoreURLParametersMatching: [/^v$/, /^__WB_REVISION__$/]
})
cleanupOutdatedCaches()

// --- SPA fallback aware of non-root base path ---
const scopePath = new URL(self.registration.scope).pathname
const indexURL = (scopePath.endsWith('/') ? scopePath : scopePath + '/') + 'index.html'

try {
  const handler = createHandlerBoundToURL(indexURL)
  registerRoute(new NavigationRoute(handler, {
    denylist: [
      new RegExp(`^${scopePath}api/`, 'i'),              // legacy API
      new RegExp(`^${scopePath}api/v2/translate/`, 'i'), // new translate API
      new RegExp(`^${scopePath}_/`),        // typical Next/Quasar pattern
      /\/[^/?]+\.[^/]+$/i,                  // any “/file.ext”
      /service-worker\.js$/i,
      /sw\.js$/i,
      /workbox-(?:.*)\.js$/i
    ]
  }))
} catch (_) {
  // In dev, index.html might not be precached; skip SPA fallback.
}

// --- Runtime caching (site-aware cache names) ---
const scopeSlug = scopePath.replace(/[^\w-]+/g, '_')
const slash = scopePath.endsWith('/') ? '' : '/'
const apiV2Root = `${scopePath}${slash}api/v2/translate/`

// -------- interface -------- (SWR; relatively static per language)
registerRoute(
  ({url}) => url.pathname.startsWith(apiV2Root + 'text/interface/'),
  new StaleWhileRevalidate({
    cacheName: `v2-interface-${scopeSlug}`,
    matchOptions: { ignoreVary: true },
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxEntries: 80, maxAgeSeconds: 60 * 60 * 24 * 30 })
    ]
  })
)

// -------- commonContent -------- (SWR; semi-static bundles)
registerRoute(
  ({url}) => url.pathname.startsWith(apiV2Root + 'text/commonContent/'),
  new StaleWhileRevalidate({
    cacheName: `v2-commonContent-${scopeSlug}`,
    matchOptions: { ignoreVary: true },
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxEntries: 120, maxAgeSeconds: 60 * 60 * 24 * 14 })
    ]
  })
)

// -------- lessonContent -------- (NetworkFirst; more dynamic)
registerRoute(
  ({url}) => url.pathname.startsWith(apiV2Root + 'lessonContent/'),
  new NetworkFirst({
    cacheName: `v2-lessonContent-${scopeSlug}`,
    matchOptions: { ignoreVary: true }, // fixes Vary: Origin matching/deletion
    networkTimeoutSeconds: 8,
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxEntries: 200, maxAgeSeconds: 60 * 30 })
    ]
  })
)

// -------- fallback for any other /api/v2/translate calls --------
registerRoute(
  ({url}) => url.pathname.startsWith(apiV2Root),
  new NetworkFirst({
    cacheName: `v2-api-${scopeSlug}`,
    matchOptions: { ignoreVary: true },
    networkTimeoutSeconds: 8,
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxEntries: 100, maxAgeSeconds: 60 * 10 })
    ]
  })
)

// -------- legacy API (optional; keep if still used) --------
registerRoute(
  ({url}) => url.pathname.startsWith(`${scopePath}api/`),
  new NetworkFirst({
    cacheName: `api-${scopeSlug}`,
    networkTimeoutSeconds: 4,
    plugins: [ new CacheableResponsePlugin({ statuses: [0, 200] }) ]
  })
)

/* Optional controlled updates:
self.addEventListener('message', (e) => {
  if (e.data?.type === 'SKIP_WAITING') self.skipWaiting()
})
*/
