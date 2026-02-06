<script setup>
import { computed, unref } from "vue";
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { useSettingsStore } from "src/stores/SettingsStore";
import { useSiteContent } from "src/composables/useSiteContent";
import { storeToRefs } from "pinia";

const router = useRouter();
const { t, te } = useI18n({ useScope: "global" });
const settingsStore = useSettingsStore();
const { textLanguageObjectSelected } = storeToRefs(settingsStore);

const hl = computed(() => {
  var obj = textLanguageObjectSelected.value || null;
  var code = obj && obj.languageCodeHL ? String(obj.languageCodeHL) : "";
  code = code.trim();
  return code ? code : "eng00";
});

// useSiteContent is the single source of truth for already-normalized siteContent
// Assume it returns:
//   - siteContent (root object)
//   - indexParas (array of strings)
//   - getSection(key) -> { title, summary, paras }
const { indexParas, getSection } = useSiteContent(hl);

const loading = computed(
  () =>
    settingsStore.menuStatus === "loading" &&
    (!settingsStore.menu || settingsStore.menu.length === 0)
);
const error = computed(() => settingsStore.menuError);
const menuItems = computed(() => settingsStore.menu ?? []);

function getSectionKeyFromMenuItem(item) {
  const k = String(item && item.key ? item.key : "")
    .trim()
    .toLowerCase();
  return k;
}

const menuItemsResolved = computed(() => {
  const items = menuItems.value || [];

  return items.map((item) => {
    const sectionKey = getSectionKeyFromMenuItem(item);

    const section =
      typeof getSection === "function"
        ? getSection(sectionKey)
        : { title: "", summary: "", paras: [] };

    var title =
      (section && section.title ? section.title : "") ||
      (item && item.title ? item.title : "") ||
      "";

    var summary =
      (section && section.summary ? section.summary : "") ||
      (item && item.summary ? item.summary : "") ||
      "";

    return Object.assign({}, item, {
      _title: title,
      _summary: summary,
    });
  });
});

const handleImageClick = (to) => {
  if (to) router.push(to);
};
</script>

<template>
  <q-page class="bg-white q-pa-md">
    <div class="introPanel">
      <div class="intro">
        <p v-for="(intro, i) in indexParas" :key="i">
          {{ intro }}
        </p>
      </div>
    </div>
    <div class="menu-container">
      <div v-if="error" class="text-negative q-mt-md">{{ error }}</div>
      <div v-else-if="loading" class="q-mt-md">Loading…</div>

      <div v-else class="menu-grid">
        <div
          v-for="item in menuItemsResolved"
          :key="item.key"
          class="menu-col"
          @click="handleImageClick(item.route)"
        >
          <div class="menu-card hoverable">
            <img :src="item.image" class="menu-picture" />
            <div class="menu-label">
              <h6>{{ item._title }}</h6>

              <p class="menu-summary">
                {{ item._summary }}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div class="text-center q-mt-xl">
        <img
          class="icon"
          src="images/settings.png"
          @click="handleImageClick('/reset')"
        />
      </div>
    </div>
  </q-page>
</template>

<style scoped>
.menu-container {
  max-width: 1400px;
  margin: 0 auto;
  padding: 0 16px;
}

.menu-container p {
  overflow-wrap: anywhere;
}

.menu-grid {
  display: grid;
  gap: 20px;
  /*
    Auto-fit gives you a "nice" number of columns naturally.
    The min width controls card size; tweak 280/300 to taste.
  */
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  align-items: stretch;
}

/* Give extra breathing room on very wide screens */
@media (min-width: 1400px) {
  .menu-container {
    max-width: 1600px;
  }
  .menu-grid {
    gap: 24px;
    grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  }
}

/* no sizing on items - let the grid handle it */
.menu-col {
  box-sizing: border-box;
}

.menu-card {
  background: #fff;
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 14px;
  overflow: hidden;

  box-shadow: 0 8px 22px rgba(0, 0, 0, 0.1);
  transition: transform 0.18s ease, box-shadow 0.18s ease;

  height: 100%;
  cursor: pointer;
  display: flex;
  flex-direction: column;
}

p.menu-summary {
  text-align: left;
}

.menu-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 14px 34px rgba(0, 0, 0, 0.14);
}

.menu-picture {
  display: block;
  width: 100%;
  aspect-ratio: 16 / 9;
  object-fit: cover;
  border-radius: 0; /* important: image is edge-to-edge */
}

/* move padding to the label area, not the whole card */
.menu-label {
  padding: 12px 14px 14px;
}

.menu-label h6 {
  color: var(--color-text); /* charcoal-ish */
  font-weight: 800;
  font-size: 1.15rem;
  line-height: 1.2;
  margin: 0 0 6px 0;
}
/* add a small amber cue instead of full amber text */
.menu-label h6::after {
  content: "";
  display: block;
  width: 56px;
  height: 3px;
  margin-top: 8px;
  background: var(--color-secondary); /* amber */
  border-radius: 3px;
  opacity: 0.95;
}

.menu-label p {
  margin: 0;
}

p.menu-summary {
  line-height: 1.35;
  /* Keep card heights more consistent */
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 4;
  /* standard property (newer spec) */
  line-clamp: 4;
  overflow: hidden;
}

img.icon {
  height: 30px;
  cursor: pointer;
}
.introPanel {
  max-width: 1200px; /* match cards container */
  margin: 14px auto 12px; /* tightens space above/below */
  padding: 14px 18px;
  background: rgba(248, 243, 238, 0.9); /* your $neutral */

  /* accent line all around */
  border: 3px solid #d59744; /* your $secondary */
  border-radius: 14px;

  /* no lopsided shadow */
  box-shadow: none;
}

.intro {
  font-size: clamp(14pt, 1.2vw, 18pt);
  line-height: 1.35;
  max-width: 92ch;
  margin: 0;
}

.intro p {
  margin: 0 0 0.8em 0; /* vertical space between paragraphs */
}

.intro p:last-child {
  margin-bottom: 0;
}
</style>
