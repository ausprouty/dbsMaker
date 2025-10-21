import { unref } from 'vue'
import { useContentStore } from 'stores/ContentStore'
import { getContentWithFallback } from 'src/services/ContentLoaderService'
import { buildVideoUrlsKey } from 'src/utils/ContentKeyBuilder'
import {
  getVideoUrlsFromDB,
  saveVideoUrlsToDB
} from './IndexedDBService'

// normalize string-ish id (handles refs and "undefined")
function normId(v) {
  const s = String(unref(v) ?? '').trim()
  return s.toLowerCase() === 'undefined' ? '' : s
}

// numeric-friendly normalizer (e.g., JF codes)
function normIntish(v) {
  const s = normId(v)
  if (!s) return ''
  const n = Number(s)
  return Number.isFinite(n) ? String(n) : s
}

export async function getJesusVideoUrls(languageCodeJF) {
  const studyId = 'jvideo'
  const jf = normIntish(languageCodeJF)
  const lessonId = '0' // keep the pattern consistent

  if (!jf) {
    console.error('getJesusVideoUrls missing JF code', { languageCodeJF })
    throw new Error('languageCodeJF is required')
  }

  const key = buildVideoUrlsKey(studyId, jf)
  const apiUrl = `/translate/videoUrls/${studyId}/${jf}`

  const contentStore = useContentStore()

  const result = await getContentWithFallback({
    key,
    store: contentStore,
    storeGetter: (store) => store.videoUrlsFor(studyId, jf, lessonId),
    storeSetter: (store, data) =>
      store.setVideoUrls(studyId, jf, lessonId, data),
    dbGetter: () => getVideoUrlsFromDB(studyId, jf, lessonId),
    dbSetter: (data) => saveVideoUrlsToDB(studyId, jf, lessonId, data),
    apiUrl,
    translationType: 'videoContent',
    skipTranslationCheck: true
  })

  // result may be the array or an axios-like { data }
  return Array.isArray(result?.data) ? result.data : result
}
