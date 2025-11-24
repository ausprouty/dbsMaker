// src/services/CommonContentService.js
import { normId } from "src/utils/normalize";
import { useContentStore } from "stores/ContentStore";
import { getContentWithFallback } from "src/services/ContentLoaderService";
import { buildCommonContentKey } from "src/utils/ContentKeyBuilder";
import {
  getCommonContentFromDB,
  saveCommonContentToDB,
} from "./IndexedDBService";

export async function getCommonContent(languageCodeHL, study) {
  const hl = normId(languageCodeHL);
  const studyId = normId(study);
  if (!studyId || !hl) {
    throw new Error("study and languageCodeHL required");
  }

  // /api is prefixed by http.get
  const apiUrl = `/v2/translate/text/common/${studyId}/${hl}`;
  console.log(apiUrl);
  const key = buildCommonContentKey(studyId, hl);
  const contentStore = useContentStore();

  // Use one setter for both initial load and poll completion
  const setter = (store, data) => store.setCommonContent(studyId, hl, data);

  return await getContentWithFallback({
    key,
    store: contentStore,
    storeGetter: (s) => s.commonContentFor(studyId, hl),
    storeSetter: setter,
    onInstall: setter, // ensure poll completion updates store the same way
    dbGetter: () => getCommonContentFromDB(studyId, hl),
    dbSetter: (data) => saveCommonContentToDB(studyId, hl, data),
    apiUrl,
    languageCodeHL: hl,
    translationType: "commonContent",

    // Keep consistent with Interface/Lesson services
    requireCronKey: true,
    maxAttempts: 5,
    interval: 300,
  });
}
