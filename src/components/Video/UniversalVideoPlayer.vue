<script setup>
import { computed } from "vue";

// Props expected from adapters
const props = defineProps({
  provider: { type: String, required: true }, // "arclight" | "vimeo" | "file"
  kind: { type: String, required: true },     // "iframe" | "video"
  src: { type: String, required: true },
  poster: { type: String, default: "" },
  title: { type: String, default: "" },
  tracks: { type: Array, default: () => [] }  // [{src, srclang, label, kind}]
});

const isIframe = computed(() => props.kind === "iframe");
</script>

<template>
  <div class="video-shell">
    <iframe
      v-if="isIframe"
      :src="src"
      allow="autoplay; fullscreen; picture-in-picture"
      allowfullscreen
      frameborder="0"
      style="width:100%; aspect-ratio:16/9; border:0"
      :title="title || 'Video'"
    />
    <video
      v-else
      controls
      playsinline
      style="width:100%; aspect-ratio:16/9;"
      :poster="poster || null"
    >
      <source :src="src" />
      <track
        v-for="(t, i) in tracks"
        :key="i"
        :src="t.src"
        :srclang="t.srclang"
        :label="t.label"
        :kind="t.kind || 'subtitles'"
      />
    </video>
  </div>
</template>

<style scoped>
.video-shell { width: 100%; max-width: 1024px; margin: 0 auto; }
</style>
