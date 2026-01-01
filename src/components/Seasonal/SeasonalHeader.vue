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
</script>

<template>
  <section v-if="shouldShow" class="seasonal-header">
    <div
      v-if="imageUrl"
      class="seasonal-header__bg"
      :style="{ backgroundImage: `url(${imageUrl})` }"
      aria-hidden="true"
    />

    <div class="seasonal-header__inner">
      <div class="seasonal-header__content">
        <h2 v-if="title" class="seasonal-header__title">
          {{ title }}
        </h2>

        <p v-if="summary" class="seasonal-header__summary">
          {{ summary }}
        </p>

        <p v-for="(p, i) in paras" :key="i" class="seasonal-header__para">
          {{ p }}
        </p>
      </div>
    </div>
  </section>
</template>

<style scoped>
/* ---- wrapper: controls page gutter + aligns with blocks below ---- */
.seasonal-wrap {
  max-width: 1100px;
  margin: 12px auto 20px; /* top | center | bottom */
  padding: 0 16px; /* gutter on small screens */
  box-sizing: border-box;
}

/* ---- card ---- */
.seasonal-header {
  position: relative;
  border-radius: 0;
  overflow: hidden;
}

/* ---- background image layer (covers full card) ---- */
.seasonal-header__bg {
  position: absolute;
  inset: 0;
  background-size: cover;
  background-position: center;
  transform: scale(1.02);
  z-index: 0;
}

/* ---- readable overlay panel ---- */
.seasonal-header__inner {
  position: relative;
  padding: 18px 16px;
  background: linear-gradient(
    to right,
    rgba(255, 255, 255, 0.92),
    rgba(255, 255, 255, 0.7)
  );
  z-index: 1;
}

.seasonal-header__content {
  max-width: 820px;
  margin-left: 10px;
  margin-right: 10px;
}

.seasonal-header__title {
  color: var(--q-accent);
  font-size: 1.15rem;
  font-weight: 700;
  margin: 0 0 6px 0;
}

.seasonal-header__summary {
  margin: 0 0 10px 0;
  font-size: 1rem;
  font-weight: 500;
}

.seasonal-header__para {
  margin: 0 0 8px 0;
  font-size: 0.95rem;
  line-height: 1.45;
}

/* Optional: on wide screens, the page usually already has gutter,
   so you can remove wrapper padding if you want perfectly tight alignment.
   Keep or delete this block based on how your q-page is padded. */
@media (min-width: 1024px) {
  .seasonal-wrap {
    padding: 0;
  }
}
</style>
