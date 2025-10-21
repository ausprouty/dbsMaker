// Vimeo-specific builder (plain JS)

function flattenMeta(maybeNested) {
  if (
    maybeNested &&
    typeof maybeNested === "object" &&
    !Array.isArray(maybeNested) &&
    maybeNested.meta &&
    typeof maybeNested.meta === "object" &&
    !Array.isArray(maybeNested.meta)
  ) {
    return maybeNested.meta;
  }
  return maybeNested || {};
}

export function buildVimeoSource(input) {
  var v = flattenMeta(input.meta);
  var vimeoId = null;
  var direct = null;

  if (v.lessons && v.lessons[input.lesson]) {
    var l = v.lessons[input.lesson];
    if (l && l.vimeoId) vimeoId = l.vimeoId;
    if (l && l.src) direct = l.src;
  }
  if (!vimeoId && v.vimeoId) vimeoId = v.vimeoId;
  if (!direct && v.src) direct = v.src;

  if (vimeoId) {
    return {
      provider: "vimeo",
      kind: "iframe",
      src:
        "https://player.vimeo.com/video/" +
        String(vimeoId) +
        "?badge=0&byline=0&title=0",
      title: v.title || "Video",
      poster: v.poster,
      tracks: Array.isArray(v.tracks) ? v.tracks : undefined,
    };
  }

  return {
    provider: "vimeo",
    kind: "video",
    src: String(direct || ""),
    title: v.title || "Video",
    poster: v.poster,
    tracks: Array.isArray(v.tracks) ? v.tracks : undefined,
  };
}
