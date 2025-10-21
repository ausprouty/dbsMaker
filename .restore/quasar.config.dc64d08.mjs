/* eslint-env node */
import { configure } from 'quasar/wrappers';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default configure((ctx) => {
  const site = process.env.SITE || process.env.VITE_APP || 'default';


  // Load per-site meta
  const metaPath = path.resolve(__dirname, `src/sites/${site}/meta.json`);
  console.log (metaPath);
  const meta = fs.existsSync(metaPath)
    ? JSON.parse(fs.readFileSync(metaPath, 'utf-8'))
    : {};

  const base = meta.base ?? '/';

  // Variables file
  const varsPath = meta.varsPath ?? `src/sites/${site}/quasar.variables.scss`;
  const varsFile = fs.existsSync(path.resolve(__dirname, varsPath))
    ? path.resolve(__dirname, varsPath)
    : path.resolve(__dirname, 'src/css/quasar.variables.scss');

  // Public dir
  const publicDir = path.resolve(__dirname, meta.publicDir ?? `public-${site}`);
  const finalPublicDir = fs.existsSync(publicDir) ? publicDir : path.resolve(__dirname, 'public');

  // --- NEW: dev server from meta
  const devHost  = meta.dev?.host  ?? 'localhost';
  const devPort  = meta.dev?.port  ?? (ctx.mode.pwa ? 9200 : ctx.mode.ssr ? 9300 : 9100);
  const devHttps = meta.dev?.https ?? false;
  console.log('▶ site:', site);
  console.log('▶ meta:', publicDirExists ? metaPath : '(no meta/public dir fallback)');
  console.log('▶ vars:', varsFile);
  console.log('▶ base:', base);
  console.log('▶ publicDir:', finalPublicDir);


  return {
    css: ['app.scss'],
    build: {
      env: { VITE_APP: site, VITE_SITE_KEY: site },
      vueRouterMode: 'history',
      distDir: `dist/site-${site}`,
      publicPath: base,
      sassVariables: varsFile,

      extendViteConf(viteConf) {
        viteConf.publicDir = finalPublicDir;

        viteConf.define = {
          ...viteConf.define,
          __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: false,
          __SITE__: JSON.stringify(site) // optional: use inside SW or app code
        };

        const existingAlias = (viteConf.resolve && viteConf.resolve.alias) || {};
        viteConf.resolve = {
          ...viteConf.resolve,
          alias: {
            ...existingAlias,
            '@': path.resolve(__dirname, './src'),
            '@site': path.resolve(__dirname, `src/sites/${site}`)
          }
        };
      }
    },

    // --- NEW: each site gets its own origin in dev
    devServer: {
      host: devHost,
      port: devPort,
      https: devHttps,
      strictPort: true,               // 👈 fail instead of changing ports
      proxy: {
        '/api_mylanguage': { target: 'http://127.0.0.1:5559', changeOrigin: true }
      },
      open: true
    },

    framework: { config: {}, plugins: ['Notify', 'Dialog'] },

    // --- PWA (meta-driven, custom SW) -------------------------------
    pwa: {
      workboxMode: 'InjectManifest',
      injectRegister: 'auto',
      manifestFilename: 'manifest.json',

      // Tell Workbox how to build the precache + where your SW lives
      extendInjectManifestOptions (config) {
        config.swSrc = 'src-pwa/custom-service-worker.js';
        config.globPatterns = ['**/*.{js,css,html,ico,png,svg,webp,woff2}'];
        config.globIgnores = ['**/*.map', '**/stats.html'];
        // Raise if you ship big assets:
        // config.maximumFileSizeToCacheInBytes = 6 * 1024 * 1024;
        return config;
      },

      // Build manifest from meta.pwa with safe fallbacks
      extendManifestJson (manifest) {
        const m = (meta && meta.pwa) || {};
        manifest.name             = m.name             ?? 'App';
        manifest.short_name       = m.short_name       ?? 'App';
        manifest.description      = m.description      ?? '';
        manifest.display          = m.display          ?? 'standalone';
        manifest.orientation      = m.orientation      ?? 'portrait';
        manifest.background_color = m.background_color ?? '#ffffff';
        manifest.theme_color      = m.theme_color      ?? '#3e81ef';
        manifest.start_url        = m.start_url        ?? base;
        manifest.scope            = m.scope            ?? base;

        // Prefer icons from meta; otherwise default to site icons under public-<site>/icons/
        manifest.icons = Array.isArray(m.icons) && m.icons.length ? m.icons : [
          { src: `${base}icons/icon-192x192.png`,           sizes: '192x192', type: 'image/png' },
          { src: `${base}icons/icon-512x512.png`,           sizes: '512x512', type: 'image/png' },
          { src: `${base}icons/icon-192x192-maskable.png`,  sizes: '192x192', type: 'image/png', purpose: 'maskable any' },
          { src: `${base}icons/icon-512x512-maskable.png`,  sizes: '512x512', type: 'image/png', purpose: 'maskable any' }
        ];
        return manifest;
      }
    },

  };
});
