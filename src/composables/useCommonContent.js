// src/composables/useCommonContent.js
import { computed, watch, unref, ref, onMounted } from "vue";
import { useContentStore } from "stores/ContentStore";
import { buildCommonContentKey } from "src/utils/ContentKeyBuilder";
import { DEFAULTS } from "src/constants/Defaults.js";
import { normStudyKey, normHL, normVariant } from "src/utils/normalize.js";

export function useCommonContent(
  studyRef,
  languageCodeHLRef,
  variantRef = null
) {
  const contentStore = useContentStore();

  // ——— Normalised inputs (single source of truth) ———
  const study = computed(() => normStudyKey(studyRef) || DEFAULTS.study);
  const languageCodeHL = computed(
    () => normHL(languageCodeHLRef) || DEFAULTS.languageCodeHL
  );
  const variant = computed(() => normVariant(variantRef)); // string or null

  //--debug

  const key = buildCommonContentKey(study, languageCodeHL, variant);

  console.log("[useCommonContent] setup", {
    study: study,
    hl: languageCodeHL,
    variantRaw: variant,
    key,
  });

  // end debug

  // ——— Read from store (sync). NOTE: order = (study, hl, variant) ———
  const commonContent = computed(() => {
    const resolvedStudy = unref(study);
    const resolvedHL = unref(languageCodeHL);
    const resolvedVariant = unref(variant);
    console.log("In useCommonContent the resolvedStudy is " + resolvedStudy);
    console.log("In useCommonContent the resolvedHL is " + resolvedHL);
    console.log(
      "In useCommonContent the resolvedVariant is " + resolvedVariant
    );
    const cc = contentStore.commonContentFor(
      resolvedStudy,
      resolvedHL,
      resolvedVariant
    );
    console.log(cc);
    return cc || {};
  });

  // ——— Populate store (async) when needed , but we do not do anything with this data ----
  async function loadCommonContent() {
    const resolvedStudy = unref(study);
    const resolvedHL = unref(languageCodeHL);
    const resolvedVariant = unref(variant);
    // to debug
    const key = buildCommonContentKey(
      resolvedStudy,
      resolvedHL,
      resolvedVariant
    );
    console.log("[useCommonContent] loadCommonContent called", {
      key,
      study: resolvedStudy,
      hl: resolvedHL,
      variant: variant,
    });

    // end debug
    try {
      const data = await contentStore.loadCommonContent(
        resolvedStudy,
        resolvedHL,
        resolvedVariant
      );
      console.log("[useCommonContent] load result", {
        key,
        hasData: !!data,
        dataSample: data && Object.keys(data).slice(0, 5),
      });
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
      result.push({
        label: index + ". " + String(topicObject[k]),
        value: index,
      });
    }
    return result;
  });

  onMounted(loadCommonContent);
  watch([study, languageCodeHL, variant], loadCommonContent);

  return { commonContent, topics, loadCommonContent };
}
