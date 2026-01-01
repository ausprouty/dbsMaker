export function isPlainObject(v) {
  if (!v || typeof v !== "object") return false;
  if (Array.isArray(v)) return false;
  return Object.prototype.toString.call(v) === "[object Object]";
}

export function normalizeParaToParas(section) {
  if (!isPlainObject(section)) return section;

  // Already normalized
  if (Array.isArray(section.paras)) return section;

  // Convert para object -> paras array
  if (isPlainObject(section.para)) {
    var keys = Object.keys(section.para);
    keys.sort(function (a, b) {
      return Number(a) - Number(b);
    });

    var out = [];
    for (var i = 0; i < keys.length; i++) {
      var k = keys[i];
      var txt = section.para[k];
      if (typeof txt === "string" && txt.trim().length > 0) {
        out.push(txt);
      }
    }

    var copy = Object.assign({}, section);
    copy.paras = out;
    delete copy.para;
    return copy;
  }

  // No para, no paras: ensure paras exists
  var copy2 = Object.assign({}, section);
  if (!Array.isArray(copy2.paras)) copy2.paras = [];
  return copy2;
}

export function normalizeSiteContentPayload(raw) {
  if (!isPlainObject(raw)) return null;

  var payload = raw.data && isPlainObject(raw.data) ? raw.data : raw;

  if (!isPlainObject(payload)) return null;

  var normalized = {
    meta: payload.meta && isPlainObject(payload.meta) ? payload.meta : {},
    traceId: raw.meta && isPlainObject(raw.meta) ? raw.meta.traceId : null,
    sections: {},
  };

  var keys = Object.keys(payload);
  for (var i = 0; i < keys.length; i++) {
    var k = keys[i];
    if (k === "meta") continue;

    var section = payload[k];
    if (!isPlainObject(section)) continue;

    normalized.sections[k] = normalizeParaToParas(section);
  }

  return normalized;
}
