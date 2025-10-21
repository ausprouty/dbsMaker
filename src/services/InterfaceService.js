// src/services/InterfaceService.js
// Loads, validates, caches, and installs interface translations for a given HL.
// - Saves full payload (with meta) to IndexedDB
// - Installs only content (everything EXCEPT 'meta') into Vue I18n
// - Sets <html lang> and dir from meta

import { i18n } from "src/lib/i18n";
import { http } from "src/lib/http";
import { pollTranslationUntilComplete } from "src/services/TranslationPollingService";
import {
  getInterfaceFromDB,
  saveInterfaceToDB,
} from "src/services/IndexedDBService";
import { normId } from "src/utils/normalize";

// debug setup
import { debug } from "src/lib/debug";
const log = debug("InterfaceService");
const net = debug("InterfaceService:net");

// Fallback language
const FALLBACK_HL = "eng00";

// Allow all top-level namespaces EXCEPT these
const BLOCK_NS = new Set(["meta"]);

/* ---------------------------- guards & helpers ---------------------------- */

const isObj = (v) => v && typeof v === "object" && !Array.isArray(v);

function safeParseJson(text) {
  try {
    return JSON.parse(text);
  } catch (e) {
    const head = String(text || "").slice(0, 180);
    throw new Error(`[Interface] JSON parse failed. Head: ${head}`);
  }
}

function setByPath(root, path, value) {
  let obj = root;
  for (let i = 0; i < path.length - 1; i++) {
    const k = path[i];
    obj[k] = obj[k] || {};
    obj = obj[k];
  }
  obj[path[path.length - 1]] = value;
}

/**
 * Return a shallow copy of the payload with any BLOCK_NS removed.
 * (i.e., keep everything except 'meta')
 */
function stripBlockedTopLevel(payload) {
  if (!isObj(payload)) return null;
  const out = {};
  for (const [k, v] of Object.entries(payload)) {
    if (!BLOCK_NS.has(k)) out[k] = v;
  }
  return out;
}

function htmlLangFromMeta(meta, hl) {
  return meta?.languageCodeISO || meta?.languageCodeHL || hl;
}

function dirFromMeta(meta) {
  const d = String(meta?.direction || "").toLowerCase();
  return d === "rtl" || d === "ltr" ? d : "";
}

/**
 * Walk a nested tree and keep only string leaves.
 * (Light validation: ensures values are strings; no destructive writes to i18n.)
 */
function validateMessagesTree(bundle) {
  const bad = [];
  const okTree = {};

  function walk(path, val) {
    if (typeof val === "string") {
      setByPath(okTree, path, val);
      return;
    }
    if (isObj(val)) {
      for (const key of Object.keys(val)) {
        walk(path.concat(key), val[key]);
      }
      return;
    }
    // non-string/obj values are considered invalid message entries
    bad.push({ key: path.join("."), reason: `non-string (${typeof val})` });
  }

  if (isObj(bundle)) walk([], bundle);

  return { okTree, bad };
}

/* ---------------------------------- main --------------------------------- */

/**
 * Load and install the translated interface for a given HL.
 *
 * @param {string} languageCodeHL - e.g., "eng00"
 * @param {boolean} [hasRetried=false] - internal guard to avoid infinite loops
 * @returns {Promise<object|undefined>} The validated message tree that was
 *   installed (okTree), or undefined on failure.
 */
