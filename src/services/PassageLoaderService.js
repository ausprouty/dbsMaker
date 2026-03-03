// src/services/PassageLoaderService.js
import { http } from "src/lib/http";
import { normBibleRef } from "src/utils/normalize";
import {
  getPassageFromDB,
  savePassageToDB,
} from "src/services/IndexedDBService";

export async function getPassage(params) {
  console.log("[getPassage] params:", params);
  var entry = normBibleRef(params.entry);
  var hl = params.languageCodeHL ? String(params.languageCodeHL) : "";

  console.log("[getPassage] params.entry:", params.entry);
  console.log("[getPassage] normalized entry:", entry);
  console.log("[getPassage] hl:", hl);

  // 1) IndexedDB
  console.log("[getPassage] checking IndexedDB for entry:", entry, "hl:", hl);
  var fromDb = await getPassageFromDB(entry, hl);
  console.log("[getPassage] fromDb:", fromDb);
  if (fromDb && fromDb.text) {
    return fromDb;
  }
  console.log("[getPassage] not found in DB, fetching from API...");

  // 2) POST API (one route)
  var payload = { entry: entry };
  payload.languageCodeHL = hl;

  var res = await http.post("/v2/bible/passage", payload);
  var data = res && res.data ? res.data : res;
  console.log("PassageLoaderService.getPassage: data", data);

  // If the API reports an error, alert and do NOT attempt to save to IndexedDB.
  if (data && typeof data.error === "string" && data.error.trim() !== "") {
    const msg = data.error.trim();
    // Keep alert simple and immediate for now (per request).
    alert("Bible passage error: " + msg);

    return normalizePassageRecord({
      entry: entry,
      bid: Number(data.bid || 0),
      hl: hl,
      text: String(data.text || ""),
      url: String(data.url || ""),
      ref: String(data.ref || ""),
      error: msg,
      savedAt: new Date().toISOString(),
    });
  }

  var record = {
    entry: entry,
    bid: Number(data.bid || 0),
    hl: hl,
    text: String(data.text || ""),
    url: String(data.url || ""),
    ref: String(data.ref || ""),
    savedAt: new Date().toISOString(),
  };
  console.log("PassageLoaderService.getPassage: record", record);
  record = normalizePassageRecord(record);
  console.log("PassageLoaderService.getPassage: record", record);

  const hasText = typeof record.text === "string" && record.text.trim() !== "";
  console.log("PassageLoaderService.hasText: ", hasText);
  if (hasText) {
    console.log("PassageLoaderService saving to DB: ", record);
    await savePassageToDB(entry, hl, record);
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
