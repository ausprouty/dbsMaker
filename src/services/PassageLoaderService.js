// src/services/PassageLoaderService.js
import { http } from "src/lib/http";
import { normBibleRef } from "src/utils/normalize";
import {
  getPassageFromDB,
  savePassageToDB,
} from "src/services/IndexedDBService";

export async function getPassage(params) {
  var entry = normBibleRef(params.entry);
  var bid = params.bid ? Number(params.bid) : 0;
  var hl = params.languageCodeHL ? String(params.languageCodeHL) : "";

  // 1) IndexedDB
  var fromDb = await getPassageFromDB(entry, hl, bid);
  if (fromDb && fromDb.text) {
    return fromDb;
  }

  // 2) POST API (one route)
  var payload = { entry: entry };
  if (bid > 0) payload.bid = bid;
  if (bid <= 0 && hl) payload.languageCodeHL = hl;

  var res = await http.post("/v2/bible/passage", payload);
  var data = res && res.data ? res.data : res;
  console.log("PassageLoaderService.getPassage: data", data);
  var record = {
    cacheKey: key,
    entry: entry,
    bid: Number(data.bid || 0),
    hl: hl,
    text: String(data.text || ""),
    url: String(data.url || ""),
    ref: String(data.ref || ""),
    error: String(data.error || ""),
    savedAt: new Date().toISOString(),
  };

  record = normalizePassageRecord(record);
  console.log("PassageLoaderService.getPassage: record", record);
  const hasError =
    typeof record.error === "string" && record.error.trim() !== "";
  console.log("PassageLoaderService.hasError: ", hasError);
  const hasText = typeof record.text === "string" && record.text.trim() !== "";
  console.log("PassageLoaderService.hasText: ", hasText);
  if (!hasError && hasText) {
    console.log("PassageLoaderService.getPassage: saving to DB", record);
    await savePassageToDB(entry, hl, bid, record);
  }

  return record;
}

function normalizePassageRecord(r) {
  console.log("PassageLoaderService.normalizePassageRecord: ", r);
  const obj = r && typeof r === "object" ? r : {};

  let error = "";
  if (typeof obj.error === "string") {
    error = obj.error.trim();
  } else if (obj.error == null) {
    error = "";
  } else {
    error = String(obj.error).trim();
  }
  console.log("PassageLoaderService.normalizePassageRecord.error: ", error);

  let text = "";
  if (typeof obj.text === "string") {
    text = obj.text;
  } else if (typeof obj.passage === "string") {
    // common alternate key
    text = obj.passage;
  } else if (typeof obj.content === "string") {
    // another possible alternate key
    text = obj.content;
  }
  console.log("PassageLoaderService.normalizePassageRecord.text: ", text);

  return Object.assign({}, obj, { error, text });
}
