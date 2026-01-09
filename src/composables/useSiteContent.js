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
  if (!isPlainObject(section)) return { title: "", summary: "", paras: [] };

  // New schema: paras: []
  if (Array.isArray(section.paras)) {
    return {
      title: String(section.title || ""),
      summary: String(section.summary || ""),
      paras: section.paras.filter(
        (p) => typeof p === "string" && p.trim().length > 0
      ),
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
  };
}

// Optional helper (currently unused in the code you showed)
function normSubjectKey(subjectRef) {
  const raw = unref(subjectRef);
  const s = String(raw || "")
    .trim()
    .toLowerCase();
  return s || null;
}

export function useSiteContent(languageCodeHLRef) {
  const contentStore = useContentStore();
  const readyHL = ref("");

  const languageCodeHL = computed(
    () => normHL(languageCodeHLRef) || DEFAULTS.languageCodeHL
  );

  const siteContent = computed(() => {
    const resolvedHL = unref(languageCodeHL);
    const sc =
      typeof contentStore.siteContentFor === "function"
        ? contentStore.siteContentFor(resolvedHL)
        : null;
    return sc || {};
  });

  let loadToken = 0;

  async function loadSiteContent(hl) {
    const token = ++loadToken;
    readyHL.value = "";

    const resolvedHL =
      hl == null || hl === "" ? unref(languageCodeHL) : String(hl).trim();

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

  function setupAutoLoad() {
    watch(languageCodeHL, loadSiteContent, { immediate: true });
  }
  setupAutoLoad();

  function getSection(sectionKey) {
    const root = siteContent.value;
    const k = String(sectionKey || "").trim();
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
