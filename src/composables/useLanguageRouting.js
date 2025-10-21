// src/composables/useLanguageRouting.js
import { useRouter, useRoute } from "vue-router";
import { safeReplace } from "src/router/safeNav";

export function useLanguageRouting() {
  const router = useRouter();
  const route  = useRoute();
  // Prevent route <-> state ping-pong during language changes.
  let isSyncingLanguage = false;

  function isSeriesOrVideo() {
    const n = route.name;
    if (n === "SeriesMaster" || n === "VideoMaster") return true;
    const p = String(route.path || "");
    return p.indexOf("/series") === 0 || p.indexOf("/video") === 0;
  }

  function S(x) { return x == null ? "" : String(x); }

  function buildNextLocation(hl, jf) {
    const name = route.name || null;
    const hash = route.hash || "";
    const curQ = Object.assign({}, route.query || {});
    const curP = Object.assign({}, route.params || {});

    if (isSeriesOrVideo()) {
      const study   = S(curP.study || "ctc");
      const lesson  = S(curP.lesson || "1"); // <-- default lesson to "1"
      const nextHL  = S(hl || curP.languageCodeHL || "");
      const nextJF  = S(jf || curP.languageCodeJF || "");

      // Require HL+JF as a pair on Series/Video routes
      if ((nextHL && !nextJF) || (!nextHL && nextJF)) {
        const err = new Error("HL and JF must both be set on Series/Video");
        err.code = "LANG_PAIR_REQUIRED";
        throw err;
      }

      const nextParams = {
        study: study,
        lesson: lesson,
        languageCodeHL: nextHL,
        languageCodeJF: nextJF
      };

      return name
        ? { name: name, params: nextParams, query: curQ, hash: hash }
        : { path: route.path, params: nextParams, query: curQ, hash: hash };
    }

    // Other routes: carry HL/JF in query
    const nextQuery = Object.assign({}, curQ);
    if (hl) nextQuery.hl = S(hl);
    if (jf) nextQuery.jf = S(jf);

    return name
      ? { name: name, params: curP, query: nextQuery, hash: hash }
      : { path: route.path, query: nextQuery, hash: hash };
  }

  function sameLocation(a, b) {
    const sameNameOrPath =
      (a.name && b.name && a.name === b.name) ||
      (!a.name && !b.name && a.path === b.path);

    function J(x) {
      try { return JSON.stringify(x || {}); }
      catch (e) { return ""; }
    }

    return sameNameOrPath &&
      J(a.params) === J(b.params) &&
      J(a.query)  === J(b.query)  &&
      String(a.hash || "") === String(b.hash || "");
  }

  async function changeLanguage(hl, jf) {
    if (isSyncingLanguage) return true;
    let next;
    try {
      next = buildNextLocation(hl, jf);
    } catch (e) {
      return Promise.reject(e);
    }

    const cur = {
      name: route.name || null,
      path: route.path,
      params: route.params || {},
      query: route.query || {},
      hash: route.hash || ""
    };

    if (sameLocation(next, cur)) {
      return true; // no-op; avoids UI hangs
    }

        // replace avoids history spam while picking languages
    isSyncingLanguage = true;
    try {
      await safeReplace(router, next);
      return true;
    } finally {
      // Let reactive watchers settle before allowing another change.
      queueMicrotask(() => { isSyncingLanguage = false; });
    }
   }

   return { changeLanguage };
}
