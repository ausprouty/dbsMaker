import { computed } from "vue";
import { useI18n } from "vue-i18n";

export function useSafeI18n() {
  const { t, te } = useI18n({ useScope: "global" });

  // Minimal readiness check. If you have a real store flag, use that instead.
  const i18nReady = computed(function () {
    return te("interface.loading");
  });

  function safeT(key, fallback) {
    const fb = fallback == null ? "" : String(fallback);
    if (!i18nReady.value) return fb;
    if (!te(key)) return fb;
    return t(key);
  }

  return { t, te, safeT, i18nReady };
}
