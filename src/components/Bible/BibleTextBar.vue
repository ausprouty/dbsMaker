<script setup>
import { ref, computed, toRefs } from "vue";
import { useI18n } from "vue-i18n";
import { useBibleReference } from "src/composables/useBibleReference";

const { t, te } = useI18n({ useScope: "global" });

// allow null to avoid Vue "Expected Object, got Null" warning
const props = defineProps({
  passage: { type: Object, default: null },
});

const { passage } = toRefs(props);
const { cleanReference } = useBibleReference();

const isVisible = ref(false);

const hasPassage = computed(() => {
  return !!(passage.value && typeof passage.value === "object");
});

const hasText = computed(() => {
  if (!hasPassage.value) return false;
  const raw = String(passage.value.passageText || "");
  return raw.trim().length > 0;
});

const hasUrl = computed(() => {
  if (!hasPassage.value) return false;
  const raw = String(passage.value.passageUrl || "");
  return raw.trim().length > 0;
});

function getReadPlainFallback() {
  if (te("interface.readPlain")) {
    return t("interface.readPlain");
  }
  return "Read from the Bible";
}

const cleanedTitle = computed(() => {
  const p = passage.value;
  if (!p || typeof p !== "object") {
    return "";
  }

  const raw = String(p.referenceLocalLanguage || "");
  const firstLine =
    raw
      .split(/\r?\n|\r/)
      .map((s) => s.trim())
      .find(Boolean) || "";

  return cleanReference(firstLine);
});

const readLabel = computed(() => {
  // If there is no passage at all, just use the plain fallback
  if (!hasPassage.value) {
    return getReadPlainFallback();
  }

  const title = cleanedTitle.value;

  // Only show "Read {title}" if we actually have inline text
  if (hasText.value && title && te("interface.read")) {
    return t("interface.read", [title]);
  }

  return getReadPlainFallback();
});

const linkText = computed(() => {
  const p = passage.value;
  if (!p) {
    return "";
  }
  if (hasText.value) {
    return t("interface.readMore");
  }
  const title = cleanedTitle.value;
  // If you want a separate text for the button that opens Bible text:
  if (title && te("interface.bibleExternal")) {
    return t("interface.bibleExternal", [title]);
  }
  return getReadPlainFallback();
});
</script>

<template>
  <div v-if="hasPassage">
    <div class="bible-container">
      <button
        type="button"
        class="toggle-button"
        @click="isVisible = !isVisible"
        :aria-expanded="isVisible ? 'true' : 'false'"
      >
        <span class="toggle-icon" aria-hidden="true">
          {{ isVisible ? "▼" : "►" }}
        </span>

        <span class="toggle-label" dir="auto">
          {{ readLabel }}
        </span>
      </button>

      <div v-show="isVisible" class="bible-section">
        <div
          v-if="hasText"
          v-html="passage.passageText"
          class="bible-text"
        ></div>

        <a
          v-if="hasUrl"
          :href="passage.passageUrl"
          class="readmore-button"
          target="_blank"
          rel="noopener"
        >
          {{ linkText }}
        </a>
      </div>
    </div>
  </div>
</template>

<style scoped>
.bible-container {
  margin-top: 20px;
  padding: 16px;
  border: 2px solid var(--color-accent);
  border-radius: 8px;
  background-color: var(--color-neutral);
  color: var(--color-minor2);
  box-shadow: 0 2px 6px var(--color-shadow);
}
.toggle-button {
  width: 100%;
  font-size: 18px;
  font-weight: 700;
  padding: 12px;
  border: none;
  background-color: var(--color-primary);
  color: var(--color-on-primary);
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  justify-content: flex-start; /* default LTR layout */
  transition: background-color 0.3s ease, color 0.3s ease;
}

/* icon before text in LTR */
.toggle-icon {
  margin-right: 0.5rem;
}

/* RTL: right-align content, label then icon, and flip the arrow */
[dir="rtl"] .toggle-button {
  flex-direction: row-reverse; /* label then icon */
  justify-content: flex-end; /* hug the right edge */
}

[dir="rtl"] .toggle-icon {
  margin-right: 0;
  margin-left: 0.5rem;
  transform: scaleX(-1); /* ► looks like ◄ in RTL */
}

.bible-section {
  margin-top: 12px;
  background-color: color-mix(in srgb, var(--color-minor1) 85%, white);
  padding: 14px;
  border-left: 4px solid var(--color-accent);
  border-radius: 4px;
}
.bible-text {
  font-size: 16px;
  line-height: 1.6;
  color: var(--color-minor2);
}
</style>
