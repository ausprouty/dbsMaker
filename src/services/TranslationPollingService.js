import { http } from "src/lib/http";
import { i18n } from "src/lib/i18n";
import { normId } from "src/utils/normalize";

const activePolls = new Set();
const ALLOWED_TYPES = new Set(["interface", "commonContent", "lessonContent"]);

export async function pollTranslationUntilComplete({
  languageCodeHL,
  translationType,
  apiUrl,
  dbSetter,
  store,
  storeSetter,
  maxAttempts = 5,
  interval = 300,
  replaceWhenComplete = false,
}) {
  // ---- input validation ----
  const hl = normId
    ? normId(languageCodeHL)
    : String(languageCodeHL ?? "").trim();
  if (!hl) {
    throw new Error(
      `[poll] 'languageCodeHL' is required for translationType "${translationType}" and apiUrl "${apiUrl}"`
    );
  }

  if (!ALLOWED_TYPES.has(translationType)) {
    throw new TypeError(`[poll] Invalid translationType: ${translationType}`);
  }
  if (typeof apiUrl !== "string" || apiUrl.trim() === "") {
    throw new TypeError("[poll] 'apiUrl' must be a non-empty string");
  }

  maxAttempts = Math.max(1, parseInt(String(maxAttempts), 10) || 5);
  interval = Math.max(100, parseInt(String(interval), 10) || 300);

  const pollKey = `${translationType}:${hl}`;
  if (activePolls.has(pollKey)) {
    console.log(`⏳ Poll already active for ${pollKey}`);
    return;
  }
  activePolls.add(pollKey);

  let attempts = 0;
  const finish = () => activePolls.delete(pollKey);

  const poll = async () => {
    attempts++;
    try {
      console.log(
        `🔄 Polling ${translationType} for ${hl} (attempt ${attempts})`
      );
      const res = await http.get(apiUrl);
      const translation = res && res.data ? res.data.data ?? res.data : null;

      if (!translation || typeof translation !== "object") {
        console.warn("[poll] Empty or invalid translation payload");
      }

      // optional store update
      if (typeof storeSetter === "function" && store && translation) {
        try {
          storeSetter(store, translation);
        } catch (e) {
          console.warn("[poll] storeSetter threw:", e);
        }
      }

      // ---- i18n updates (only for interface bundles) ----
      if (translationType === "interface" && translation) {
        console.log(translation);
        // don’t merge meta into i18n messages
        const { meta, ...messages } = translation;

        // deep merge with deletion semantics (null/"")
        const cur = i18n.global.getLocaleMessage(hl) || {};
        const next = deepMergeWithDelete({ ...cur }, messages || {});
        i18n.global.setLocaleMessage(hl, next);
        console.log("TranslationPollingService changed interface to " + hl);

        i18n.global.locale.value = hl;

        // Set <html lang> — prefer explicit, then HL (supports old/new shapes)
        const htmlLang =
          (meta &&
            meta.language &&
            (meta.language.html ||
              meta.language.google ||
              meta.language.code)) ||
          (translation.language &&
            (translation.language.html ||
              translation.language.google ||
              translation.language.code)) ||
          hl;
        if (typeof document !== "undefined") {
          document.documentElement &&
            document.documentElement.setAttribute("lang", String(htmlLang));
        }
      }

      // support new shape (meta) and old shape (language) for completion flag
      const isComplete =
        (translation &&
          translation.meta &&
          translation.meta.complete === true) ||
        (translation &&
          translation.language &&
          translation.language.translationComplete === true);

      console.log("translationComplete:", !!isComplete);

      if (store && typeof store.setTranslationComplete === "function") {
        try {
          store.setTranslationComplete(translationType, !!isComplete);
        } catch (e) {
          console.warn("[poll] setTranslationComplete threw:", e);
        }
      }

      // save to DB (support both arities: (hl, data) or (data))
      if (typeof dbSetter === "function" && translation) {
        try {
          if (dbSetter.length >= 2) {
            await dbSetter(hl, translation);
          } else {
            await dbSetter(translation);
          }
        } catch (e) {
          console.warn("[poll] dbSetter threw:", e);
        }
      }

      if (isComplete) {
        // Optional: replace the merged bundle with the final messages only
        if (
          replaceWhenComplete &&
          translationType === "interface" &&
          translation
        ) {
          const { meta, ...messages } = translation;
          i18n.global.setLocaleMessage(hl, messages || {});
        }
        console.log(`✅ ${translationType} for ${hl} is complete`);
        finish();
        return;
      }

      if (attempts < maxAttempts) {
        console.log("meta");
        console.log(translation.meta);
        // nudge backend if we have a cron token (meta-first, fallback old field)
        const cronKey =
          translation && translation.meta && translation.meta.cronKey;
        if (cronKey == null || cronKey === "")
          throw new Error("Missing cronKey");
        else {
          console.log(cronKey);
          const url = `/v2/translate/cron/${encodeURIComponent(
            String(cronKey)
          )}`;
          console.log(url);
          http
            .get(url)
            .catch((err) => console.warn("⚠️ Cron trigger failed:", err));
        }
        setTimeout(poll, interval);
      } else {
        console.warn(
          `❌ ${translationType} polling exceeded max attempts for ${hl}`
        );
        finish();
      }
    } catch (error) {
      console.error(`💥 Polling error for ${translationType} ${hl}:`, error);
      finish();
    }
  };

  // deep merge that also supports deletions with null/""
  function deepMergeWithDelete(target, source) {
    if (!source || typeof source !== "object") return target;
    for (const k of Object.keys(source)) {
      const v = source[k];
      if (v === null || v === "") {
        if (Object.prototype.hasOwnProperty.call(target, k)) delete target[k];
        continue;
      }
      if (v && typeof v === "object" && !Array.isArray(v)) {
        const base =
          target && typeof target[k] === "object" && !Array.isArray(target[k])
            ? target[k]
            : {};
        target[k] = deepMergeWithDelete({ ...base }, v);
      } else {
        target[k] = v;
      }
    }
    return target;
  }

  // fire-and-forget
  poll();
}
