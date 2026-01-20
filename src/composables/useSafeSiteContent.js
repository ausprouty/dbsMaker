// src/composables/useSafeSiteContent.js
import { computed } from "vue";
import { storeToRefs } from "pinia";
import { useContentStore } from "src/stores/ContentStore";

function isObjectLike(v) {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

// Resolve dot paths like "review.empty" from an object
function getByPath(root, path) {
  if (!isObjectLike(root)) return null;

  var p = path == null ? "" : String(path);
  p = p.trim();
  if (!p) return null;

  var parts = p.split(".");
  var cur = root;
  var i;

  for (i = 0; i < parts.length; i++) {
    if (!isObjectLike(cur)) return null;

    var key = parts[i];
    if (!(key in cur)) return null;

    cur = cur[key];
  }

  return cur;
}

export function useSafeSiteContent() {
  const contentStore = useContentStore();
  const { siteContent } = storeToRefs(contentStore);

  const siteContentReady = computed(function () {
    return isObjectLike(siteContent.value);
  });

  function safeSiteT(key, fallback) {
    var fb = fallback == null ? "" : String(fallback);

    var raw = getByPath(siteContent.value, key);

    if (raw == null) return fb;
    if (typeof raw !== "string") return fb;

    var s = raw.trim();
    return s ? s : fb;
  }

  return {
    siteContent,
    siteContentReady,
    safeSiteT,
  };
}
