// src/composables/useSiteContent.js
import { computed, watch, unref, onMounted } from "vue";
import { useContentStore } from "stores/ContentStore";
import { DEFAULTS } from "src/constants/Defaults.js";
import { normHL, normVariant } from "src/utils/normalize.js";

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

function normSubjectKey(subjectRef) {
  const raw = unref(subjectRef);
  const s = String(raw || "")
    .trim()
    .toLowerCase();
  return s || null;
}

export function useSiteContent(languageCodeHLRef) {
  const contentStore = useContentStore();

  // ——— Normalised inputs (single source of truth) ———
  const languageCodeHL = computed(
    () => normHL(languageCodeHLRef) || DEFAULTS.languageCodeHL
  );

  // ——— Read from store (sync) ———
  const siteContent = computed(() => {
    const resolvedHL = unref(languageCodeHL);

    // Expect your store to expose this getter/helper:
    // siteContentFor(subject, hl, variant) → object | null
    const sc = contentStore.siteContentFor
      ? contentStore.siteContentFor(resolvedHL)
      : null;

    return sc || {};
  });

  // ——— Populate store (async) when needed ———
  async function loadSiteContent() {
    const resolvedHL = unref(languageCodeHL);

    try {
      // Expect your store action to exist:
      // loadSiteContent(subject, hl, variant) → data
      if (!contentStore.loadSiteContent) return;
      await contentStore.loadSiteContent(resolvedHL);
    } catch (err) {
      console.warn("[siteContent] load failed:", err);
    }
  }

  // ——— Convenience: read a section and normalize para/paras ———
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

  // ——— Convenience: index paras for the home page ———
  const indexParas = computed(() => {
    const root = siteContent.value;
    const sections =
      isPlainObject(root) && isPlainObject(root.sections)
        ? root.sections
        : null;

    if (!sections || !isPlainObject(sections.index)) return [];
    return normalizeSection(sections.index).paras;
  });

  // ——— Convenience: get title/summary for a section ———
  function getTitle(sectionKey) {
    return getSection(sectionKey).title;
  }

  function getSummary(sectionKey) {
    return getSection(sectionKey).summary;
  }

  function getParas(sectionKey) {
    return getSection(sectionKey).paras;
  }

  onMounted(loadSiteContent);
  watch([languageCodeHL], loadSiteContent);

  return {
    languageCodeHL,
    siteContent,
    indexParas,
    getSection,
    getTitle,
    getSummary,
    getParas,
    loadSiteContent,
  };
}
