// src/services/LessonContentService.js
import { normId, normIntish } from "src/utils/normalize";
import { useContentStore } from "stores/ContentStore";
import { getContentWithFallback } from "src/services/ContentLoaderService";
import { buildLessonContentKey } from "src/utils/ContentKeyBuilder";
import {
  getLessonContentFromDB,
  saveLessonContentToDB,
} from "./IndexedDBService";

export async function getLessonContent(
  study,
  languageCodeHL,
  languageCodeJF,
  lesson
) {
  const studyId = normId(study);
  const hl = normId(languageCodeHL);
  const jf = normIntish(languageCodeJF);
  const lessonId = normIntish(lesson);

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

  // http.get will add root url plus /api
  const url = `/v2/translate/lessonContent/${hl}/${studyId}/${lessonId}?jf=${jf}`;
  const key = buildLessonContentKey(studyId, hl, jf, lessonId);
  const contentStore = useContentStore();

  // Use one setter in both initial fetch and poll completion
  const setter = (data) =>
    contentStore.setLessonContent(studyId, hl, jf, lessonId, data);

  return await getContentWithFallback({
    key,
    store: contentStore,
    storeGetter: (s) => s.lessonContentFor(studyId, hl, jf, lessonId),
    storeSetter: setter,
    onInstall: setter, // <-- ensure the poller completion updates the store identically
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
