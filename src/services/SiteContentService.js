// src/services/SiteContentService.js
import { normId } from "src/utils/normalize";
import { useContentStore } from "stores/ContentStore";
import { getContentWithFallback } from "src/services/ContentLoaderService";
import { buildSiteContentKey } from "src/utils/ContentKeyBuilder";
import { getSiteContentFromDB, saveSiteContentToDB } from "./IndexedDBService";

export async function getSiteContent(languageCodeHL) {
  const hl = normId(languageCodeHL);
  const site = normId(import.meta.env.VITE_APP);
  if (!hl || !site) {
    throw new Error("languageCodeHL and App Site required");
  }
  // /api is prefixed by http.get
  // Adjust path to match your backend route naming.
  const apiUrl = `/v2/translate/text/siteContent/${site}/${hl}`;
  const key = buildSiteContentKey(hl);
  const contentStore = useContentStore();

  // Setter used when getContentWithFallback has direct access to the store.
  // Signature: (store, data)
  const setter = (store, data) => {
    store.setSiteContent(hl, data);
  };

  // Handler used by TranslationPollingService when a poll completes.
  // Signature there is: (hlFromPoll, data)
  const handleInstall = (hlFromPoll, data) => {
    const effectiveHl = hlFromPoll || hl;
    contentStore.setSiteContent(effectiveHl, data);
  };

  return await getContentWithFallback({
    key,
    store: contentStore,
    storeGetter: (s) => s.siteContentFor(hl),
    storeSetter: setter,
    onInstall: handleInstall,
    dbGetter: () => getSiteContentFromDB(hl),
    dbSetter: (data) => saveSiteContentToDB(hl, data),
    apiUrl,
    languageCodeHL: hl,
    translationType: "siteContent",

    // Keep consistent with Interface/Lesson services
    requireCronKey: true,
    maxAttempts: 5,
    interval: 300,
  });
}
