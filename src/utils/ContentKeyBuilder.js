// src/utils/keyBuilders.js
import { normId, normIntish } from "src/utils/normalize";

// Normalize helpers: return null when invalid/falsy after normalization
function nId(value) {
  var v = normId(value);
  return v ? v : null;
}
function nInt(value) {
  var v = normIntish(value);
  return v ? v : null;
}

export function buildCommonContentKey(study, languageCodeHL, variant = null) {
  const s = nId(study);
  const hl = nId(languageCodeHL);
  if (!s || !hl) return null;

  let raw = variant;
  if (
    raw === null ||
    raw === undefined ||
    raw === "" ||
    raw === "null" ||
    raw === "undefined"
  ) {
    raw = "";
  }

  let v = "";
  if (raw) {
    v = nId(raw);
    if (!v) return null;
  }

  const key = v
    ? "commonContent-" + s + "-" + hl + "-v-" + v
    : "commonContent-" + s + "-" + hl;

  console.log("[buildCommonContentKey]", {
    study,
    languageCodeHL,
    variant,
    key,
  });

  return key;
}

export function buildLessonContentKey(
  study,
  languageCodeHL,
  languageCodeJF,
  lesson
) {
  var s = nId(study);
  var hl = nId(languageCodeHL);
  var jf = nInt(languageCodeJF);
  var l = nInt(lesson);
  if (!s || !hl || !jf || !l) return null;

  return "lessonContent-" + s + "-" + hl + "-" + jf + "-lesson-" + l;
}

export function buildInterfaceKey(languageCodeHL) {
  var hl = nId(languageCodeHL);
  return hl ? "interface-" + hl : null;
}

export function buildNotesKey(study, lesson, position) {
  var s = nId(study);
  var l = nInt(lesson);
  if (!s || !l) return null;

  // position is optional; default to '0' after normalization
  var p = nInt(position);
  var pos = p || "0";
  return "notes-" + s + "-" + l + "-" + pos;
}

export function buildVideoUrlsKey(study, languageCodeJF) {
  var s = nId(study);
  var jf = nInt(languageCodeJF);
  if (!s || !jf) return null;

  return "videoUrls-" + s + "-" + jf;
}

export function buildStudyProgressKey(study) {
  var s = nId(study);
  return s ? "progress-" + s : null;
}
