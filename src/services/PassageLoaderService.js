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

  if (!record.error && record.text) {
    await savePassageToDB(entry, hl, bid, record);
  }

  return record;
}
