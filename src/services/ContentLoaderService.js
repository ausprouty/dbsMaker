// src/services/ContentLoaderService.js
// First-stop orchestrator for content (lesson/common/etc.)
// Order: Store -> IndexedDB -> API -> (if incomplete) poll -> persist -> store.
// No i18n/DOM logic here.

import { http } from "src/lib/http";
import {
  extractTranslationPayload,
  isComplete,
} from "src/services/TranslationPayload";
import { pollTranslationUntilComplete } from "src/services/TranslationPollingService";

/**
 * @typedef GetContentWithFallbackOptions
 * @property {string} key                    // unique key for logs/debug
 * @property {any} store                     // Pinia store instance
 * @property {(store:any)=>any} storeGetter  // read from store
 * @property {(store:any, data:any)=>void} storeSetter // write to store
 * @property {()=>Promise<any>} dbGetter     // read from IndexedDB
 * @property {(data:any)=>Promise<void>} dbSetter // write to IndexedDB
 * @property {string} apiUrl                 // GET endpoint (http adds /api root)
 * @property {string} languageCodeHL         // HL (eng00, zhhant, etc.)
 * @property {"lessonContent"|"commonContent"|"interface"} translationType
 * @property {(data:any)=>void} [onInstall]  // called on poll completion (store update)
 * @property {boolean} [requireCronKey=true] // enforce meta.cronKey presence
 * @property {number} [maxAttempts=5]
 * @property {number} [interval=300]         // ms
 */

/**
 * Loads content from Pinia store, IndexedDB, or API.
 * If translation is not complete (meta.complete !== true), starts the poller.
 *
 * @param {GetContentWithFallbackOptions} opts
 * @returns {Promise<any>} The best-available payload (even if not complete yet)
 */
export async function getContentWithFallback(opts) {
  const {
    key,
    store,
    storeGetter,
    storeSetter,
    dbGetter,
    dbSetter,
    apiUrl,
    languageCodeHL,
    translationType,
    onInstall, // optional: how to update the store when poll completes
    requireCronKey = true,
    maxAttempts = 5,
    interval = 300,
  } = opts;

  if (
    !key ||
    !store ||
    !storeGetter ||
    !storeSetter ||
    !dbGetter ||
    !dbSetter ||
    !apiUrl ||
    !languageCodeHL ||
    !translationType
  ) {
    throw new Error("[ContentLoaderService] Missing required options");
  }

  // 1) Store fast path
  try {
    const fromStore = storeGetter(store);
    if (fromStore) {
      // If incomplete, kick polling, but return immediately with current data.
      if (!isComplete(fromStore)) {
        console.log("Is not complete in Store: " + apiUrl);
        void startPoll({
          languageCodeHL,
          translationType,
          apiUrl,
          dbSetter,
          storeSetter: (data) => storeSetter(store, data),
          onInstall, // often same as storeSetter bound
          requireCronKey,
          maxAttempts,
          interval,
        });
      }
      console.log("fromStore");
      console.log(fromStore);
      return fromStore;
    }
  } catch (e) {
    console.warn(`[ContentLoaderService] storeGetter threw for ${key}:`, e);
  }

  // 2) IndexedDB fallback
  try {
    const fromDb = await dbGetter();
    if (fromDb) {
      // hydrate store
      try {
        storeSetter(store, fromDb);
      } catch (e) {
        console.warn("[ContentLoaderService] storeSetter threw (DB path):", e);
      }
      if (!isComplete(fromDb)) {
        console.log("Is not complete in Database: " + apiUrl);
        void startPoll({
          languageCodeHL,
          translationType,
          apiUrl,
          dbSetter,
          storeSetter: (data) => storeSetter(store, data),
          onInstall,
          requireCronKey,
          maxAttempts,
          interval,
        });
      }
      console.log("fromDB");
      console.log(fromDb);
      return fromDb;
    }
  } catch (e) {
    console.warn(`[ContentLoaderService] dbGetter threw for ${key}:`, e);
  }

  // 3) API load
  try {
    const { data: resData } = await http.get(apiUrl);
    const translation = extractTranslationPayload(resData);
    if (!translation) {
      throw new Error(`[ContentLoaderService] Empty payload for ${key}`);
    }

    // persist to DB
    try {
      console.log("DATA TO DB");
      console.log(translation);
      await dbSetter(translation);
    } catch (e) {
      console.warn("[ContentLoaderService] dbSetter threw (API path):", e);
    }
    // update store
    try {
      storeSetter(store, translation);
    } catch (e) {
      console.warn("[ContentLoaderService] storeSetter threw (API path):", e);
    }

    // 4) If not complete, start poll but return current data immediately
    if (!isComplete(translation)) {
      console.log("Is not complete from Api : " + apiUrl);
      void startPoll({
        languageCodeHL,
        translationType,
        apiUrl,
        dbSetter,
        storeSetter: (payload) => storeSetter(store, payload),
        onInstall,
        requireCronKey,
        maxAttempts,
        interval,
      });
    }
    console.log(translation);
    return translation;
  } catch (error) {
    console.error(`❌ Failed to load ${key} from API:`, error);
    console.error(apiUrl);
    throw error;
  }
}

/** Internal: delegate to the pure poller with pass-through options */
function startPoll({
  languageCodeHL,
  translationType,
  apiUrl,
  dbSetter,
  storeSetter,
  onInstall,
  requireCronKey,
  maxAttempts,
  interval,
}) {
  pollTranslationUntilComplete({
    languageCodeHL,
    translationType,
    apiUrl,
    dbSetter,
    storeSetter,
    onInstall,
    requireCronKey,
    maxAttempts,
    interval,
  }).catch((e) => {
    console.warn(
      "[ContentLoaderService] Polling ended with warning:",
      e?.message || e
    );
  });
}
