// src/services/LessonContentService.js
import { normId, normIntish } from "src/utils/normalize";
import { useContentStore } from "stores/ContentStore";
import { useSettingsStore } from "stores/SettingsStore";
import { getContentWithFallback } from "src/services/ContentLoaderService";
import { buildLessonContentKey } from "src/utils/ContentKeyBuilder";
import {
  getLessonContentFromDB,
  saveLessonContentToDB,
} from "./IndexedDBService";

// Accept optional commonContent so callers can influence source selection
// without relying on Vue props (which do not exist in services).
export async function getLessonContent(
  study,
  languageCodeHL,
  languageCodeJF,
  lesson,
  commonContent = null
) {
  const studyId = normId(study);
  const hl = normId(languageCodeHL);
  const jf = normIntish(languageCodeJF);
  const lessonId = normIntish(lesson);
  console.log(
    "[LessonContent] Requested content for study:",
    study,
    "hl:",
    hl,
    "jf:",
    jf,
    "lesson:",
    lessonId
  );

  if (!studyId || !hl || !jf || !lessonId) {
    console.error("[LessonContent] Missing required params", {
      study,
      languageCodeHL,
      languageCodeJF,
      lesson,
    });
    throw new Error(
      "getLessonContent requires study, languageCodeHL, languageCodeJF, and lesson"
    );
  }

  const key = buildLessonContentKey(studyId, hl, jf, lessonId);
  const contentStore = useContentStore();
  const settingsStore = useSettingsStore();

  //
  // http.get will add root url plus /api
  let url = `/v2/translate/lessonContent/${hl}/${studyId}/${lessonId}?jf=${jf}`;

  // Setter used when getContentWithFallback has direct access to the store.
  // Signature: (store, data)
  const setter = (store, data) => {
    store.setLessonContent(studyId, hl, jf, lessonId, data);
  };

  // Handler used by TranslationPollingService when a poll completes.
  // Its signature there is: (hlFromPoll, data)
  const handleInstall = (hlFromPoll, data) => {
    // Use the hl provided by the poller if present,
    // otherwise fall back to the hl we closed over.
    const effectiveHl = hlFromPoll || hl;

    contentStore.setLessonContent(studyId, effectiveHl, jf, lessonId, data);
  };

  return await getContentWithFallback({
    key,
    store: contentStore,
    storeGetter: (s) => s.lessonContentFor(studyId, hl, jf, lessonId),
    storeSetter: setter,
    onInstall: handleInstall, // ensure poll completion updates the store
    dbGetter: () => getLessonContentFromDB(studyId, hl, jf, lessonId),
    dbSetter: (data) => saveLessonContentToDB(studyId, hl, jf, lessonId, data),
    apiUrl: url,
    languageCodeHL: hl,
    translationType: "lessonContent",

    // Keep behavior aligned with InterfaceService polling contract
    requireCronKey: true, // <-- fail fast if backend forgets cronKey
    maxAttempts: 5,
    interval: 300,
  });
}
