// src/lib/http.js
// A single Axios instance + opt-in guards for requests/responses.
// Safe to import from services/components without pulling in Quasar boot.

import axios from 'axios'

/* ---------- helpers ---------- */

function clean(val) {
  if (!val) return ''
  var v = String(val)
  v = v.replace(/^["']|["']$/g, '')       // strip surrounding quotes
  v = v.replace(/\s*[#;].*$/, '')         // strip inline comments
  v = v.trim().replace(/\/+$/, '')        // trim + drop trailing slashes
  return v
}

function asOrigin(urlStr) {
  try {
    var u = new URL(urlStr)
    if (u.protocol === 'https:' || u.protocol === 'http:') {
      return u.origin
    }
  } catch (e) {}
  return ''
}

function discoverApiOrigin() {
  // 1) .env (mode-aware: .env, .env.<mode>)
  var fromEnv = asOrigin(clean(import.meta.env.VITE_API))
  if (fromEnv) return fromEnv

  // 2) <meta name="api-origin" content="https://..."> (in index.html)
  try {
    if (typeof document !== 'undefined') {
      var meta = document.querySelector('meta[name="api-origin"]')
      if (meta) {
        var m = asOrigin(clean(meta.getAttribute('content')))
        if (m) return m
      }
    }
  } catch (e) {}

  // 3) window.__API__ = 'https://...'
  try {
    if (typeof window !== 'undefined' && window.__API__) {
      var w = asOrigin(clean(window.__API__))
      if (w) return w
    }
  } catch (e) {}

  return ''
}

/* ---------- base URL resolution ---------- */

var PROD = !!import.meta.env.PROD
var API_ORIGIN = discoverApiOrigin()

// Safety net in production: never fall back to localhost.
if (PROD && !API_ORIGIN) {
  API_ORIGIN = 'https://api2.mylanguage.net.au'
}

// Dev uses proxy; Prod must be absolute.
var BASE_URL = PROD ? API_ORIGIN + '/api' : '/api'

/* ---------- primary axios instance ---------- */

export var http = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: {
    Accept: 'application/json, text/plain, */*'
  }
})

/* ---------- guards (interceptors) ---------- */

function installRequestGuards(ax) {
  ax.interceptors.request.use(function (cfg) {
    // Normalize relative URLs (keep absolute ones)
    var url = String(cfg && cfg.url ? cfg.url : '')
    if (!/^https?:\/\//i.test(url)) {
      cfg.url = '/' + url.replace(/^\/+/, '')
    }

    // In PROD, rewrite any localhost usage to real API.
    if (PROD) {
      try {
        if (/^https?:\/\//i.test(cfg.url)) {
          var abs = new URL(cfg.url)
          if (abs.hostname === 'localhost') {
            cfg.url =
              BASE_URL + abs.pathname + abs.search + abs.hash
          }
        }
      } catch (e) {}
      try {
        if (cfg.baseURL) {
          var b = new URL(cfg.baseURL)
          if (b.hostname === 'localhost') {
            cfg.baseURL = BASE_URL
          }
        }
      } catch (e) {}
    }

    // Correlation id
    var rid =
      Math.random().toString(36).slice(2) +
      Date.now().toString(36)
    cfg.headers['X-Request-Id'] = rid

    // Optional compile-time key
    var k = String(import.meta.env.VITE_API_KEY || '').trim()
    if (k) cfg.headers['X-API-Key'] = k

    // Runtime tokens
    try {
      var bearer = localStorage.getItem('auth_token') || ''
      if (bearer) cfg.headers['Authorization'] = 'Bearer ' + bearer
      var second = localStorage.getItem('second_token') || ''
      if (second) cfg.headers['X-Second-Token'] = second
    } catch (e) {}

    // cfg.withCredentials = true // enable if needed
    return cfg
  })
}

function installResponseGuards(ax) {
  ax.interceptors.response.use(
    function (r) { return r },
    async function (err) {
      var cfg = err && err.config ? err.config : null
      var status = err && err.response ? err.response.status : 0
      if (status === 401) return Promise.reject(err)

      var method =
        cfg && cfg.method ? String(cfg.method).toUpperCase() : ''
      var isGet = method === 'GET'
      var is5xx = status >= 500 && status <= 599
      var isTimeout = err && err.code === 'ECONNABORTED'
      var noResp = err && !err.response

      if (cfg && isGet && (is5xx || isTimeout || noResp)) {
        var c = typeof cfg.__retryCount === 'number'
          ? cfg.__retryCount
          : 0
        if (c < 2) {
          cfg.__retryCount = c + 1
          var delay = Math.min(250 * Math.pow(2, c), 2000)
          await new Promise(function (res) {
            setTimeout(res, delay)
          })
          return ax.request(cfg)
        }
      }
      return Promise.reject(err)
    }
  )
}

/* ---------- public API ---------- */

/**
 * Attach request/response guards to the exported `http` instance.
 * Call this once from your Quasar boot file (e.g., src/boot/axios.js).
 */
export function attachInterceptors() {
  installRequestGuards(http)
  installResponseGuards(http)
}

/**
 * Optional: apply the same defaults/guards to the global `axios` export,
 * in case any legacy code still does `import axios from 'axios'`.
 * Call from boot if you really need it.
 */
export function patchGlobalAxios() {
  axios.defaults.baseURL = BASE_URL
  axios.defaults.timeout = 15000
  axios.defaults.headers.common['Accept'] =
    'application/json, text/plain, */*'
  installRequestGuards(axios)
  installResponseGuards(axios)
}

/* ---------- tiny debug helpers ---------- */

export function getApiOrigin() { return API_ORIGIN }
export function getBaseUrl() { return BASE_URL }
export function isProd() { return PROD }
