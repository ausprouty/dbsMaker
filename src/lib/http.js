// src/lib/http.js
// A single Axios instance + opt-in guards for requests/responses.
// Safe to import from services/components without pulling in Quasar boot.

import axios from "axios";

/* ---------- helpers ---------- */

function clean(val) {
  if (!val) return "";
  var v = String(val);
  v = v.replace(/^["']|["']$/g, ""); // strip surrounding quotes
  v = v.replace(/\s*[#;].*$/, ""); // strip inline comments
  v = v.trim().replace(/\/+$/, ""); // trim + drop trailing slashes
  return v;
}

function asOrigin(urlStr) {
  try {
    var u = new URL(urlStr);
    if (u.protocol === "https:" || u.protocol === "http:") {
      return u.origin;
    }
  } catch (e) {}
  return "";
}

function discoverApiOrigin() {
  // 1) .env (mode-aware: .env, .env.<mode>)
  var fromEnv = asOrigin(clean(import.meta.env.VITE_API));
  if (fromEnv) return fromEnv;

  // 2) <meta name="api-origin" content="https://..."> (in index.html)
  try {
    if (typeof document !== "undefined") {
      var meta = document.querySelector('meta[name="api-origin"]');
      if (meta) {
        var m = asOrigin(clean(meta.getAttribute("content")));
        if (m) return m;
      }
    }
  } catch (e) {}

  // 3) window.__API__ = 'https://...'
  try {
    if (typeof window !== "undefined" && window.__API__) {
      var w = asOrigin(clean(window.__API__));
      if (w) return w;
    }
  } catch (e) {}

  return "";
}

/* ---------- base URL resolution ---------- */

var PROD = !!import.meta.env.PROD;

// Explicit env servers (preferred)
var API_PROD = asOrigin(clean(import.meta.env.VITE_API_PRODUCTION));
var API_DEV = asOrigin(clean(import.meta.env.VITE_API_DEVELOPMENT));

// Optional override (keeps your existing discovery chain)
var API_OVERRIDE = discoverApiOrigin();

function pickApiOrigin() {
  // 1) Hard override if provided (meta tag / window.__API__ / VITE_API)
  if (API_OVERRIDE) return API_OVERRIDE;

  // 2) Choose by build type
  if (PROD) return API_PROD;
  return API_DEV;
}

var API_ORIGIN = pickApiOrigin();

// Last-resort safety checks
if (PROD && !API_ORIGIN) {
  // eslint-disable-next-line no-console
  console.error(
    "[http] Missing API origin for PROD. Set VITE_API_PRODUCTION (or VITE_API / meta / window.__API__)."
  );
}
if (!PROD && !API_ORIGIN) {
  // eslint-disable-next-line no-console
  console.error(
    "[http] Missing API origin for DEV. Set VITE_API_DEVELOPMENT (or VITE_API / meta / window.__API__)."
  );
}

// Dev uses proxy by default if no origin is configured.
// Prod must be absolute.
var BASE_URL = API_ORIGIN ? API_ORIGIN + "/api" : "/api";

/* ---------- primary axios instance ---------- */

export var http = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: {
    Accept: "application/json, text/plain, */*",
  },
});

/* ---------- guards (interceptors) ---------- */

function installRequestGuards(ax) {
  ax.interceptors.request.use(function (cfg) {
    // Normalize relative URLs (keep absolute ones)
    var url = String(cfg && cfg.url ? cfg.url : "");
    if (!/^https?:\/\//i.test(url)) {
      cfg.url = "/" + url.replace(/^\/+/, "");
    }

    // In PROD, rewrite any localhost usage to real API.
    if (PROD) {
      try {
        if (/^https?:\/\//i.test(cfg.url)) {
          var abs = new URL(cfg.url);
          if (abs.hostname === "localhost") {
            cfg.url = BASE_URL + abs.pathname + abs.search + abs.hash;
          }
        }
      } catch (e) {}
      try {
        if (cfg.baseURL) {
          var b = new URL(cfg.baseURL);
          if (b.hostname === "localhost") {
            cfg.baseURL = BASE_URL;
          }
        }
      } catch (e) {}
    }

    // Correlation id
    var rid = Math.random().toString(36).slice(2) + Date.now().toString(36);
    cfg.headers["X-Request-Id"] = rid;

    // Optional compile-time key
    var k = String(import.meta.env.VITE_API_KEY || "").trim();
    if (k) cfg.headers["X-API-Key"] = k;

    // Compile-time POST auth code (site-specific per build)
    var postCode = String(import.meta.env.VITE_POST_AUTH_CODE || "").trim();

    // Runtime tokens
    try {
      var bearer = localStorage.getItem("auth_token") || "";

      var method = cfg && cfg.method ? String(cfg.method).toUpperCase() : "";
      var urlPath = String(cfg && cfg.url ? cfg.url : "");

      // NOTE: cfg.url is normalized earlier to start with "/"
      var isBiblePassage =
        method === "POST" && /\/v2\/bible\/passage\/?$/i.test(urlPath);
      console.log(
        "[http] method:",
        method,
        "url:",
        urlPath,
        "isBiblePassage:",
        isBiblePassage
      );

      // For bible passage POSTs, Authorization must carry the post auth code.
      // Keep the user token available in a separate header if present.
      if (isBiblePassage) {
        if (isBiblePassage && !postCode) {
          console.error(
            "[http] Missing VITE_POST_AUTH_CODE for bible passage POST"
          );
        }
        if (postCode) {
          cfg.headers["Authorization"] = "Bearer " + postCode;
        }
        if (bearer) cfg.headers["X-User-Token"] = bearer;
      } else {
        if (bearer) cfg.headers["Authorization"] = "Bearer " + bearer;
      }

      var second = localStorage.getItem("second_token") || "";
      if (second) cfg.headers["X-Second-Token"] = second;
    } catch (e) {}

    // cfg.withCredentials = true // enable if needed
    return cfg;
  });
}

function installResponseGuards(ax) {
  ax.interceptors.response.use(
    function (r) {
      return r;
    },
    async function (err) {
      var cfg = err && err.config ? err.config : null;
      var status = err && err.response ? err.response.status : 0;
      if (status === 401) return Promise.reject(err);

      var method = cfg && cfg.method ? String(cfg.method).toUpperCase() : "";
      var isGet = method === "GET";
      var is5xx = status >= 500 && status <= 599;
      var isTimeout = err && err.code === "ECONNABORTED";
      var noResp = err && !err.response;

      if (cfg && isGet && (is5xx || isTimeout || noResp)) {
        var c = typeof cfg.__retryCount === "number" ? cfg.__retryCount : 0;
        if (c < 2) {
          cfg.__retryCount = c + 1;
          var delay = Math.min(250 * Math.pow(2, c), 2000);
          await new Promise(function (res) {
            setTimeout(res, delay);
          });
          return ax.request(cfg);
        }
      }
      return Promise.reject(err);
    }
  );
}

/* ---------- public API ---------- */

/**
 * Attach request/response guards to the exported `http` instance.
 * Call this once from your Quasar boot file (e.g., src/boot/axios.js).
 */
export function attachInterceptors() {
  installRequestGuards(http);
  installResponseGuards(http);
}

/**
 * Optional: apply the same defaults/guards to the global `axios` export,
 * in case any legacy code still does `import axios from 'axios'`.
 * Call from boot if you really need it.
 */
export function patchGlobalAxios() {
  axios.defaults.baseURL = BASE_URL;
  axios.defaults.timeout = 15000;
  axios.defaults.headers.common["Accept"] = "application/json, text/plain, */*";
  installRequestGuards(axios);
  installResponseGuards(axios);
}

/* ---------- tiny debug helpers ---------- */

export function getApiOrigin() {
  return API_ORIGIN;
}
export function getBaseUrl() {
  return BASE_URL;
}
export function isProd() {
  return PROD;
}
