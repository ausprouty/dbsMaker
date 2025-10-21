// src/composables/useVideoSourceFromSpec.js
import { ref, watchEffect, unref } from "vue";
import { safeObj, normId, normIntish } from "src/utils/normalize.js";
import { buildVideoSource } from "src/utils/videoSource";

/**
 * Merged + hardened:
 * - Accepts refs or plain values in options
 * - Direct src fast-path (no provider needed)
 * - Normalizes/validates inputs; never throws from watcher
 * - Returns { source, loading, error } (backward compatible: you can ignore extras)
 */
export function useVideoSourceFromSpec(options) {
  options = options || {};
  // these names already exist in the file; we just rely on them
  var videoSpec      = options.videoSpec;
  var study          = options.study;
  var lesson         = options.lesson;
  var languageCodeJF = options.languageCodeJF;
  var languageCodeHL = options.languageCodeHL;

  var source  = ref({ provider: "", kind: "video", src: "" });
  var loading = ref(false);
  var error   = ref(null);

  // helpers
  function toId(value, def) {
    var v = normId(String(unref(value) || ""));
    return v || (def ? normId(def) : "");
  }
  function toInt(value, def) {
    var v = normIntish(unref(value));
    return v || (def != null ? String(def) : "");
  }

  watchEffect(function () {
    loading.value = true;
    error.value = null;

    try {
      var rawSpec = safeObj(unref(videoSpec));

      // If meta exists and is a plain object, use it as "provider meta"
      var providerMeta =
        rawSpec &&
        typeof rawSpec === "object" &&
        rawSpec.meta &&
        typeof rawSpec.meta === "object" &&
        !Array.isArray(rawSpec.meta)
          ? rawSpec.meta
          : rawSpec;
       // -------------------------------
      // Language fallback (scoped JF)
      // -------------------------------
      // Selected values (do NOT write them anywhere—scoped only)
      var selHL = toId(languageCodeHL, "");
      var selJF = toInt(languageCodeJF, "");

      // Allow-list of HL codes: ["eng00","mjs00",...] or "all"
      var allow = rawSpec && rawSpec.languages;
      var allowAll = !allow || allow === "all";
      var allowSet = Array.isArray(allow)
        ? allow.map(function (x) { return String(x || "").toLowerCase(); })
        : [];
      var hlAllowed = allowAll
        ? true
        : allowSet.indexOf(String(selHL).toLowerCase()) >= 0;

      // Default JF (guru): prefer spec.default_jf, otherwise 529
      var defaultJF =
        String((rawSpec && rawSpec.default_jf) != null
          ? rawSpec.default_jf
          : "529");

      // Effective JF for THIS video only:
      // - if HL not allowed OR selected JF missing -> use defaultJF
      // - else use selected JF
      var effectiveJF = selJF && hlAllowed ? selJF : defaultJF;

      // ---- Direct-src fast path ------------------------------------------
      // If the spec (or its meta) already has a direct playable URL, use it.
      var directSrc =
        (providerMeta && typeof providerMeta.src === "string" && providerMeta.src) ||
        (rawSpec && typeof rawSpec.src === "string" && rawSpec.src) ||
        "";

      if (directSrc) {
        source.value = {
          provider: "direct",
          kind: "video",
          src: directSrc,
          type: rawSpec && rawSpec.type ? rawSpec.type : null,
          poster: rawSpec && rawSpec.poster ? rawSpec.poster : null
        };
        return;
      }
      // --------------------------------------------------------------------

       // Build provider input (normalized) with our scoped effectiveJF.
      // This does not mutate store/route.
      var jfString = String(effectiveJF || "");
      var input = {
        provider: toId(rawSpec && rawSpec.provider, ""),
        study: toId(study, "jvideo"),
        lesson: toInt(lesson, 1),
        languageCodeJF: jfString,   // <= fallback applied
        jf:jfString,
        languageCodeHL: selHL,        // UI language unchanged
        meta: providerMeta
      };
      console.log (input);

      // If we still have no provider, we can't build anything useful
      if (!input.provider) {
        source.value = { provider: "", kind: "video", src: "" };
        return;
      }

      // Delegate to your existing builder; guard against throws or bad shapes
      var built = null;
      try {
        built = buildVideoSource(input);
      } catch (e) {
        // swallow and surface as error + safe fallback
        error.value =
          (e && e.message) ? e.message : "Failed to build video source";
        source.value = { provider: input.provider, kind: "video", src: "" };
        return;
      }

      if (
        built &&
        typeof built === "object" &&
        typeof built.src === "string" &&
        built.src
      ) {
        source.value = built;
      } else {
        // Unknown provider/insufficient meta → safe fallback
        source.value = { provider: input.provider, kind: "video", src: "" };
      }
    } catch (eOuter) {
      // Absolutely no errors escape the watcher
      error.value =
        (eOuter && eOuter.message) ? eOuter.message : String(eOuter);
      source.value = { provider: "", kind: "video", src: "" };
    } finally {
      loading.value = false;
    }
  });

  return { source: source, loading: loading, error: error };
}
