// src/services/CommonContentService.js
import { normId, normVariant } from "src/utils/normalize";
import { useContentStore } from "stores/ContentStore";
import { getContentWithFallback } from "src/services/ContentLoaderService";
import { buildCommonContentKey } from "src/utils/ContentKeyBuilder";
import {
  getCommonContentFromDB,
  saveCommonContentToDB,
} from "./IndexedDBService";

export async function getCommonContent(study, languageCodeHL, variant) {
  const hl = normId(languageCodeHL);
  const studyId = normId(study);
  if (!studyId || !hl) {
    throw new Error("study and languageCodeHL required");
  }
  var v = normVariant(variant);
  // /api is prefixed by http.get
  const apiUrl =
    `/v2/translate/text/common/${studyId}/${hl}` +
    `?variant=${encodeURIComponent(v)}`;
  console.log(apiUrl);
  const key = buildCommonContentKey(studyId, hl, v);
  const contentStore = useContentStore();

  // Setter used when getContentWithFallback has direct access to the store.
  // Signature: (store, data)
  const setter = (store, data) => {
    store.setCommonContent(studyId, hl, data);
  };

  // Handler used by TranslationPollingService when a poll completes.
  // Signature there is: (hlFromPoll, data)
  const handleInstall = (hlFromPoll, data) => {
    const effectiveHl = hlFromPoll || hl;
    contentStore.setCommonContent(studyId, effectiveHl, data);
  };

  return await getContentWithFallback({
    key,
    store: contentStore,
    storeGetter: (s) => s.commonContentFor(studyId, hl),
    storeSetter: setter,
    onInstall: handleInstall, // ensure poll completion updates store the same way
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
