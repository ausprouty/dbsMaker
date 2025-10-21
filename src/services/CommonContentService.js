import { unref } from 'vue'
import { normId } from 'src/utils/normalize'
import { useContentStore } from 'stores/ContentStore'
import { getContentWithFallback } from 'src/services/ContentLoaderService'
import { buildCommonContentKey } from 'src/utils/ContentKeyBuilder'
import {
  getCommonContentFromDB,
  saveCommonContentToDB
} from './IndexedDBService'



export async function getCommonContent(languageCodeHL, study) {
  const hl = normId(languageCodeHL)
  const studyId = normId(study)
  if (!studyId || !hl) throw new Error('study and languageCodeHL required')
  // http.get will add root url plus /api
  const apiUrl = `/v2/translate/text/common/${studyId}/${hl}`

  const key = buildCommonContentKey(studyId, hl)
  const contentStore = useContentStore()

  return await getContentWithFallback({
    key,
    store: contentStore,
    storeGetter: (store) => store.commonContentFor(studyId, hl),
    storeSetter: (store, data) => store.setCommonContent(studyId, hl, data),
    dbGetter: () => getCommonContentFromDB(studyId, hl),
    dbSetter: (data) => saveCommonContentToDB(studyId, hl, data),
    apiUrl,
    languageCodeHL:hl,
    translationType: 'commonContent'
  })
}
