// quasar.config.mjs
import { configure } from "quasar/wrappers";
import { loadEnv } from "vite";
import fs from "node:fs";
import path from "node:path";
const ROOT = process.cwd();

// ---------- small helpers ----------
const exists = (p) => fs.existsSync(path.join(ROOT, p));
const presentEnvFiles = (mode) =>
  [".env", ".env.local", `.env.${mode}`, `.env.${mode}.local`].filter(exists);

function cleanUrl(v) {
  if (!v) return "";
  let x = String(v);
  x = x
    .replace(/^["']|["']$/g, "") // strip quotes
    .replace(/\s*[#;].*$/, "") // drop inline comments
    .trim();
  return x.replace(/\/+$/, ""); // drop trailing slashes
}

// ---- Safe access helpers (no optional chaining) -------------------------
function getIn(obj, path) {
  let cur = obj;
  for (const k of path) {
    if (cur == null || !(k in cur)) return undefined;
    cur = cur[k];
  }
  return cur;
}
function definedOr(v, fallback) {
  return v === undefined || v === null ? fallback : v;
}

// ---------- main export ----------
export default configure((ctx) => {
  // site key used by your project structure
  const site = process.env.SITE || process.env.VITE_APP || "dbs";

  // Base mode = dev/prod; Site mode = uom/wsu/... (optional)
  const baseMode = ctx.dev ? "development" : "production";
  // You can pass V_MODE=uom in your scripts; fallback to SITE for convenience
  const siteMode = process.env.V_MODE || process.env.SITE || "";

  // Load both layers explicitly, so we can merge + log clearly.
  // loadEnv() already includes .env + .env.<mode>(.local) automatically.
  const envBase = loadEnv(baseMode, ROOT, "");
  const envSite = siteMode ? loadEnv(siteMode, ROOT, "") : {};
  // Site overrides base
  const envAll = { ...envBase, ...envSite };

  // Load per-site meta.json (if present)
  const metaPath = path.resolve(ROOT, `src/sites/${site}/meta.json`);
  const meta = fs.existsSync(metaPath)
    ? JSON.parse(fs.readFileSync(metaPath, "utf8"))
    : {};
  const envFromMeta = Object.fromEntries(
    Object.entries(meta?.env || {}).filter(([k]) => k.startsWith("VITE_"))
  );
  const scssVarsPath = `src/sites/${site}/quasar.variables.scss`;
  if (!fs.existsSync(path.resolve(ROOT, scssVarsPath))) {
    throw new Error(
      `Missing SCSS variables for site "${site}". Expected: ${scssVarsPath}`
    );
  }

  // ---- Resolve API once, expose everywhere ----
  const resolvedApiRaw = cleanUrl(
    process.env.VITE_API ||
      envAll.VITE_API ||
      envFromMeta.VITE_API ||
      meta.api ||
      (ctx.dev
        ? "http://localhost/api_mylanguage2026"
        : "https://api2.mylanguage.net.au")
  );

  const apiBase = (resolvedApiRaw || "").replace(/\/+$/, "");

  let apiOrigin = "";
  let apiPath = "";
  try {
    const u = new URL(apiBase);
    apiOrigin = `${u.protocol}//${u.host}`;
    apiPath = (u.pathname || "").replace(/\/$/, "");
  } catch {
    apiOrigin = apiBase.replace(/\/.*$/, "");
    apiPath = "";
  }

  // Optional: per-site public dir (public-uom → else public)
  const publicDir = exists(`public-${site}`) ? `public-${site}` : "public";

  // Optional: per-site SCSS variables path

  const hasScssVars = exists(scssVarsPath);

  const base = meta.base || "/";
  // for debug
  const debugProd = process.env.DEBUG_BUILD === "1";

  // ---------- friendly build logs ----------
  console.log("▶ Env resolution");
  console.log("  site:", site);
  console.log("  baseMode:", baseMode, "siteMode:", siteMode || "(none)");
  console.log(
    "  present (base):",
    presentEnvFiles(baseMode).join(", ") || "(none)"
  );
  console.log(
    "  present (site):",
    (siteMode && presentEnvFiles(siteMode).join(", ")) || "(none)"
  );
  console.log(
    "  VITE_API from baseMode:",
    cleanUrl(envBase.VITE_API) || "(empty)"
  );
  console.log(
    "  VITE_API from siteMode:",
    cleanUrl(envSite.VITE_API) || "(empty)"
  );
  console.log("  → Effective VITE_API:", apiOrigin);
  console.log("  publicDir:", publicDir);
  console.log(
    "  meta.json:",
    exists(`src/sites/${site}/meta.json`) ? metaPath : "(none)"
  );
  console.log("  base:", base);
  if (hasScssVars) console.log("  scssVariables:", scssVarsPath);

  return {
    // Where Quasar copies static assets from
    sourceFiles: {
      // leave defaults unless you have custom index/template locations
    },

    // Per-site public assets (optional)
    // (Quasar accepts "public" path via vite.publicDir)
    // Use extendViteConf to set it.
    boot: [
      "i18n",
      "axios",
      "languages-catalog",
      "language-init",
      "brand-hydrate",
      "profile-hydrate",
      "menu-hydrate",
      "route-resume",
      "router-debug",
      "version-check",
      ...(ctx.dev ? ["dev-expose-env"] : []),
    ],
    css: ["app.scss"],
    extras: ["material-icons"],

    framework: {
      config: {},
      iconSet: "material-icons",
      plugins: ["Notify", "Dialog"],
    },
    build: {
      distDir: `dist/site-${site}`,
      env: {
        ...envFromMeta,
        VITE_APP: site,
        VITE_SITE_KEY: site,
        VITE_API: apiBase, // <- single source
      },
      htmlVariables: { SITE_META: meta },
      vueRouterMode: "history",
      scssVariables: scssVarsPath,
      publicPath: base, // keep consistent with your hosting path
      // begin debug
      sourcemap: debugProd, // show original source in prod
      minify: debugProd ? false : "esbuild",
      // end debug
      extendViteConf(viteConf) {
        // Public dir
        viteConf.publicDir = publicDir;

        // ---------- Define: expose env to client ----------
        const viteDefines = {
          "import.meta.env.MODE": JSON.stringify(baseMode),
          "import.meta.env.SITE": JSON.stringify(site),
        };

        // Mirror VITE_* from meta.env → import.meta.env.*, but let our computed VITE_API win
        for (const [k, v] of Object.entries(envFromMeta || {})) {
          if (k.startsWith("VITE_") && k !== "VITE_API") {
            viteDefines[`import.meta.env.${k}`] = JSON.stringify(v);
          }
        }
        // Ensure dynamically resolved API wins
        viteDefines["import.meta.env.VITE_API"] = JSON.stringify(apiBase);

        // Final define block (+ optional site meta)
        viteConf.define = {
          ...(viteConf.define || {}),
          ...viteDefines,
          __SITE_META__: JSON.stringify(meta),
        };

        // ---------- SCSS: inject per-site variables into all SFC <style lang="scss"> ----------
        if (hasScssVars) {
          const injectLine = `@use "${scssVarsPath.replace(/\\/g, "/")}" as *;`;
          const existing =
            viteConf.css?.preprocessorOptions?.scss?.additionalData;

          // Merge politely with any existing additionalData (string or function)
          let additionalData;
          if (typeof existing === "function") {
            additionalData = (content, loaderContext) =>
              `${injectLine}\n${existing(content, loaderContext)}`;
          } else if (typeof existing === "string") {
            additionalData = `${injectLine}\n${existing}`;
          } else {
            additionalData = injectLine;
          }

          viteConf.css = viteConf.css || {};
          viteConf.css.preprocessorOptions = {
            ...(viteConf.css.preprocessorOptions || {}),
            scss: {
              ...(viteConf.css.preprocessorOptions?.scss || {}),
              additionalData,
            },
          };
        }
        // --- NEW: aliases so @site/meta.json resolves ---
        viteConf.resolve = {
          ...(viteConf.resolve || {}),
          alias: {
            ...(viteConf.resolve?.alias || {}),
            "@": path.resolve(ROOT, "src"),
            "@site": path.resolve(ROOT, `src/sites/${site}`),
            "@sites": path.resolve(ROOT, "src/sites"),
            "@brand": path.resolve(ROOT, scssVarsPath),
          },
        };

        // Inject (or update) <meta name="api-origin" ...> into index.html
        viteConf.plugins = [
          ...(viteConf.plugins || []),
          {
            name: "inject-api-origin-meta",
            enforce: "pre",
            transformIndexHtml(html) {
              const tag = `<meta name="api-origin" content="${apiOrigin}">`;
              return html.includes('name="api-origin"')
                ? html.replace(/<meta[^>]*name="api-origin"[^>]*>/, tag)
                : html.replace("<head>", `<head>\n    ${tag}`);
            },
          },
        ];
      },
    },

    // Dev server: keep your /api proxy if you use it
    devServer: {
      host: "localhost",
      port: (() => {
        const v = getIn(meta, ["dev", "port"]);
        return v === undefined || v === null ? 9232 : v;
      })(),
      https: !!meta?.dev?.https,
      open: true,
      proxy: {
        // forward /api to the chosen API origin in dev
        "^/api(/|$)": {
          target: `${apiOrigin}${apiPath}/api`, // e.g. http://localhost/api_mylanguage/api
          changeOrigin: true,
          secure: apiBase.startsWith("https://"), // true for https targets, false for http
          rewrite: (p) => p.replace(/^\/api(?=\/|$)/, ""), // drop leading /api
          configure: (proxy) => {
            proxy.on("proxyReq", (proxyReq, req) => {
              if (req.headers.origin)
                proxyReq.setHeader("Origin", req.headers.origin);
            });
          },
        },
      },
    },
    // --- PWA: ensure precache + useful runtime caches
    pwa: {
      workboxMode: "InjectManifest",
      injectRegister: "auto",
      manifestFilename: "manifest.json",
      extendInjectManifestOptions(config) {
        config.swSrc = "src-pwa/custom-service-worker.js";
        config.globPatterns = ["**/*.{js,css,html,ico,png,svg,webp,woff2}"];
        config.globIgnores = ["**/*.map", "**/stats.html"];
        return config;
      },
      extendGenerateSWOptions(config) {
        // Make sure common asset types are precached
        config.globPatterns = ["**/*.{js,css,html,ico,png,svg,webp,woff2}"];
        // Always include entry point so Workbox never says “nothing to precache”
        config.additionalManifestEntries = [
          { url: `${base}index.html`, revision: null },
        ];
        // Runtime caches
        config.runtimeCaching = [
          // Public interface JSON (e.g., /interface/eng00.json)
          {
            urlPattern: ({ url }) =>
              url.pathname.startsWith(`${base}interface/`),
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: `interface-${site}`,
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
              },
            },
          },
          // API calls
          {
            urlPattern: ({ url }) => url.pathname.startsWith(`${base}api/`),
            handler: "NetworkFirst",
            options: {
              cacheName: `api-${site}`,
              networkTimeoutSeconds: 4,
            },
          },
        ];
        return config;
      },

      extendManifestJson(manifest) {
        // You can override with src/sites/<site>/meta.json if you have names there
              extendManifestJson(manifest) {
        // Prefer values in meta.pwa.*, but only fall back on undefined/null
        const pwaName = definedOr(
          getIn(meta, ['pwa', 'name']),
          'DBS 2026'
        );
        const pwaShort = definedOr(
          getIn(meta, ['pwa', 'shortName']),
          'DBS'
        );
        manifest.name = pwaName;
        manifest.short_name = pwaShort;

        manifest.scope = base;
        manifest.start_url = base;
        manifest.display = "standalone";
        manifest.background_color = "#111111";
        manifest.theme_color = "#a05a2c";
        // If icons already exist in your manifest, this won’t overwrite them
        manifest.icons = manifest.icons?.length
          ? manifest.icons
          : [
              {
                src: `${base}icons/icon-192.png`,
                sizes: "192x192",
                type: "image/png",
              },
              {
                src: `${base}icons/icon-512.png`,
                sizes: "512x512",
                type: "image/png",
              },
              {
                src: `${base}icons/maskable-icon-192.png`,
                sizes: "192x192",
                type: "image/png",
                purpose: "maskable any",
              },
              {
                src: `${base}icons/maskable-icon-512.png`,
                sizes: "512x512",
                type: "image/png",
                purpose: "maskable any",
              },
            ];
        return manifest;
      },
    },
  };
});
