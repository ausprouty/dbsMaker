/* eslint-env serviceworker */

import { clientsClaim } from "workbox-core";
import { enable as enableNavigationPreload } from "workbox-navigation-preload";
import {
  precacheAndRoute,
  cleanupOutdatedCaches,
  createHandlerBoundToURL,
} from "workbox-precaching";
import { registerRoute, NavigationRoute } from "workbox-routing";
import { StaleWhileRevalidate, NetworkFirst } from "workbox-strategies";
import { CacheableResponsePlugin } from "workbox-cacheable-response";
import { ExpirationPlugin } from "workbox-expiration";

/* ---------- Precache & lifecycle ---------- */

// Injected by Workbox at build-time
precacheAndRoute(self.__WB_MANIFEST || [], {
  ignoreURLParametersMatching: [/^v$/, /^__WB_REVISION__$/],
});

cleanupOutdatedCaches();

// Fast take-over
self.skipWaiting();
clientsClaim();

// (Optional) Helps NetworkFirst routes by using the browser's preload
enableNavigationPreload();

/* ---------- SPA navigation fallback ---------- */

// Works for "/" or subfolders like "/dbs/"
const scopePath = new URL(self.registration.scope).pathname;
const esc = (s) => s.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");
const rx = (p) => new RegExp(`^${esc(scopePath)}${p}`, "i");

// App shell bound to the correct base path
const indexURL =
  (scopePath.endsWith("/") ? scopePath : scopePath + "/") + "index.html";
const appShellHandler = createHandlerBoundToURL(indexURL);

// Requests that should NOT return the SPA shell
const denylist = [
  rx("api(/|$)"),
  rx("config(/|$)"),
  rx("content(/|$)"),
  rx("interface(/|$)"),
  /^\/\.well-known\//i, // root ACME
  rx("\\.well-known(/|$)"), // subfolder, if any
  // Any direct file request (let server/cache handle it)
  /\/[^/]+\.(?:html?|js|css|map|json|png|jpe?g|gif|svg|webp|ico|woff2?)$/i,
];

registerRoute(new NavigationRoute(appShellHandler, { denylist }));

/* ---------- Runtime caching ---------- */

// Site-aware cache names
const scopeSlug = scopePath.replace(/[^\w-]+/g, "_");
const slash = scopePath.endsWith("/") ? "" : "/";
const apiV2Root = `${scopePath}${slash}api/v2/translate/`;

// interface (SWR)
registerRoute(
  ({ url }) => url.pathname.startsWith(apiV2Root + "text/interface/"),
  new StaleWhileRevalidate({
    cacheName: `v2-interface-${scopeSlug}`,
    matchOptions: { ignoreVary: true },
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({
        maxEntries: 80,
        maxAgeSeconds: 60 * 60 * 24 * 30,
      }),
    ],
  })
);

// commonContent (SWR)
registerRoute(
  ({ url }) => url.pathname.startsWith(apiV2Root + "text/commonContent/"),
  new StaleWhileRevalidate({
    cacheName: `v2-commonContent-${scopeSlug}`,
    matchOptions: { ignoreVary: true },
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({
        maxEntries: 120,
        maxAgeSeconds: 60 * 60 * 24 * 14,
      }),
    ],
  })
);

// lessonContent (NetworkFirst)
registerRoute(
  ({ url }) => url.pathname.startsWith(apiV2Root + "lessonContent/"),
  new NetworkFirst({
    cacheName: `v2-lessonContent-${scopeSlug}`,
    matchOptions: { ignoreVary: true },
    networkTimeoutSeconds: 8,
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxEntries: 200, maxAgeSeconds: 60 * 30 }),
    ],
  })
);

// any other /api/v2/translate (NetworkFirst)
registerRoute(
  ({ url }) => url.pathname.startsWith(apiV2Root),
  new NetworkFirst({
    cacheName: `v2-api-${scopeSlug}`,
    matchOptions: { ignoreVary: true },
    networkTimeoutSeconds: 8,
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxEntries: 100, maxAgeSeconds: 60 * 10 }),
    ],
  })
);

// legacy API (if still used)
registerRoute(
  ({ url }) => url.pathname.startsWith(`${scopePath}api/`),
  new NetworkFirst({
    cacheName: `api-${scopeSlug}`,
    networkTimeoutSeconds: 4,
    plugins: [new CacheableResponsePlugin({ statuses: [0, 200] })],
  })
);

/* Optional: message to trigger update
self.addEventListener('message', (e) => {
  if (e.data && e.data.type === 'SKIP_WAITING') self.skipWaiting();
});
*/
