// src/lib/debug.js
// Lightweight namespaced logger with wildcard enable/disable.
//
// Enable logs at runtime (no rebuild):
//   - In the URL:            ?debug=InterfaceService*            (comma-separated OK)
//   - From console (persist): localStorage.DEBUG = 'InterfaceService:net,Menu*'; location.reload()
//   - From env at build:      VITE_DEBUG="InterfaceService*,ShareLink"
// Disable:
//   localStorage.removeItem('DEBUG'); location.reload()
//
// In code:
//   import { debug, setDebug, getDebug } from 'src/lib/debug'
//   const log = debug('InterfaceService')
//   const net = debug('InterfaceService:net')
//   log('hello');               // logs only if enabled
//   net.groupCollapsed('resp'); // safe even if disabled
//   net.log({status: 200})
//   net.groupEnd()
//   const intl = log.child('intl'); // -> [InterfaceService:intl] ...
//
// Patterns:
//   '*' matches everything
//   'InterfaceService' matches exactly that namespace
//   'InterfaceService*' matches it and all sub-namespaces
//   'A,B*' matches either A or anything under B

/* ------------------------------- internals ------------------------------- */

const DEV = typeof import.meta !== 'undefined'
  && import.meta.env
  && !!import.meta.env.DEV;

const ENV_DEBUG = (typeof import.meta !== 'undefined'
  && import.meta.env
  && import.meta.env.VITE_DEBUG)
  ? String(import.meta.env.VITE_DEBUG)
  : '';

function readFromURL() {
  try {
    return new URL(location.href).searchParams.get('debug') || '';
  } catch {
    return '';
  }
}

function readFromLS() {
  try {
    return (typeof localStorage !== 'undefined' && localStorage.getItem('DEBUG')) || '';
  } catch {
    return '';
  }
}

function currentPattern() {
  // Precedence: URL ?debug=... > localStorage.DEBUG > VITE_DEBUG > (off by default)
  return readFromURL() || readFromLS() || ENV_DEBUG || '';
}

function globToRegex(glob) {
  // Supports comma-separated globs, '*' wildcard, case-insensitive match
  const parts = String(glob || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
  if (!parts.length) return null;
  const expr = parts
    .map(p =>
      '^' +
      p.replace(/[.+^${}()|[\]\\]/g, '\\$&') // escape regex
       .replace(/\*/g, '.*') +               // wildcard
      '$'
    )
    .join('|');
  return new RegExp(expr, 'i');
}

let enabledRE = globToRegex(currentPattern());

function isEnabled(ns) {
  return !!(enabledRE && enabledRE.test(ns));
}

function call(method, prefix, args) {
  const c = console;
  const fn = c[method] || c.log;
  try {
    fn.call(c, prefix, ...args);
  } catch {
    // very old consoles or odd environments
    (c.log || Function.prototype)(prefix, ...args);
  }
}

/* --------------------------------- API ---------------------------------- */

/**
 * Set the active debug pattern and persist it to localStorage.
 * @param {string} pattern e.g. "*", "InterfaceService*", "A,B*"
 */
export function setDebug(pattern = '') {
  try {
    if (typeof localStorage !== 'undefined') {
      if (pattern) localStorage.setItem('DEBUG', pattern);
      else localStorage.removeItem('DEBUG');
    }
  } catch {}
  enabledRE = globToRegex(pattern);
}

/**
 * Get the currently effective debug pattern (URL > LS > ENV).
 */
export function getDebug() {
  return readFromURL() || readFromLS() || ENV_DEBUG || '';
}

/**
 * Create a namespaced logger. Callable (logs as console.log) and with helpers.
 * @param {string} ns e.g. "InterfaceService" or "InterfaceService:net"
 */
export function debug(ns) {
  const prefix = `[${ns}]`;

  // callable logger: log('message', obj)
  const logger = (...args) => {
    if (isEnabled(ns)) call('log', prefix, args);
  };

  // standard methods
  logger.log = (...args) => { if (isEnabled(ns)) call('log', prefix, args); };
  logger.info = (...args) => { if (isEnabled(ns)) call('info', prefix, args); };
  logger.warn = (...args) => { if (isEnabled(ns)) call('warn', prefix, args); };
  logger.error = (...args) => { if (isEnabled(ns)) call('error', prefix, args); };
  logger.dir = (...args) => { if (isEnabled(ns) && console.dir) console.dir(...args); };

  // grouping with safe fallbacks
  logger.group = (...args) => {
    if (!isEnabled(ns)) return;
    (console.group || console.log).call(console, prefix, ...args);
  };
  logger.groupCollapsed = (...args) => {
    if (!isEnabled(ns)) return;
    (console.groupCollapsed || console.group || console.log).call(console, prefix, ...args);
  };
  logger.groupEnd = () => {
    if (isEnabled(ns) && console.groupEnd) console.groupEnd();
  };

  // timing
  logger.time = (label = '') => {
    if (!isEnabled(ns)) return;
    (console.time || console.log).call(console, `${prefix} ${label}`);
  };
  logger.timeEnd = (label = '') => {
    if (!isEnabled(ns)) return;
    (console.timeEnd || console.log).call(console, `${prefix} ${label}`);
  };

  // utilities
  logger.enabled = () => isEnabled(ns);
  logger.child = (sub) => debug(`${ns}:${sub}`);

  return logger;
}
