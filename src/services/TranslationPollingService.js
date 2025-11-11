// src/services/TranslationPollingService.js
// Pure poller: GET status -> (require cronKey) -> nudge cron if not complete
// -> persist -> notify. No i18n, no DOM, no merging.

import { http } from "src/lib/http";
import { normId } from "src/utils/normalize";

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

  if (inFlight.has(key)) {
    return inFlight.get(key);
  }

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  const extractTranslation = (data) =>
    data?.payload ?? data?.translation ?? data ?? null;

  const isComplete = (t) => Boolean(t?.meta?.complete === true);

  const getCronKey = (t) => {
    if (!t || typeof t !== "object") return "";
    const k =
      t?.meta?.cronKey ??
      t?.data?.meta?.cronKey ??
      t?.translation?.meta?.cronKey ?? // optional extra safety
      null;
    return k == null ? "" : String(k).trim();
  };

  const nudgeCron = async (cronKey) => {
    const url = `/v2/translate/cron/${encodeURIComponent(cronKey)}`;
    // Fire-and-forget, but await to surface network errors in logs;
    // we still continue polling even if this call fails.
    try {
      await http.get(url);
    } catch (err) {
      console.warn("[TranslationPollingService] cron trigger failed:", err);
    }
  };

  const p = (async () => {
    try {
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        // 1) Read current status/payload
        const res = await http.get(apiUrl);
        const data = res?.data;
        const translation = extractTranslation(data);

        // 2) Complete? -> persist -> notify -> return
        if (isComplete(translation)) {
          await dbSetter(hl, translation);
          if (typeof storeSetter === "function") {
            try {
              storeSetter(translation);
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
