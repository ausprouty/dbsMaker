<script setup>
import { computed, onMounted, watch } from "vue";
import { useJsonSeries } from "src/composables/useJsonSeries";

const props = defineProps({
  seriesCode: { type: String, required: true },
  lesson: { type: Number, required: true },
  languageCodeHL: { type: String, default: "eng00" },
  commonContent: { type: Object, default: null },
});

const { index, page, loading, error, loadIndex, loadDay } = useJsonSeries();

const lang = computed(() => {
  return "en";
});

const title = computed(() => {
  const p = page.value;
  const l = lang.value;
  if (!p || !p.title || !p.title[l]) {
    return "";
  }
  return p.title[l];
});

const introLines = computed(() => {
  const p = page.value;
  const l = lang.value;
  if (!p || !p.intro || !p.intro[l]) {
    return [];
  }
  return p.intro[l];
});

const blocks = computed(() => {
  const p = page.value;
  const l = lang.value;
  if (!p || !p.blocks || !p.blocks[l]) {
    return [];
  }
  return p.blocks[l];
});

const question = computed(() => {
  const p = page.value;
  const l = lang.value;
  if (!p || !p.question || !p.question[l]) {
    return "";
  }
  return p.question[l];
});

const further = computed(() => {
  const p = page.value;
  const l = lang.value;
  if (!p || !p.further_reading || !p.further_reading[l]) {
    return [];
  }
  return p.further_reading[l];
});

async function reload() {
  await loadIndex(props.seriesCode);
  await loadDay(props.seriesCode, props.lesson);
}

onMounted(() => {
  reload();
});

watch(
  () => [props.seriesCode, props.lesson],
  () => {
    reload();
  }
);
</script>

<template>
  <div>
    <div v-if="loading" class="q-mb-md">Loading</div>

    <div v-if="error" class="text-negative q-mb-md">
      {{ error }}
    </div>

    <div v-if="page">
      <h2 class="q-mt-none q-mb-sm">
        {{ title }}
      </h2>

      <p v-for="(line, i) in introLines" :key="'i' + i">
        {{ line }}
      </p>

      <div v-for="(b, i) in blocks" :key="'b' + i" class="q-mb-md">
        <div class="text-subtitle1 q-mb-xs">
          {{ b && b.label && b.label[lang] ? b.label[lang] : "" }}
        </div>

        <p
          v-for="(ln, j) in b && b.lines ? b.lines : []"
          :key="'l' + i + '-' + j"
        >
          {{ ln }}
        </p>
      </div>

      <div class="q-mt-lg">
        <div class="text-subtitle1 q-mb-xs">Question</div>
        <p>
          {{ question }}
        </p>
      </div>

      <div v-if="further.length" class="q-mt-md">
        <div class="text-subtitle1 q-mb-xs">Further reading</div>
        <ul>
          <li v-for="(r, i) in further" :key="'r' + i">
            {{ r }}
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>
