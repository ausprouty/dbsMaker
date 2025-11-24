// src/services/TranslationPollingService.js
// Pure poller: GET status -> (require cronKey) -> nudge cron if not complete
// -> persist -> notify. No i18n, no DOM, no merging.

import { http } from "src/lib/http";
import { normId } from "src/utils/normalize";
import {
  extractTranslationPayload,
  isComplete,
} from "src/services/TranslationPayload";

// De-duplicate identical concurrent polls
const inFlight = new Map();
const ALLOWED_TYPES = new Set(["interface", "commonContent", "lessonContent"]);

/**
 * Polls the translation endpoint until complete (meta.complete === true).
 *
 * @param {Object} opts
 * @param {string} opts.languageCodeHL
 * @param {"interface"|"commonContent"|"lessonContent"} opts.translationType
 * @param {string} opts.apiUrl                  // GET endpoint to read status/payload
 * @param {function(string, any): Promise<void>} opts.dbSetter
 * @param {object=} opts.store
 * @param {function(any):void=} opts.storeSetter
 * @param {function(string, any):void=} opts.onInstall
 * @param {number=} opts.maxAttempts            // default 5
 * @param {number=} opts.interval               // ms between polls (default 300)
 * @param {boolean=} opts.requireCronKey        // default true: error if missing
 * @returns {Promise<any>} resolves with payload when complete
 */
export function pollTranslationUntilComplete({
  languageCodeHL,
  translationType,
  apiUrl,
  dbSetter,
  store,
  storeSetter,
  onInstall,
  maxAttempts = 5,
  interval = 300,
  requireCronKey = true,
}) {
  if (!ALLOWED_TYPES.has(translationType)) {
    throw new Error(
      `[TranslationPollingService] Unsupported type: ${translationType}`
    );
  }

  const hl = normId(languageCodeHL);
  const key = `${translationType}:${hl}:${apiUrl}`;

  function withCacheBuster(apiUrl, attempt) {
    // Keep this just for debugging
    //console.log("withCacheBuster in:", apiUrl);

    // Split into [base+path, hash]
    const hashIndex = apiUrl.indexOf("#");
    const beforeHash = hashIndex === -1 ? apiUrl : apiUrl.slice(0, hashIndex);
    const hash = hashIndex === -1 ? "" : apiUrl.slice(hashIndex); // includes '#'

    // Split into [base, query]
    const qIndex = beforeHash.indexOf("?");
    const base = qIndex === -1 ? beforeHash : beforeHash.slice(0, qIndex);
    const query = qIndex === -1 ? "" : beforeHash.slice(qIndex + 1);

    const params = new URLSearchParams(query);
    params.set("cb", Date.now().toString());
    if (Number.isFinite(attempt)) {
      params.set("attempt", String(attempt));
    }

    const qs = params.toString();
    const out = base + (qs ? "?" + qs : "") + hash;

    //console.log("withCacheBuster out:", out);
    return out;
  }

  if (inFlight.has(key)) {
    return inFlight.get(key);
  }

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  const getCronKey = (t) => {
    console.log(t);
    if (!t || typeof t !== "object") return "";
    const k =
      t?.meta?.cronKey ??
      t?.data?.meta?.cronKey ??
      t?.translation?.meta?.cronKey ?? // optional extra safety
      null;
    console.log("CRONKEY -- getCronKey received " + k);
    return k == null ? "" : String(k).trim();
  };

  const nudgeCron = async (cronKey, attempt = 0) => {
    const apiUrl = `/v2/translate/cron/${encodeURIComponent(cronKey)}`;
    const url = withCacheBuster(apiUrl, attempt);
    console.log("CRONKEY -- " + url);
    // Fire-and-forget, but await to surface network errors in logs;
    // we still continue polling even if this call fails.
    try {
      await http.get(url, {
        headers: {
          "Cache-Control": "no-cache", // don’t serve from cache
          Pragma: "no-cache",
          "If-Modified-Since": "0",
        },
      });
    } catch (err) {
      console.warn("[TranslationPollingService] cron trigger failed:", err);
    }
  };

  const p = (async () => {
    try {
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        // 1) Read current status/payload
        console.log(apiUrl);
        const url = withCacheBuster(apiUrl, attempt);
        console.log(url);
        const { data: resData } = await http.get(url, {
          headers: {
            "Cache-Control": "no-cache", // don’t serve from cache
            Pragma: "no-cache",
            "If-Modified-Since": "0",
          },
        });
        const translation = extractTranslationPayload(resData);
        console.log(translation);
        if (!translation) {
          throw new Error(
            `[TranslationPollingService] Empty payload for ${apiUrl}`
          );
        }
        // 2) Complete? -> persist -> notify -> return
        if (isComplete(translation)) {
          console.log("HL");
          console.log(hl);
          await dbSetter(translation);
          if (typeof storeSetter === "function") {
            try {
              storeSetter(store, translation);
            } catch (e) {
              console.warn("[TranslationPollingService] storeSetter threw:", e);
            }
          }
          if (typeof onInstall === "function") {
            try {
              onInstall(hl, translation);
            } catch (e) {
              console.warn("[TranslationPollingService] onInstall threw:", e);
            }
          }
          return translation;
        }

        // 3) Not complete yet — require cronKey if configured
        const cronKey = getCronKey(translation);
        if (requireCronKey && cronKey === "") {
          throw new Error(
            "[TranslationPollingService] Missing cronKey in translation.meta"
          );
        }

        // 4) Nudge backend cron (if we have a key), then wait and retry
        if (cronKey !== "") {
          await nudgeCron(cronKey);
        }

        if (attempt < maxAttempts) {
          await sleep(interval);
          continue;
        }

        // 5) Max attempts exhausted
        throw new Error(
          `[TranslationPollingService] Max attempts reached without completion: ${key}`
        );
      }
    } finally {
      inFlight.delete(key);
    }
  })();

  inFlight.set(key, p);
  return p;
}
