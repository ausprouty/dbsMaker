import { http } from 'src/lib/http'
import { pollTranslationUntilComplete } from 'src/services/TranslationPollingService'

/**
 * Loads content from Pinia store, IndexedDB, or API.
 * Triggers polling if translation is incomplete.
 */
export async function getContentWithFallback({
  key,
  store,
  storeGetter,
  storeSetter,
  dbGetter,
  dbSetter,
  apiUrl,
  languageCodeHL,
  translationType,
  skipTranslationCheck = false,
}) {
  // ---- input validation ----
  if (!key || typeof key !== 'string') throw new TypeError('getContentWithFallback: key must be a string')
  if (!store) throw new TypeError('getContentWithFallback: store is required')
  if (typeof storeGetter !== 'function') throw new TypeError('getContentWithFallback: storeGetter must be a function')
  if (typeof storeSetter !== 'function') throw new TypeError('getContentWithFallback: storeSetter must be a function')
  if (typeof dbGetter !== 'function') throw new TypeError('getContentWithFallback: dbGetter must be a function')
  if (typeof dbSetter !== 'function') throw new TypeError('getContentWithFallback: dbSetter must be a function')
  if (!apiUrl || typeof apiUrl !== 'string' || apiUrl.trim() === '') {
    throw new TypeError('getContentWithFallback: apiUrl must be a non-empty string')
  }
  if (!translationType || typeof translationType !== 'string') {
    throw new TypeError('getContentWithFallback: translationType must be a string')
  }

  const isTrueFlag = (v) => v === true || v === 1 || v === '1' || String(v).toLowerCase() === 'true'
  const isCompleteFlag = (obj) =>
    isTrueFlag(obj && obj.meta && obj.meta.complete) ||
    isTrueFlag(obj && obj.meta && obj.meta.translationComplete) // legacy fallback

  // 1) Try Pinia store
  try {
    const storeValue = storeGetter(store)
    if (storeValue) {
      console.log(`✅ Loaded ${key} from ContentStore`)
      console.log (storeValue)
      if (isCompleteFlag(storeValue)) {
        if (typeof store.setTranslationComplete === 'function') {
          store.setTranslationComplete(translationType, true)
        }
        return storeValue
      }
    }
  } catch (e) {
    console.warn(`⚠️ storeGetter failed for ${key}:`, e)
  }

  // 2) Try IndexedDB
  try {
    console.log('ContentLoader Service trying indexedDB')
    const dbValue = await dbGetter()
    if (dbValue) {
      console.log(`✅ Loaded ${key} from IndexedDB`)
      try { storeSetter(store, dbValue) } catch (e) { console.warn('⚠️ storeSetter threw while applying DB value:', e) }
      if (isCompleteFlag(dbValue)) {
        if (typeof store.setTranslationComplete === 'function') {
          store.setTranslationComplete(translationType, true)
        }
        console.log (dbValue)
        return dbValue
      }
      console.log('translation in DB not complete')
    }
  } catch (err) {
    console.warn(`⚠️ DB getter failed for ${key}:`, err)
    console.log (dbValue)
  }

  // 3) Fetch from API
  try {
    console.log(`🌐 ContentLoaderService Fetching ${key} from API: ${apiUrl}`)
    const response = await http.get(apiUrl, { timeout: 10000 })

    // tolerate both {data:{...}} and {...}
    let data = response && response.data ? (response.data.data ?? response.data) : null
    console.log('ContentLoaderService-84');
    console.log(data)
    // accept stringified JSON
    if (typeof data === 'string') {
      try { data = JSON.parse(data) } catch (parseError) {
        console.error(`❌ JSON.parse failed for ${key}:`, data)
        throw parseError
      }
    }

    if (!data || typeof data !== 'object') {
      console.error(`❌ No valid data returned from API for ${key}`)
      throw new Error(`Empty or invalid API response for ${key}`)
    }
    // update store with whatever we get
    try { storeSetter(store, data) } catch (e) { console.warn('⚠️ storeSetter threw while applying API value:', e) }

    const complete = skipTranslationCheck || isCompleteFlag(data)

    if (complete) {
      console.log(`✅ ContentLoaderService-104 ${key} from API is complete - caching to DB`)
      if (typeof store.setTranslationComplete === 'function') {
        store.setTranslationComplete(translationType, true)
      }
      try {
        // dbSetter supports (data) or (hl, data)
        if (dbSetter.length >= 2) {
          await dbSetter(languageCodeHL, data)
        } else {
          await dbSetter(data)
        }
      } catch (e) {
        console.warn('⚠️ dbSetter threw while caching complete data:', e)
      }
      return data
    }

    // not complete — kick off polling and still return partial data
    console.warn(`⚠️ContentLoaderService-122  ${key} from API is incomplete — polling`)
    try {
      pollTranslationUntilComplete({
        languageCodeHL,
        translationType,
        apiUrl,
        dbSetter,
        store,
        storeSetter,
      })
    } catch (e) {
      console.warn('⚠️ pollTranslationUntilComplete failed to start:', e)
    }

    // cache partial to DB too
    try {
      if (dbSetter.length >= 2) {
        await dbSetter(languageCodeHL, data)
      } else {
        await dbSetter(data)
      }
    } catch (e) {
      console.warn('⚠️ dbSetter threw while caching partial data:', e)
    }

    return data
  } catch (error) {
    console.error(`❌ Failed to load ${key} from API:`, error)
    console.error(apiUrl)
    throw error
  }
}
