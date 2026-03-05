<script setup>
import { computed } from "vue";
import { useRoute } from "vue-router";
import { useSettingsStore } from "src/stores/SettingsStore";

const route = useRoute();
const settingsStore = useSettingsStore();

const seasonal = computed(() => settingsStore.seasonalContent);

const shouldShow = computed(() => {
  if (route.meta?.hideSeasonalHeader === true) return false;
  return !!seasonal.value;
});

const title = computed(() => seasonal.value?.title || "");
const summary = computed(() => seasonal.value?.summary || "");
const paras = computed(() => seasonal.value?.paras || []);
const imageUrl = computed(() => seasonal.value?.imageUrl || "");

const bgStyle = computed(() => {
  const u = String(imageUrl.value || "").trim();
  return u ? { backgroundImage: `url("${u}")` } : null;
});
console.log(
  "Seasonal content:",
  imageUrl.value,
  title.value,
  summary.value,
  paras.value,
  bgStyle.value
);
</script>

<template>
  <div v-if="shouldShow" class="seasonal-wrap">
    <section class="seasonal-header" :style="bgStyle">
      <div class="seasonal-header__inner">
        <div class="seasonal-header__content">
          <h2 v-if="title" class="seasonal-header__title">{{ title }}</h2>
          <p v-if="summary" class="seasonal-header__summary">{{ summary }}</p>
          <p v-for="(p, i) in paras" :key="i" class="seasonal-header__para">
            {{ p }}
          </p>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
/* ---- wrapper: controls page gutter + aligns with blocks below ---- */
.seasonal-wrap {
  max-width: 1200px;
  margin: 12px auto 20px; /* top | center | bottom */
  padding: 0 16px; /* gutter on small screens */
  box-sizing: border-box;
}

.seasonal-header {
  position: relative;
  height: 190px;
  border-radius: 14px;
  overflow: hidden;
  border: 1px solid rgba(213, 151, 68, 0.35);

  background-size: cover;
  background-position: center 35%;
  background-repeat: no-repeat;
}

/* ---- readable overlay panel ---- */
.seasonal-header__inner {
  position: relative;
  height: 100%;
  display: flex;
  align-items: center;
  padding: 18px 18px;

  /* universal neutral overlay */
  background: linear-gradient(
    90deg,
    rgba(250, 248, 245, 0.94) 0%,
    rgba(250, 248, 245, 0.78) 42%,
    rgba(250, 248, 245, 0.3) 72%,
    rgba(250, 248, 245, 0) 100%
  );

  z-index: 1;
}

.seasonal-header__content {
  max-width: 820px;
  margin: 0 10px;
}

.seasonal-header__title {
  font-family: var(--q-font-family);
  color: var(--q-secondary);
  font-size: 1.35rem;
  font-weight: 800;
  line-height: 1.15;
  margin: 0 0 8px 0;
}

.seasonal-header__summary {
  margin: 0 0 10px 0;
  font-size: clamp(12.5pt, 1.1vw, 15pt);
  font-weight: 500;
}

.seasonal-header__para {
  margin: 0 0 8px 0;
  font-size: clamp(12pt, 1.05vw, 14.5pt);
  line-height: 1.45;
}

.seasonal-header__summary,
.seasonal-header__para {
  color: #111; /* consistent readability across sites */
}

/* Optional: on wide screens, the page usually already has gutter,
   so you can remove wrapper padding if you want perfectly tight alignment.
   Keep or delete this block based on how your q-page is padded. */
@media (min-width: 1024px) {
  .seasonal-wrap {
    padding: 0;
  }
}

@media (max-width: 420px) {
  .seasonal-header {
    height: 165px;
  }
  .seasonal-header__inner {
    padding: 14px 14px;
  }
}
</style>
