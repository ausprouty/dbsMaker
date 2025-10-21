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

export function buildFileSource(input) {
  var v = flattenMeta(input.meta);
  return {
    provider: "file",
    kind: "video",
    src: String(v.src || ""),
    title: v.title || "Video",
    poster: v.poster,
    tracks: Array.isArray(v.tracks) ? v.tracks : undefined,
  };
}
