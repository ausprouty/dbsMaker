// src/utils/normalize.js
import { unref } from 'vue'

// Pull first item if it's an array (common with route params)
export function pickFirst(v) {
  const r = unref(v)
  return Array.isArray(r) ? r[0] : r
}

// Normalize a string-ish id (study, HL codes, etc.)
export function normId(v) {
  const raw = pickFirst(v)
  const s = String(raw == null ? '' : raw).trim()
  return s.toLowerCase() === 'undefined' ? '' : s
}

// Normalize numeric-like ids (JF codes, lesson numbers, positions)
// Returns a stringified number if numeric, else the trimmed string.
export function normIntish(v) {
  const s = normId(v)
  if (!s) return ''
  const n = Number(s)
  return Number.isFinite(n) ? String(n) : s
}

// Strict positive integer (returns number or undefined)
export function normPositiveInt(v) {
  const s = normId(v)
  if (!/^\d+$/.test(s)) return undefined
  const n = Number(s)
  return n > 0 ? n : undefined
}

// Param-safe string ('' if missing/'undefined'/'null')
export function normParamStr(v) {
  const s = normId(v)
  if (!s) return ''
  if (s.toLowerCase() === 'null') return ''
  return s
}

// Optional helper for required params
export function assertRequired(obj, keys, where = 'function') {
  const o = unref(obj) || {}
  const missing = keys.filter(k => !normId(o[k]))
  if (missing.length) {
    const msg = `Missing required: ${missing.join(', ')} in ${where}`
    throw new Error(msg)
  }
}

// If v is an object, pull a sensible identifier; otherwise return v
export function fromObjId(v, keys = ['slug','code','id','key','name','title']) {
  const raw = unref(v)
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    for (let i = 0; i < keys.length; i++) {
      const k = keys[i]
      const val = raw[k]
      if (val !== undefined && val !== null && String(val).trim() !== '') {
        return val
      }
    }
    return ''
  }
  return raw
}

// Safe for URL path segments
export function normPathSeg(v) {
  return encodeURIComponent(normId(fromObjId(v)))
}

// For comparing keys like series names/IDs consistently
export function normKey(v) {
  return normId(fromObjId(v)).replace(/[\s_-]+/g, '').toLowerCase()
}

// Basic object guards (ref-aware)
export function isObj(v) {
  const x = unref(v)
  return !!x && typeof x === 'object' && !Array.isArray(x)
}
export function safeObj(v) {
  const x = unref(v)
  return (x && typeof x === 'object' && !Array.isArray(x)) ? x : {}
}
export function safeKeys(o) {
  const x = unref(o)
  return (x && typeof x === 'object' && !Array.isArray(x)) ? Object.keys(x) : []
}

// Join a base path and a relative path cleanly (ref-aware)
export function withBase(base, path = '') {
  const b0 = String(unref(base) || '/').replace(/\/+$/, '/')
  const p0 = String(unref(path) || '').replace(/^\/+/, '')
  return b0 + p0
}

// Turn “true/1/yes/on” and “false/0/no/off” into booleans
export function normBoolish(v, def = false) {
  const s = normId(v)
  if (!s) return def
  if (/^(true|1|yes|y|on)$/i.test(s)) return true
  if (/^(false|0|no|n|off)$/i.test(s)) return false
  return def
}

// HL must be 3 letters + 2 digits (case preserved)
export function isHLCode(v) {
  const s = normParamStr(v)
  return /^[A-Za-z]{3}\d{2}$/.test(s)
}

// Return the original (trimmed) HL if valid; '' otherwise (no lowercasing)
export function normHL(v) {
  const s = normParamStr(v)
  return isHLCode(s) ? s : ''
}

// JF is numeric; returns '' if invalid
export function normJF(v) {
  const s = normParamStr(v)
  return /^\d+$/.test(s) ? s : ''
}

// Variant can be null; lowercase + whitelist [a-z0-9-]
export function normVariant(v) {
  let s = normId(v)
  if (!s || s.toLowerCase() === 'null') return null
  s = s.toLowerCase().replace(/[^a-z0-9-]/g, '')
  return s || null
}

// Canonical study key for lookups / store keys (lowercased, safe chars)
export function normStudyKey(v) {
  const s = normId(v) // unref + pickFirst + trim + 'undefined' → ''
  return s ? s.toLowerCase().replace(/[^a-z0-9-]/g, '') : ''
}
