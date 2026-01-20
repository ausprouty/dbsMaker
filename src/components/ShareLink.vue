<script>
import { computed, onMounted, ref } from "vue";
import { useQuasar } from "quasar";
import { useSettingsStore } from "src/stores/SettingsStore";
import { normId, normKey, fromObjId, normPathSeg } from "src/utils/normalize";
import { getAllowedStudyKeys } from "src/utils/allowedStudies";
import { useI18n } from "vue-i18n";

export default {
  name: "ShareLink",
  setup() {
    const { t, te } = useI18n({ useScope: "global" });
    const $q = useQuasar();
    const store = useSettingsStore();

    const allowed = ref(new Set());
    onMounted(async () => {
      allowed.value = await getAllowedStudyKeys();
    });

    const isAllowedSeries = (seriesLike) => {
      const k = normKey(seriesLike);
      return allowed.value.size === 0 || allowed.value.has(k);
    };

    const pickLessonFor = (seriesLike) => {
      const ln = store.lessonNumber;
      if (!ln || typeof ln !== "object" || Array.isArray(ln)) {
        return normId(ln);
      }

      const wanted = normKey(seriesLike);
      for (const k of Object.keys(ln)) {
        if (normKey(k) === wanted) return normId(ln[k]);
      }

      const fallbacks = store.lessonKeyFallbacks || ["default", "current"];
      for (let i = 0; i < fallbacks.length; i++) {
        const fk = fallbacks[i];
        if (ln[fk] != null) return normId(ln[fk]);
      }

      const vals = Object.values(ln);
      for (let i = 0; i < vals.length; i++) {
        const s = normId(vals[i]);
        if (/^\d+$/.test(s)) return s;
      }
      return "";
    };

    const getUrlLink = computed(() => {
      const root = window.location.origin;
      const p =
        window.location.pathname +
        window.location.search +
        window.location.hash;

      if (p.includes("video")) return videoUrlLink(root);
      if (p.includes("series")) return seriesUrlLink(root);
      return root;
    });

    const videoUrlLink = (root) => {
      const codeJF = normId(store.languageCodeJFSelected);
      const codeHL = normId(store.languageCodeHLSelected);
      const lesson = pickLessonFor("jvideo");
      return (
        root +
        "/jvideo/" +
        normPathSeg(lesson) +
        "/" +
        normPathSeg(codeHL) +
        "/" +
        normPathSeg(codeJF)
      );
    };

    const seriesUrlLink = (root) => {
      const codeHL = normId(store.languageCodeHLSelected);
      const series = fromObjId(store.currentStudySelected);

      if (!isAllowedSeries(series)) {
        console.warn("Blocked non-allowed series:", series);
        return root;
      }

      const lesson = pickLessonFor(series);
      return (
        root +
        "/series/" +
        normPathSeg(series) +
        "/" +
        normPathSeg(lesson) +
        "/" +
        normPathSeg(codeHL)
      );
    };

    const safeT = (key, fallback) => {
      const fb = fallback == null ? "" : String(fallback);
      if (!key) return fb;
      return te(key) ? t(key) : fb;
    };

    const readyInterface = computed(() => {
      return te("interface.share") && te("interface.copyLink");
    });

    const readySite = computed(() => {
      return te("siteContent.shareTitle") || te("siteContent.shareMessage");
    });

    const shareUrl = async () => {
      const subject = safeT(
        "siteContent.shareTitle",
        "Discovering Spiritual Community"
      );
      const message = safeT("siteContent.shareMessage", "Here is the link");
      const url = getUrlLink.value;

      if (navigator.share) {
        try {
          await navigator.share({ title: subject, text: message, url });
          $q.notify({
            type: "positive",
            message: safeT("interface.shareSuccess", "Shared successfully!"),
          });
        } catch (e) {
          console.error("Error sharing:", e);
          $q.notify({
            type: "negative",
            message: safeT("interface.shareFailed", "Sharing failed!"),
          });
        }
      } else {
        $q.notify({
          type: "warning",
          message: safeT(
            "interface.shareUnsupported",
            "Sharing not supported. Using fallback."
          ),
        });
        shareFallback(url, subject, message);
      }
    };

    const shareFallback = (url, subject, message) => {
      const encodedSubject = encodeURIComponent(subject);
      const encodedMessage = encodeURIComponent(message + ": " + url);

      const shareOptions = {
        email: "mailto:?subject=" + encodedSubject + "&body=" + encodedMessage,
        whatsapp: "https://api.whatsapp.com/send?text=" + encodedMessage,
        facebook:
          "https://www.facebook.com/sharer/sharer.php?u=" +
          encodeURIComponent(url),
        twitter: "https://twitter.com/intent/tweet?text=" + encodedMessage,
        linkedin:
          "https://www.linkedin.com/sharing/share-offsite/?url=" +
          encodeURIComponent(url),
      };

      $q.dialog({
        title: safeT("interface.shareVia", "Share via"),
        message: safeT("interface.choosePlatform", "Choose a platform:"),
        options: Object.keys(shareOptions).map((p) => ({
          label: p.charAt(0).toUpperCase() + p.slice(1),
          handler: () => window.open(shareOptions[p], "_blank"),
        })),
        cancel: true,
      });
    };

    const copyToClipboard = async (text) => {
      try {
        await navigator.clipboard.writeText(String(text || ""));
        $q.notify({
          type: "positive",
          message: safeT("interface.linkCopied", "Link copied to clipboard!"),
        });
      } catch (err) {
        console.error("Failed to copy:", err);
        $q.notify({
          type: "negative",
          message: safeT("interface.copyFailed", "Failed to copy the link."),
        });
      }
    };

    return {
      shareUrl,
      copyToClipboard,
      getUrlLink,
      t,
      safeT,
      readyInterface,
      readySite,
    };
  },
};
</script>

<template>
  <div class="row items-center no-wrap q-gutter-xs">
    <q-btn
      flat
      dense
      round
      icon="share"
      :aria-label="readyInterface ? t('interface.share') : 'Share'"
      @click="shareUrl"
    />
    <q-btn
      flat
      dense
      round
      icon="content_copy"
      :aria-label="readyInterface ? t('interface.copyLink') : 'Copy link'"
      @click="copyToClipboard(getUrlLink)"
    >
      <q-tooltip>
        {{ readyInterface ? t("interface.copyLink") : "Copy link" }}
      </q-tooltip>
    </q-btn>
  </div>
</template>
