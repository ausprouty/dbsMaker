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
.seasonal-header {
  position: relative;
  border-radius: 16px;
  overflow: hidden;
}

.seasonal-header__bg {
  position: absolute;
  inset: 0;
  background-size: cover;
  background-position: center;
  transform: scale(1.02);
}

.seasonal-header__inner {
  position: relative;
  padding: 18px 16px;
  background: linear-gradient(
    to right,
    rgba(255, 255, 255, 0.92),
    rgba(255, 255, 255, 0.7)
  );
}

.seasonal-header__content {
  max-width: 820px;
}

.seasonal-header__title {
  margin: 0 0 6px 0;
  font-size: 1.25rem;
  font-weight: 700;
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
</style>
