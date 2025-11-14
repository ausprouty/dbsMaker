import * as ContentKeys from "src/utils/ContentKeyBuilder";
const dbName = "MyBibleApp";
const dbVersion = 3;
let dbInstance = null;

// Vite/Quasar dev flag – safe in both dev and prod builds
const IS_DEV = import.meta.env && import.meta.env.DEV;

export function openDatabase() {
  if (typeof indexedDB === "undefined") {
    console.warn(`IndexedDB not available — skipping IndexedDB caching`);
    return Promise.resolve(null);
  }

  return new Promise((resolve, reject) => {
    if (dbInstance) {
      return resolve(dbInstance);
    }

    const request = indexedDB.open(dbName, dbVersion);

    request.onerror = (event) => {
      // Reject with the actual error object for better debugging
      reject(event.target.error);
    };

    request.onsuccess = (event) => {
      dbInstance = event.target.result;
      resolve(dbInstance);
    };

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      if (!db.objectStoreNames.contains("commonContent"))
        db.createObjectStore("commonContent");

      if (!db.objectStoreNames.contains("lessonContent"))
        db.createObjectStore("lessonContent");

      if (!db.objectStoreNames.contains("interface"))
        db.createObjectStore("interface");

      if (!db.objectStoreNames.contains("notes")) db.createObjectStore("notes");

      if (!db.objectStoreNames.contains("completed_lessons"))
        db.createObjectStore("completed_lessons");

      // ✅ NEW store for per-study tracking
      if (!db.objectStoreNames.contains("study_progress"))
        db.createObjectStore("study_progress");
    };
  });
}

// --- IndexedDB core -----------------------------------------
async function saveItem(storeName, key, value, opts = {}) {
  const {
    allowEmpty = false, // if true, permits saving empties (default: refuse)
    deleteOnEmpty = true, // if value is empty, delete key instead of saving
  } = opts;

  if (key == null) {
    console.warn(`❌ Refusing to save to "${storeName}" because key is null.`);
    return false;
  }

  // Refuse error objects
  if (isPlainObject(value) && "error" in value) {
    console.warn(
      `⛔ Skipping save for key "${key}" due to error: ${value.error}`
    );
    return false;
  }

  const db = await openDatabase();

  // Block empties (and optionally delete existing)
  if (!allowEmpty && !isMeaningful(value)) {
    console.warn(`⚠️ Empty/meaningless value for "${key}" — not saving.`);
    console.warn(value);
    if (deleteOnEmpty) {
      return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, "readwrite");
        const store = tx.objectStore(storeName);
        const del = store.delete(key);
        del.onsuccess = () => resolve(true);
        del.onerror = (e) => reject(e);
      });
    }
    return false;
  }

  // Save meaningful values
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readwrite");
    const store = tx.objectStore(storeName);
    const req = store.put(value, key);
    req.onsuccess = () => resolve(true);
    req.onerror = (e) => reject(e);
  });
}

async function getItem(storeName, key, opts = {}) {
  const {
    deleteIfEmpty = true, // delete `{}`/empty-on-read (default: true)
  } = opts;

  if (key == null) {
    console.warn(`❌ Refusing to get from "${storeName}" because key is null.`);
    return null;
  }

  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    // Use readwrite so we can delete inside the same transaction if empty
    const tx = db.transaction(
      storeName,
      deleteIfEmpty ? "readwrite" : "readonly"
    );
    const store = tx.objectStore(storeName);
    const req = store.get(key);

    req.onsuccess = () => {
      const val = req.result;

      // Treat true "missing key" as a normal cache miss, not a warning.
      if (val === undefined) {
        if (IS_DEV) {
          console.debug("[IDB] cache miss for", String(key));
        }
        resolve(null);
        return;
      }

      if (!isMeaningful(val)) {
        // debug
        console.warn("[IDB] meaningless value at", String(key), "→", val);
        console.log(
          "type:",
          Object.prototype.toString.call(val),
          "ctor:",
          val?.constructor?.name
        );
        console.groupCollapsed(`🧹 Purge candidate ${key}`);
        console.log("preview:", previewVal(val));
        console.dir(val);
        console.groupEnd();
        // Only attempt delete for keys that exist; skip when readonly.
        if (deleteIfEmpty && tx.mode === "readwrite") {
          try {
            // delete is idempotent but keep errors silent
            store.delete(key);
            console.warn(
              `🧹 Purged empty/meaningless "${String(key)}" from IndexedDB.`
            );
          } catch (_) {}
        }
        resolve(null);
        return;
      }
      resolve(val);
    };

    req.onerror = (e) => reject(e);
  });
}

function previewVal(v) {
  if (v == null) return String(v);
  if (typeof v === "string")
    return `"${v.slice(0, 120)}"${v.length > 120 ? `…(${v.length})` : ""}`;
  if (Array.isArray(v))
    return `Array(${v.length}) [${v
      .slice(0, 5)
      .map((x) => (typeof x === "string" ? `"${x.slice(0, 20)}"` : String(x)))
      .join(", ")}${v.length > 5 ? ", …" : ""}]`;
  if (v instanceof Blob) return `Blob ${v.type} ${v.size}B`;
  if (v instanceof ArrayBuffer) return `ArrayBuffer ${v.byteLength}B`;
  if (v && typeof v === "object") return `Object keys=${Object.keys(v).length}`;
  return String(v);
}
// ----------------- Common Content -----------------