export async function getTranslatedInterface(
  languageCodeHL,
  hasRetried = false
) {
  const hl = normId(languageCodeHL);
  const app = normId(import.meta.env.VITE_APP) || "default";
  console.log ('in getTranslatedInterface for ' + hl);

  if (!hl) {
    console.error("[InterfaceService] Missing languageCodeHL", {
      languageCodeHL,
    });
    if (!hasRetried && FALLBACK_HL !== languageCodeHL) {
      return getTranslatedInterface(FALLBACK_HL, true);
    }
    return;
  }

  log(`load start`, { app, hl });

  try {
    /* 1) Try IndexedDB first ------------------------------------------------ */
    let payload = await getInterfaceFromDB(hl);
    const hasIDB = isObj(payload) && Object.keys(payload).length > 0;
    payload = hasIDB ? payload : null;

    log("from IDB", {
      has: hasIDB,
      keys: hasIDB ? Object.keys(payload).length : 0,
    });

    /* 2) If missing/empty, fetch from API ---------------------------------- */
    if (!payload) {
      // http.get will add root url plus /api
      const apiPath = `/v2/translate/text/interface/${app}/${hl}`;
      net("GET", apiPath);

      const { status, headers, data } = await http.get(apiPath, {
        responseType: "text",
        transformResponse: (v) => v,
        validateStatus: () => true,
      });

      const h = Object.fromEntries(
        Object.entries(headers || {}).map(([k, v]) => [k.toLowerCase(), v])
      );
      console.log (h);
      const ctype = String(h["content-type"] || "");
      const body = String(data ?? "");

      try {
        console.groupCollapsed("[InterfaceService] response", status, ctype);
        console.log(h);
        console.log(body.slice(0, 180));
        console.groupEnd();
      } catch {}

      if (status < 200 || status >= 300) {
        throw new Error(`HTTP ${status} from ${apiPath}`);
      }
      if (!ctype.includes("application/json")) {
        throw new Error(
          `[interface] non-JSON from API. CT=${ctype} HEAD=${body.slice(
            0,
            120
          )}`
        );
      }

      const parsed = safeParseJson(body);
      payload = parsed?.data ?? parsed ?? null;

      const meta = payload?.meta ?? {};
      console.log (meta);
      if (meta?.translationComplete) {
        await saveInterfaceToDB(hl, payload); // persist full payload (incl. meta)
      } else {
        // I know there is a value stored in the .env file, but we are
        // not using it.  This cronKey came from the api and allows
        // us to focus on translating the text we need NOW.
        cronKey = meta?.cronKey;
        console.log (cronKey);
        if (cronKey) {
            // http.get will add root url plus /api
          http
            .get(`/translate/cron/${encodeURIComponent(cronKey)}`)
            .catch(() => {});
        }
        console.log ('we are pollingtranslation of interface');
        // Begin polling; it will persist to IDB as progress is made
        pollTranslationUntilComplete({
          languageCodeHL: hl,
          translationType: "interface",
          apiUrl: apiPath,
          dbSetter: (hlCode, data) => saveInterfaceToDB(hlCode, data),
          maxAttempts: 5,
          interval: 300,
        });
      }
    }

    /* 3) Install into i18n (merge-only, exclude 'meta') -------------------- */
    if (isObj(payload)) {
      const meta = payload.meta ?? {};
      const content = stripBlockedTopLevel(payload); // everything except 'meta'

      if (import.meta.env.DEV) {
        console.log (meta);
        const beforeKeys = Object.keys(i18n.global.getLocaleMessage(hl) || {});
        const incomingKeys = Object.keys(content || {});
        const dropped = Object.keys(payload || {}).filter((k) =>
          BLOCK_NS.has(k)
        );
        console.log("[i18n] incoming top-level keys:", incomingKeys);
        if (dropped.length) console.warn("[i18n] dropped namespaces:", dropped);
        console.log("[i18n] before-merge keys:", beforeKeys);
      }

      // Validate values are strings and shape is sane (non-destructive)
      console.log(content)
      const { okTree, bad } = validateMessagesTree(content);
      console.log (okTree);

      if (bad.length) {
        console.warn(
          "[i18n] Non-string entries dropped (showing up to 20):",
          bad.slice(0, 20)
        );
        console.warn(`[i18n] Total non-string entries: ${bad.length}`);
      }

      if (!okTree || !Object.keys(okTree).length) {
        console.warn("[i18n] No valid keys after validation for", hl);
        if (!hasRetried && hl !== FALLBACK_HL) {
          return getTranslatedInterface(FALLBACK_HL, true);
        }
        return; // nothing to merge
      }

      // *** MERGE ONLY (non-destructive). Keep anything already present. ***
      i18n.global.mergeLocaleMessage(hl, okTree);
      i18n.global.locale.value = hl;

      if (import.meta.env.DEV) {
        const afterKeys = Object.keys(i18n.global.getLocaleMessage(hl) || {});
        console.log("[i18n] after-merge keys:", afterKeys);
      }

      // Accessibility / layout hints from meta
      const htmlLang = htmlLangFromMeta(meta, hl);
      document.documentElement.setAttribute("lang", htmlLang);

      const dir = dirFromMeta(meta);
      if (dir) document.documentElement.setAttribute("dir", dir);

      return okTree;
    }

    // 4) Fallback once if nothing came back
    if (!hasRetried && hl !== FALLBACK_HL) {
      return getTranslatedInterface(FALLBACK_HL, true);
    }
  } catch (error) {
    console.error(`[InterfaceService] Load failed for ${hl}`, error);
    if (!hasRetried && hl !== FALLBACK_HL) {
      return getTranslatedInterface(FALLBACK_HL, true);
    }
  }
}
