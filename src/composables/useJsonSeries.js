import { ref } from "vue";

const indexCache = {};
const pageCache = {};

export function useJsonSeries() {
  const index = ref(null);
  const page = ref(null);
  const loading = ref(false);
  const error = ref("");

  async function loadIndex(seriesCode) {
    if (!seriesCode) {
      index.value = null;
      return;
    }

    if (indexCache[seriesCode]) {
      index.value = indexCache[seriesCode];
      return;
    }

    loading.value = true;
    error.value = "";

    try {
      const url = "/content/" + seriesCode + "/index.json";
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error("Index fetch failed: " + res.status);
      }
      const data = await res.json();
      indexCache[seriesCode] = data;
      index.value = data;
    } catch (e) {
      error.value = String(e && e.message ? e.message : e);
      index.value = null;
    } finally {
      loading.value = false;
    }
  }

  function findDayEntry(dayNumber) {
    const idx = index.value;
    if (!idx || !idx.days || !idx.days.length) {
      return null;
    }

    for (let i = 0; i < idx.days.length; i += 1) {
      if (idx.days[i].day === dayNumber) {
        return idx.days[i];
      }
    }
    return null;
  }

  async function loadDay(seriesCode, dayNumber) {
    const entry = findDayEntry(dayNumber);
    if (!entry || !entry.file) {
      page.value = null;
      return;
    }

    const cacheKey = seriesCode + "/" + entry.file;
    if (pageCache[cacheKey]) {
      page.value = pageCache[cacheKey];
      return;
    }

    loading.value = true;
    error.value = "";

    try {
      const url = "/content/" + seriesCode + "/" + entry.file;
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error("Page fetch failed: " + res.status);
      }
      const data = await res.json();
      pageCache[cacheKey] = data;
      page.value = data;
    } catch (e) {
      error.value = String(e && e.message ? e.message : e);
      page.value = null;
    } finally {
      loading.value = false;
    }
  }

  return {
    index,
    page,
    loading,
    error,
    loadIndex,
    loadDay,
    findDayEntry,
  };
}
