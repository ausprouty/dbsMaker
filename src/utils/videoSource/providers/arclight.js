// src/utils/arclight.js
// Plain JS, no TS. Line lengths kept reasonable.

function pad2(n) {
  n = Number(n) || 0;
  return n < 10 ? "0" + n : String(n);
}

function flattenMeta(maybeNested) {
  if (
    maybeNested && typeof maybeNested === "object" && !Array.isArray(maybeNested)
  ) {
    if (
      maybeNested.meta &&
      typeof maybeNested.meta === "object" &&
      !Array.isArray(maybeNested.meta)
    ) {
      return maybeNested.meta;
    }
    // It might already be a meta-like object
    return maybeNested;
  }
  return {};
}

function isSegmentCode(s) {
  var v = String(s == null ? "" : s);
  return /^\d+-\d+-\d+$/.test(v);
}

function hasJFPlaceholder(s) {
  var v = String(s == null ? "" : s);
  return v.indexOf("{JF}") !== -1 ||
         v.indexOf("{NN}") !== -1 ||
         v.indexOf("{L}")  !== -1;
}

function isLikelyFullRefId(s) {
  // e.g., "1_529-fj_1-0-0" or "1_529-jf6103-0-0"
  var v = String(s == null ? "" : s);
  return /^.+_.+-[^_]+-\d+-\d+$/.test(v);
}

function applyTemplate(tpl, jf, lesson) {
  var nn = pad2(lesson);
  var l  = String(Number(lesson) || 1);
  return String(tpl)
    .replaceAll("{JF}", String(jf || ""))
    .replaceAll("{NN}", nn)
    .replaceAll("{L}", l);
}

/**
 * Build ArcLight refId from meta + lesson + languageCodeJF.
 * Precedence:
 * 1) lessons[lesson].ref (verbatim)
 * 2) lessons[lesson].template (tokens)
 * 3) meta.ref (verbatim)
 * 4) meta.template (tokens)
 * 5) meta.autoJF61 -> "1_<JF>-jf61NN-0-0"
 * 6) segmentMap / segments map:
 *    - full refId (verbatim)
 *    - template with {JF}/{NN}/{L}
 *    - "3-0-0" -> prefix + JF + suffix + code
 * 7) fallback -> prefix + JF + suffix + (lesson + "-0-0")
 */
export function buildArcLightId(videoMeta, lessonNumber, languageCodeJF) {
  var base = flattenMeta(videoMeta) || {};
  var lesson = Number(lessonNumber) || 1;
  var jf = String(languageCodeJF || "");
  var key = String(lesson);

  // 1) Per-lesson explicit ref
  if (
    base.lessons && typeof base.lessons === "object" &&
    !Array.isArray(base.lessons)
  ) {
    var per = base.lessons[lesson];
    if (per && typeof per === "object") {
      if (typeof per.ref === "string" && per.ref) return per.ref;
      if (typeof per.template === "string" && per.template) {
        return applyTemplate(per.template, jf, lesson);
      }
    }
  }

  // 3) Single explicit ref
  if (typeof base.ref === "string" && base.ref) {
    return base.ref;
  }

  // 4) Meta-level template
  if (typeof base.template === "string" && base.template) {
    return applyTemplate(base.template, jf, lesson);
  }

  // 5) JF61 auto
  if (base.autoJF61) {
    return "1_" + jf + "-jf61" + pad2(lesson) + "-0-0";
  }

  // 6) Segment map support ("segmentMap" or object "segments")
  var map = base.segmentMap;
  if (!map || typeof map !== "object" || Array.isArray(map)) {
    var segs = base.segments;
    if (segs && typeof segs === "object" && !Array.isArray(segs)) {
      map = segs;
    }
  }

  var prefix = typeof base.prefix === "string" ? base.prefix : "";
  var suffix = typeof base.suffix === "string" ? base.suffix : "";
  var entry = map && map[key] ? String(map[key]) : "";

  if (isLikelyFullRefId(entry)) return entry;
  if (hasJFPlaceholder(entry)) return applyTemplate(entry, jf, lesson);
  if (isSegmentCode(entry)) return prefix + jf + suffix + entry;
  if (entry) return entry;

  // 7) Fallback
  return prefix + jf + suffix + (key + "-0-0");
}

/**
 * Build ArcLight player URL. Merges:
 * - refId (required)
 * - playerStyle (default "default")
 * - any params from meta.paramsDefault
 * - any params from opts.params (overrides)
 */
export function buildArcLightPlayerUrl(videoMeta, lesson, languageJF, opts) {
  var meta = flattenMeta(videoMeta) || {};
  var base =
    (opts && opts.base) || meta.embedBase ||
    "https://api.arclight.org/videoPlayerUrl/";
  var style =
    (opts && opts.playerStyle) || meta.playerStyle || "default";

  var refId = buildArcLightId(meta, lesson, languageJF);

  if (base.charAt(base.length - 1) !== "/") base += "/";

  var params = new URLSearchParams({ refId: refId, playerStyle: style });

  // Meta-level defaults
  if (meta.paramsDefault && typeof meta.paramsDefault === "object") {
    for (var k in meta.paramsDefault) {
      if (Object.prototype.hasOwnProperty.call(meta.paramsDefault, k)) {
        params.set(k, meta.paramsDefault[k]);
      }
    }
  }

  // Per-call overrides (e.g., start/end)
  if (opts && opts.params && typeof opts.params === "object") {
    for (var k2 in opts.params) {
      if (Object.prototype.hasOwnProperty.call(opts.params, k2)) {
        params.set(k2, opts.params[k2]);
      }
    }
  }

  return base + "?" + params.toString();
}

/**
 * Build the full source record used by your player wrapper.
 */
export function buildArcLightSource(input) {
  var meta = flattenMeta(input);
  var url = buildArcLightPlayerUrl(meta, input.lesson, input.languageJF, {
    base: meta.embedBase,
    playerStyle: meta.playerStyle || "default",
    params: input.params, // optional { start, end, ... }
  });

  return {
    provider: "arclight",
    kind: "iframe",
    src: url,
    title: meta.title || "JESUS Film",
    poster: meta.poster,
    tracks: Array.isArray(meta.tracks) ? meta.tracks : undefined,
  };
}
