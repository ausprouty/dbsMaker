// src/services/InterfaceService.js
// Loads, validates, caches, installs interface translations for a given HL.
// - Saves full payload (with meta) to IndexedDB
// - Installs only content (everything EXCEPT 'meta') into Vue I18n
// - Sets <html lang> and dir from meta
// - Uses deletion-aware merge so local messages aren't clobbered

import { i18n } from "src/lib/i18n";
import { http } from "src/lib/http";
import { pollTranslationUntilComplete } from "src/services/TranslationPollingService";
import {
  getInterfaceFromDB,
  saveInterfaceToDB,
} from "src/services/IndexedDBService";
import { normId } from "src/utils/normalize";

const FALLBACK_HL = "eng00";
const BLOCK_NS = new Set(["meta"]); // never merge 'meta' into messages

/** Type guards */
function isObj(v) {
  return v && typeof v === "object" && !Array.isArray(v);
}

/** Remove top-level namespaces we do not want in i18n messages */
function stripBlockedTopLevel(payload) {
  if (!isObj(payload)) return {};
  const out = {};
  for (const [k, v] of Object.entries(payload)) {
    if (BLOCK_NS.has(k)) continue; // drop meta et al
    out[k] = v;
  }
  return out;
}

/** Validate that the tree leaves are strings; return okTree + list of bad nodes */
function validateMessagesTree(tree) {
  const ok = {};
  const bad = [];

  function walk(src, dst, path = "") {
    if (!isObj(src)) {
      if (typeof src === "string") return src;
      bad.push(path || "<root>");
      return undefined;
    }
    for (const [k, v] of Object.entries(src)) {
      const p = path ? `${path}.${k}` : k;
      if (isObj(v)) {
        const child = {};
        const out = walk(v, child, p);
        if (out && Object.keys(child).length) {
          dst[k] = child;
        }
      } else if (typeof v === "string") {
        dst[k] = v;
      } else if (v === null || v === "") {
        // deletions handled in merge; keep nothing here
      } else {
        bad.push(p);
      }
    }
    return dst;
  }

  walk(tree, ok, "");
  return { okTree: ok, bad };
}

/** html lang calculation with safe fallbacks */
function htmlLangFromMeta(meta, hl) {
  const m = meta?.language || meta;
  return m?.html || m?.google || m?.code || String(hl || FALLBACK_HL);
}

/** dir from meta if provided */
function dirFromMeta(meta) {
  return meta?.dir || (meta?.rtl ? "rtl" : "");
}

/**
 * Deletion-aware deep merge:
 * - merges nested objects
 * - `null` or empty string "" in the patch deletes the key from target
 * - primitives overwrite
 */
function deepMergeWithDelete(target, patch) {
  if (!isObj(patch)) return target;
  const out = { ...target };
  for (const [k, v] of Object.entries(patch)) {
    if (v === null || v === "") {
      if (k in out) delete out[k];
      continue;
    }
    if (isObj(v)) {
      const base = isObj(out[k]) ? out[k] : {};
      out[k] = deepMergeWithDelete(base, v);
    } else {
      out[k] = v;
    }
  }
  return out;
}

/**
 * Single installer (source of truth):
 *  - strips meta
 *  - validates string leaves
 *  - deepMergeWithDelete into current locale messages
 *  - sets locale and <html lang/dir>
 */
export function installInterfaceMergeOnly(hlRaw, payload) {
  if (!payload) return;
  const hl = normId(hlRaw);

  const meta = payload.meta ?? {};
  const content = stripBlockedTopLevel(payload);
  const { okTree, bad } = validateMessagesTree(content);

  if (bad.length) {
    console.warn(
      "[InterfaceService] Non-string entries dropped (showing up to 20):",
      bad.slice(0, 20)
    );
    if (bad.length > 20) {
      console.warn(
        `[InterfaceService] Total non-string entries dropped: ${bad.length}`
      );
    }
  }

  if (!okTree || !Object.keys(okTree).length) {
    console.warn("[InterfaceService] No valid keys after validation for", hl);
    return;
  }

  // Merge with deletion semantics into current messages
  const current = i18n.global.getLocaleMessage(hl) || {};
  const merged = deepMergeWithDelete(current, okTree);
  i18n.global.setLocaleMessage(hl, merged);
  i18n.global.locale.value = hl;

  // Apply <html lang> and dir from meta
  const htmlLang = htmlLangFromMeta(meta, hl);
  if (typeof document !== "undefined") {
    document.documentElement?.setAttribute("lang", String(htmlLang));
    const dir = dirFromMeta(meta);
    if (dir) document.documentElement.setAttribute("dir", dir);
    else document.documentElement.removeAttribute("dir");
  }
}

/**
 * Fetch interface payload:
 *  - Try IndexedDB
 *  - GET API if missing/stale
 *  - Save to DB
 *  - Install via installInterfaceMergeOnly
 *  - Kick off background poll; on completion, re-install via same installer
 *  - Fallback once to FALLBACK_HL if nothing valid
 */
export async function getTranslatedInterface(hlRaw, hasRetried = false) {
  const hl = normId(hlRaw);
  try {
    // 1) Try DB cache
    const fromDb = await getInterfaceFromDB(hl);
    if (fromDb && isObj(fromDb)) {
      installInterfaceMergeOnly(hl, fromDb);
      // Start background poll to chase the completed artifact
      // (if not complete yet, the poller will nudge cron)
      void startPoll(hl);
      return fromDb;
    }

    // 2) Fetch from API
    const apiPath = `/v2/translate/text/interface/${encodeURIComponent(hl)}`;
    const res = await http.get(apiPath);
    const payload = res?.data?.payload ?? res?.data?.translation ?? res?.data;

    if (isObj(payload)) {
      await saveInterfaceToDB(hl, payload);
      installInterfaceMergeOnly(hl, payload);
      void startPoll(hl);
      return payload;
    }

    // 3) Fallback once
    if (!hasRetried && hl !== FALLBACK_HL) {
      return getTranslatedInterface(FALLBACK_HL, true);
    }
  } catch (err) {
    console.error("[InterfaceService] Load failed for", hl, err);
    if (!hasRetried && hl !== FALLBACK_HL) {
      return getTranslatedInterface(FALLBACK_HL, true);
    }
  }
  return null;
}

/** Kick off background polling and re-install on completion */
function startPoll(hlRaw) {
  const hl = normId(hlRaw);
  const apiPath = `/v2/translate/text/interface/${encodeURIComponent(hl)}`;

  pollTranslationUntilComplete({
    languageCodeHL: hl,
    translationType: "interface",
    apiUrl: apiPath,
    dbSetter: (hlCode, data) => saveInterfaceToDB(hlCode, data),
    maxAttempts: 5,
    interval: 300,
    requireCronKey: true, // enforce presence of cronKey per your contract
    onInstall: installInterfaceMergeOnly, // <-- single source of truth
  }).catch((e) => {
    console.warn(
      "[InterfaceService] Polling ended with warning:",
      e?.message || e
    );
  });
}
