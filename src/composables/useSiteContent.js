// src/composables/useSiteContent.js
import { computed, watch, unref, ref } from "vue";
import { useContentStore } from "stores/ContentStore";
import { DEFAULTS } from "src/constants/Defaults.js";
import { normHL } from "src/utils/normalize.js";

// Helpers used by getSection/indexParas
function isPlainObject(v) {
  return !!v && typeof v === "object" && !Array.isArray(v);
}

function normalizeSection(section) {
  if (!isPlainObject(section)) {
    return { title: "", summary: "", paras: [], empty: "" };
  }

  var empty = "";
  if (typeof section.empty === "string") {
    empty = section.empty;
  }

  // New schema: paras: []
  if (Array.isArray(section.paras)) {
    return {
      title: String(section.title || ""),
      summary: String(section.summary || ""),
      paras: section.paras.filter(
        (p) => typeof p === "string" && p.trim().length > 0
      ),
      empty: String(empty || ""),
    };
  }

  // Old schema: para: {"1": "...", "2": "..."}
  const para = isPlainObject(section.para) ? section.para : null;
  const keys = para ? Object.keys(para) : [];
  keys.sort(function (a, b) {
    return Number(a) - Number(b);
  });

  const paras = [];
  for (let i = 0; i < keys.length; i++) {
    const txt = para[keys[i]];
    if (typeof txt === "string" && txt.trim().length > 0) {
      paras.push(txt);
    }
  }

  return {
    title: String(section.title || ""),
    summary: String(section.summary || ""),
    paras,
    empty: String(empty || ""),
  };
}

export function useSiteContent(languageCodeHLRef) {
  const contentStore = useContentStore();
  const readyHL = ref("");

  // IMPORTANT:
  // - Callers should pass a ref/computed for reactivity.
  // - Still be defensive: if a plain string is passed, unref() is safe.
  const languageCodeHL = computed(() => {
    const raw = unref(languageCodeHLRef);
    const v = normHL(raw) || DEFAULTS.languageCodeHL;
    return v;
  });

  const siteContent = computed(() => {
    const resolvedHL = unref(languageCodeHL);
    const sc =
      typeof contentStore.siteContentFor === "function"
        ? contentStore.siteContentFor(resolvedHL)
        : null;
    // IMPORTANT:
    // Returning {} here can mask a load problem and can also cause UI to
    // "look valid" while still being empty. Keep null-ish distinct.
    return sc && typeof sc === "object" ? sc : null;
  });

  let loadToken = 0;

  async function loadSiteContent(hl) {
    const token = ++loadToken;
    readyHL.value = "";

    // Always normalize what we load with.
    const resolvedHL =
      normHL(hl == null || hl === "" ? unref(languageCodeHL) : hl) ||
      DEFAULTS.languageCodeHL;

    try {
      if (typeof contentStore.loadSiteContent !== "function") return;
      await contentStore.loadSiteContent(resolvedHL);

      if (token !== loadToken) return; // ignore stale result
      readyHL.value = resolvedHL;
    } catch (err) {
      if (token !== loadToken) return;
      console.warn("[siteContent] load failed:", err);
    }
  }

  // Auto-load by default.
  // If you also watch+load in MainLayout, pass { autoLoad:false } to avoid
  // duplicate fetches.
  const autoLoad = !(
    arguments.length > 1 &&
    arguments[1] &&
    arguments[1].autoLoad === false
  );

  if (autoLoad) {
    // Watch the normalized HL string only.
    watch(
      () => languageCodeHL.value,
      (hl) => loadSiteContent(hl),
      { immediate: true }
    );
  }

  function getSection(sectionKey) {
    const root = siteContent.value;
    const k = String(sectionKey || "")
      .trim()
      .toLowerCase();
    if (!k) return { title: "", summary: "", paras: [] };

    const sections =
      isPlainObject(root) && isPlainObject(root.sections)
        ? root.sections
        : null;

    const raw = sections && isPlainObject(sections[k]) ? sections[k] : null;
    return normalizeSection(raw);
  }

  const indexParas = computed(() => {
    const root = siteContent.value;
    const sections =
      isPlainObject(root) && isPlainObject(root.sections)
        ? root.sections
        : null;

    if (!sections || !isPlainObject(sections.index)) return [];
    return normalizeSection(sections.index).paras;
  });

  function getTitle(sectionKey) {
    return getSection(sectionKey).title;
  }
  function getSummary(sectionKey) {
    return getSection(sectionKey).summary;
  }
  function getParas(sectionKey) {
    return getSection(sectionKey).paras;
  }

  return {
    languageCodeHL,
    siteContent,
    indexParas,
    getSection,
    getTitle,
    getSummary,
    getParas,
    readyHL,
  };
}
