// src/composables/useCommonContent.js
import { computed, watch, unref, onMounted } from "vue";
import { useContentStore } from "stores/ContentStore";
import { DEFAULTS } from "src/constants/Defaults.js";
import { normStudyKey, normHL, normVariant } from "src/utils/normalize.js";

export function useCommonContent(studyRef, languageCodeHLRef, variantRef = null) {
  const contentStore = useContentStore();

  // ——— Normalised inputs (single source of truth) ———
  const study = computed(() => normStudyKey(studyRef) || DEFAULTS.study);
  const languageCodeHL = computed(() => normHL(languageCodeHLRef) || DEFAULTS.languageCodeHL);
  const variant = computed(() => normVariant(variantRef)); // string or null

  // ——— Read from store (sync). NOTE: order = (hl, study, variant) ———
  const commonContent = computed(() => {
    const resolvedHL = unref(languageCodeHL);
    const resolvedStudy = unref(study);
    const resolvedVariant = unref(variant);
    const cc = contentStore.commonContentFor(resolvedHL, resolvedStudy, resolvedVariant);
    return cc || {};
  });

  // ——— Populate store (async) when needed ———
  async function loadCommonContent() {
    const resolvedHL = unref(languageCodeHL);
    const resolvedStudy = unref(study);
    const resolvedVariant = unref(variant);
    try {
      await contentStore.loadCommonContent(resolvedHL, resolvedStudy, resolvedVariant);
    } catch (err) {
      console.warn("[commonContent] load failed:", err);
    }
  }

  // Optional helper: flatten a simple { "1": "Title", ... } → [{label, value}]
  const topics = computed(() => {
    const cc = commonContent.value;
    const topicObject = cc && typeof cc === "object" ? cc.topic : null;
    if (!topicObject || typeof topicObject !== "object") return [];
    const result = [];
    const keys = Object.keys(topicObject);
    for (let i = 0; i < keys.length; i++) {
      const k = keys[i];
      const index = parseInt(k, 10);
      if (!Number.isFinite(index)) continue;
      result.push({ label: index + ". " + String(topicObject[k]), value: index });
    }
    return result;
  });

  onMounted(loadCommonContent);
  watch([study, languageCodeHL, variant], loadCommonContent);

  return { commonContent, topics, loadCommonContent };
}
