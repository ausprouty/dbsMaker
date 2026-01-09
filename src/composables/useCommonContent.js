// src/composables/useCommonContent.js
import { computed, watch, unref, ref, onMounted } from "vue";
import { useContentStore } from "stores/ContentStore";
import { buildCommonContentKey } from "src/utils/ContentKeyBuilder";
import { DEFAULTS } from "src/constants/Defaults.js";
import { normStudyKey, normHL, normVariant } from "src/utils/normalize.js";

export function useCommonContent(studyRef, variantRef, languageCodeHLRef) {
  const contentStore = useContentStore();

  // ——— Normalised inputs (single source of truth) ———
  const study = computed(() => normStudyKey(studyRef) || DEFAULTS.study);
  const languageCodeHL = computed(
    () => normHL(languageCodeHLRef) || DEFAULTS.languageCodeHL
  );
  const variant = computed(() => normVariant(variantRef)); // string or null

  //--debug

  const key = computed(() =>
    buildCommonContentKey(unref(study), unref(variant), unref(languageCodeHL))
  );

  console.log("[useCommonContent] setup", {
    study: unref(study),
    variant: unref(variant),
    hl: unref(languageCodeHL),
    key: key,
  });

  // end debug

  // ——— Read from store (sync). NOTE: order = (study,variant, hl) ———
  const commonContent = computed(() => {
    const resolvedStudy = unref(study);
    const resolvedVariant = unref(variant);
    const resolvedHL = unref(languageCodeHL);

    console.log("In useCommonContent the resolvedStudy is " + resolvedStudy);
    console.log(
      "In useCommonContent the resolvedVariant is " + resolvedVariant
    );
    console.log("In useCommonContent the resolvedHL is " + resolvedHL);

    const cc = contentStore.commonContentFor(
      resolvedStudy,
      resolvedVariant,
      resolvedHL
    );
    console.log(cc);
    return cc || {};
  });

  // ——— Populate store (async) when needed , but we do not do anything with this data ----
  async function loadCommonContent() {
    const resolvedStudy = unref(study);
    const resolvedVariant = unref(variant);
    const resolvedHL = unref(languageCodeHL);

    // to debug
    console.log("[buildCommonContentKey called from useCommonContent]");
    const key = buildCommonContentKey(
      resolvedStudy,
      resolvedVariant,
      resolvedHL
    );
    console.log("[useCommonContent] loadCommonContent called", {
      key,
      study: resolvedStudy,
      variant: resolvedVariant,
      hl: resolvedHL,
    });

    // end debug
    try {
      const data = await contentStore.loadCommonContent(
        resolvedStudy,
        resolvedVariant,
        resolvedHL
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
  watch([study, variant, languageCodeHL], loadCommonContent);

  return { commonContent, topics, loadCommonContent };
}
