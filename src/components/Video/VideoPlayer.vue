<script setup>
import { computed } from "vue"
import { buildVideoSource } from "src/utils/videoSource"

const props = defineProps({
  // NEW: preferred — a single, ready-to-play source object
  // { provider, kind: "iframe"|"video", src, poster?, title?, tracks? }
  source: { type: Object, default: null },

  // LEGACY / fallback inputs (player will build the source)
  video: { type: Object, default: null },          // commonContent.video
  study: { type: [String], default: "jvideo" },
  lesson: { type: [Number, String], default: 1 },
  languageCodeJF: { type: String, default: "529" },
  languageCodeHL: { type: String, default: "eng00" },
})

function coerceNum(n) {
  const x = Number(n)
  return Number.isFinite(x) ? x : 1
}

const effective = computed(function () {
  // If caller supplied a built source, use it directly.
  if (props.source && props.source.src) return props.source

  // Otherwise, build from the legacy inputs using your adapter.
  const v = props.video || {}
  const input = {
    provider: String(v.provider || "").toLowerCase(), // "arclight"|"vimeo"|"file"
    study: String(props.study || "jvideo"),
    lesson: coerceNum(props.lesson),
    languageHL: String(props.languageCodeHL || "eng00"),
    languageJF: String(props.languageCodeJF || "529"),
    meta: v, // pass full spec; videoSource.js knows how to interpret
  }
  console.log (input)
  return buildVideoSource(input) || { kind: "video", src: "" }
})
console.log (effective)
</script>

<template>
  <div v-if="effective && effective.src" class="video-wrap">
    <iframe
      v-if="effective.kind === 'iframe'"
      :src="effective.src"
      allow="autoplay; fullscreen; picture-in-picture"
      allowfullscreen
      frameborder="0"
      style="width:100%;aspect-ratio:16/9"
      :title="effective.title || 'Video'"
    />
    <video
      v-else
      controls
      playsinline
      style="width:100%;aspect-ratio:16/9"
      :poster="effective.poster || undefined"
    >
      <source :src="effective.src" />
      <track
        v-for="(t,i) in (effective.tracks || [])"
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
.video-wrap { width: 100%; }
</style>