export async function getInterfaceFromDB(languageCodeHL) {
  const key = ContentKeys.buildInterfaceKey(languageCodeHL);
  return getItem("interface", key);
}

export async function saveInterfaceToDB(languageCodeHL, content) {
  const key = ContentKeys.buildInterfaceKey(languageCodeHL);
  return saveItem("interface", key, content);
}

// ----------------- Common Content -----------------

export async function getCommonContentFromDB(study, languageCodeHL) {
  const key = ContentKeys.buildCommonContentKey(study, languageCodeHL);
  console.log(key);
  return getItem("commonContent", key);
}

export async function saveCommonContentToDB(study, languageCodeHL, content) {
  const key = ContentKeys.buildCommonContentKey(study, languageCodeHL);
  console.log("SAVE COMMON CONTENT TO DB");
  console.log(key);
  console.log(languageCodeHL);
  console.log(content);
  return saveItem("commonContent", key, content);
}

// ----------------- Lesson Content -----------------

export async function getLessonContentFromDB(
  study,
  languageCodeHL,
  languageCodeJF,
  lesson
) {
  const key = ContentKeys.buildLessonContentKey(
    study,
    languageCodeHL,
    languageCodeJF,
    lesson
  );
  return getItem("lessonContent", key);
}

export async function saveLessonContentToDB(
  study,
  languageCodeHL,
  languageCodeJF,
  lesson,
  content
) {
  const key = ContentKeys.buildLessonContentKey(
    study,
    languageCodeHL,
    languageCodeJF,
    lesson
  );
  console.log("SAVE LESSON CONTENT TO DB");
  console.log(key);
  console.log(content);
  return saveItem("lessonContent", key, content);
}

// ----------------- Study Progress and Last Completed Lesson per Study ---------
export async function getStudyProgress(study) {
  const key = ContentKeys.buildStudyProgressKey(study);
  return getItem("study_progress", key).then(
    (data) => data || { completedLessons: [], lastCompletedLesson: null }
  );
}

export async function saveStudyProgress(study, progress) {
  // Ensure we store plain objects, not Vue refs
  const safeProgress = {
    completedLessons: [...progress.completedLessons],
    lastCompletedLesson: progress.lastCompletedLesson,
  };
  const key = ContentKeys.buildStudyProgressKey(study);
  return saveItem("study_progress", key, safeProgress);
}

// ----------------- Notes -----------------

export async function getNoteFromDB(study, lesson, section) {
  const key = ContentKeys.buildNotesKey(study, lesson, section);
  return getItem("notes", key);
}

export async function saveNoteToDB(study, lesson, section, content) {
  const key = ContentKeys.buildNotesKey(study, lesson, section);
  return saveItem("notes", key, content);
}

export async function deleteNoteFromDB(study, lesson, section) {
  const db = await openDatabase();
  const key = ContentKeys.buildNotesKey(study, lesson, section);
  const tx = db.transaction("notes", "readwrite");
  tx.objectStore("notes").delete(key);
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve(true);
    tx.onerror = (e) => reject(e);
  });
}

// ----------------- Clear Table -----------------

export async function clearTable(tableName) {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    if (!db.objectStoreNames.contains(tableName)) {
      return reject(`Table "${tableName}" not found in database.`);
    }

    const tx = db.transaction([tableName], "readwrite");
    const store = tx.objectStore(tableName);
    const request = store.clear();

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// --- Clear Database  --------------------------------------

export function clearDatabase() {
  if (typeof indexedDB === "undefined") {
    console.warn("IndexedDB not available — cannot clear MyBibleApp.");
    return Promise.resolve(false);
  }

  return new Promise((resolve, reject) => {
    // Close existing connection if we have one
    try {
      if (dbInstance) {
        dbInstance.close();
        dbInstance = null;
      }
    } catch (e) {
      console.warn("Error closing existing IDB instance before delete:", e);
    }

    const req = indexedDB.deleteDatabase(dbName);

    req.onsuccess = () => {
      console.log(`IndexedDB database "${dbName}" deleted.`);
      resolve(true);
    };

    req.onerror = (event) => {
      console.warn(
        `Failed to delete IndexedDB database "${dbName}":`,
        event.target?.error
      );
      reject(event.target?.error || event);
    };

    req.onblocked = () => {
      console.warn(
        `Delete for IndexedDB database "${dbName}" is blocked (another tab open?).`
      );
    };
  });
}

// --- Meaningfulness helpers ---------------------------------
function isPlainObject(v) {
  return (
    v != null &&
    typeof v === "object" &&
    Object.getPrototypeOf(v) === Object.prototype
  );
}

function isMeaningful(v) {
  if (v == null) return false; // null/undefined
  if (typeof v === "string") return v.trim().length > 0;
  if (Array.isArray(v)) return v.length > 0;
  if (isPlainObject(v)) {
    if ("error" in v) return false; // explicit error payloads
    return Object.keys(v).length > 0; // {} is not meaningful
  }
  return true; // numbers, booleans, Date, etc.
}
