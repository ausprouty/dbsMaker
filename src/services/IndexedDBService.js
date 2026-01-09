import * as ContentKeys from "src/utils/ContentKeyBuilder";

const dbName = "MyBibleApp";
const dbVersion = 3;
const IDB_TX_MAX_RETRIES = 2; // total retries after the first attempt
const IDB_TX_RETRY_DELAY_MS = 25;

let dbInstance = null;
let dbPromise = null;
let deletingDb = false;

// Vite/Quasar dev flag – safe in both dev and prod builds
const IS_DEV = import.meta.env && import.meta.env.DEV;

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// ------------------------------------------------------------
// Open / manage DB (singleton + safe reopen)
// ------------------------------------------------------------
export function openDatabase() {
  if (typeof indexedDB === "undefined") {
    console.warn(`IndexedDB not available — skipping IndexedDB caching`);
    return Promise.resolve(null);
  }

  if (deletingDb) {
    if (IS_DEV) console.debug("[IDB] openDatabase blocked: delete in progress");
    return Promise.resolve(null);
  }

  // If we already have a usable open connection, return it.
  if (dbInstance) return Promise.resolve(dbInstance);

  // Deduplicate concurrent opens.
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(dbName, dbVersion);

    request.onerror = (event) => {
      const err = event && event.target ? event.target.error : event;
      dbPromise = null;
      reject(err);
    };

    request.onblocked = () => {
      // Usually means another tab has the DB open in a way that blocks upgrade.
      console.warn(`[IDB] open blocked for "${dbName}" (another tab open?)`);
    };

    request.onsuccess = (event) => {
      dbInstance = event.target.result;

      // If the browser closes this connection, drop our reference.
      dbInstance.onclose = () => {
        if (IS_DEV) console.debug("[IDB] connection closed");
        dbInstance = null;
      };

      // If another context upgrades the DB, close and force reopen.
      dbInstance.onversionchange = () => {
        if (IS_DEV) console.debug("[IDB] versionchange → closing connection");
        try {
          dbInstance.close();
        } catch (_) {}
        dbInstance = null;
      };

      // Some browsers can surface connection-level errors here.
      dbInstance.onerror = (e) => {
        if (IS_DEV) console.debug("[IDB] connection error", e);
        dbInstance = null;
      };

      dbPromise = null;
      resolve(dbInstance);
    };

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      if (!db.objectStoreNames.contains("siteContent")) {
        db.createObjectStore("siteContent");
      }
      if (!db.objectStoreNames.contains("commonContent")) {
        db.createObjectStore("commonContent");
      }
      if (!db.objectStoreNames.contains("lessonContent")) {
        db.createObjectStore("lessonContent");
      }
      if (!db.objectStoreNames.contains("interface")) {
        db.createObjectStore("interface");
      }
      if (!db.objectStoreNames.contains("notes")) {
        db.createObjectStore("notes");
      }
      if (!db.objectStoreNames.contains("study_progress")) {
        db.createObjectStore("study_progress");
      }
    };
  });

  return dbPromise;
}

// ------------------------------------------------------------
// Tx helper (handles rare "connection is closing" race)
// ------------------------------------------------------------
function isClosingError(err) {
  const name = err && err.name ? String(err.name) : "";
  const msg = err && err.message ? String(err.message) : "";
  return (
    name === "InvalidStateError" &&
    msg.toLowerCase().indexOf("connection is closing") !== -1
  );
}

async function withTx(storeName, mode, fn, attempt) {
  attempt = attempt == null ? 0 : attempt;

  const db = await openDatabase();
  if (!db) return fn(null, null, null);

  try {
    const tx = db.transaction(storeName, mode);
    const store = tx.objectStore(storeName);
    return fn(tx, store, db);
  } catch (err) {
    if (isClosingError(err) && attempt < IDB_TX_MAX_RETRIES) {
      if (IS_DEV) {
        console.debug(
          `[IDB] tx failed (closing) → retry ${
            attempt + 1
          }/${IDB_TX_MAX_RETRIES}`
        );
      }

      // Drop references and retry with a fresh connection.
      dbInstance = null;
      dbPromise = null;

      if (IDB_TX_RETRY_DELAY_MS > 0) {
        await sleep(IDB_TX_RETRY_DELAY_MS);
      }

      return withTx(storeName, mode, fn, attempt + 1);
    }
    throw err;
  }
}

// --- IndexedDB core -----------------------------------------
async function saveItem(storeName, key, value, opts = {}) {
  const { allowEmpty = false, deleteOnEmpty = true } = opts;

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

  // Block empties (and optionally delete existing)
  if (!allowEmpty && !isMeaningful(value)) {
    if (IS_DEV) {
      console.debug(`Empty/meaningless value for "${key}" — not saving.`);
      console.debug(value);
    }

    if (deleteOnEmpty) {
      return withTx(storeName, "readwrite", (tx, store) => {
        if (!store) {
          if (IS_DEV) console.debug("[IDB] delete skipped (no db)");
          return Promise.resolve(false);
        }
        return new Promise((resolve, reject) => {
          const del = store.delete(key);
          del.onsuccess = () => resolve(true);
          del.onerror = (e) => reject(e);
        });
      });
    }
    return false;
  }

  // Save meaningful values
  return withTx(storeName, "readwrite", (tx, store) => {
    if (!store) {
      if (IS_DEV) console.debug("[IDB] save skipped (no db)");
      return Promise.resolve(false);
    }
    return new Promise((resolve, reject) => {
      const req = store.put(value, key);
      req.onsuccess = () => resolve(true);
      req.onerror = (e) => reject(e);
    });
  });
}

async function getItem(storeName, key, opts = {}) {
  const { deleteIfEmpty = true } = opts;

  if (key == null) {
    console.warn(`❌ Refusing to get from "${storeName}" because key is null.`);
    return null;
  }

  return withTx(
    storeName,
    deleteIfEmpty ? "readwrite" : "readonly",
    (tx, store) => {
      if (!store) {
        if (IS_DEV) console.debug("[IDB] get skipped (no db)");
        return Promise.resolve(null);
      }

      return new Promise((resolve, reject) => {
        const req = store.get(key);

        req.onsuccess = () => {
          const val = req.result;

          // Missing key = cache miss
          if (val === undefined) {
            if (IS_DEV) console.debug("[IDB] cache miss for", String(key));
            resolve(null);
            return;
          }

          if (!isMeaningful(val)) {
            console.warn("[IDB] meaningless value at", String(key), "→", val);

            if (IS_DEV) {
              console.groupCollapsed(`🧹 Purge candidate ${key}`);
              console.log("preview:", previewVal(val));
              console.dir(val);
              console.groupEnd();
            }

            if (deleteIfEmpty && tx && tx.mode === "readwrite") {
              try {
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
  );
}

function previewVal(v) {
  if (v == null) return String(v);
  if (typeof v === "string") {
    return `"${v.slice(0, 120)}"${v.length > 120 ? `…(${v.length})` : ""}`;
  }
  if (Array.isArray(v)) {
    return `Array(${v.length}) [${v
      .slice(0, 5)
      .map((x) => (typeof x === "string" ? `"${x.slice(0, 20)}"` : String(x)))
      .join(", ")}${v.length > 5 ? ", …" : ""}]`;
  }
  if (v instanceof Blob) return `Blob ${v.type} ${v.size}B`;
  if (v instanceof ArrayBuffer) return `ArrayBuffer ${v.byteLength}B`;
  if (v && typeof v === "object") return `Object keys=${Object.keys(v).length}`;
  return String(v);
}

// ----------------- Interface Content -----------------
export async function getInterfaceFromDB(languageCodeHL) {
  const key = ContentKeys.buildInterfaceKey(languageCodeHL);
  return getItem("interface", key);
}

export async function saveInterfaceToDB(languageCodeHL, content) {
  const key = ContentKeys.buildInterfaceKey(languageCodeHL);
  return saveItem("interface", key, content);
}

// ----------------- Site Content -----------------
export async function getSiteContentFromDB(languageCodeHL) {
  const key = ContentKeys.buildSiteContentKey(languageCodeHL);
  return getItem("siteContent", key);
}

export async function saveSiteContentToDB(languageCodeHL, content) {
  const key = ContentKeys.buildSiteContentKey(languageCodeHL);
  return saveItem("siteContent", key, content);
}

// ----------------- Common Content -----------------
export async function getCommonContentFromDB(study, variant, languageCodeHL) {
  const key = ContentKeys.buildCommonContentKey(study, variant, languageCodeHL);
  return getItem("commonContent", key);
}

export async function saveCommonContentToDB(
  study,
  variant,
  languageCodeHL,
  content
) {
  const key = ContentKeys.buildCommonContentKey(study, variant, languageCodeHL);
  console.log(["saveCommonContentToDB"] + key);
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
  return saveItem("lessonContent", key, content);
}

// ----------------- Study Progress -----------------
export async function getStudyProgress(study) {
  const key = ContentKeys.buildStudyProgressKey(study);
  return getItem("study_progress", key).then(
    (data) => data || { completedLessons: [], lastCompletedLesson: null }
  );
}

export async function saveStudyProgress(study, progress) {
  // Ensure we store plain objects, not Vue refs
  const safeProgress = {
    completedLessons: Array.isArray(progress.completedLessons)
      ? [...progress.completedLessons]
      : [],
    lastCompletedLesson:
      progress && "lastCompletedLesson" in progress
        ? progress.lastCompletedLesson
        : null,
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
  const key = ContentKeys.buildNotesKey(study, lesson, section);

  return withTx("notes", "readwrite", (tx, store) => {
    if (!store) {
      if (IS_DEV) console.debug("[IDB] deleteNote skipped (no db)");
      return Promise.resolve(false);
    }

    store.delete(key);

    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve(true);
      tx.onerror = (e) => reject(e);
    });
  });
}

// ----------------- Clear Table -----------------
export async function clearTable(tableName) {
  return withTx(tableName, "readwrite", (tx, store, db) => {
    if (!db || !store) {
      if (IS_DEV) console.debug("[IDB] clearTable skipped (no db)");
      return Promise.resolve(false);
    }

    if (!db.objectStoreNames.contains(tableName)) {
      return Promise.reject(`Table "${tableName}" not found in database.`);
    }

    return new Promise((resolve, reject) => {
      const request = store.clear();
      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    });
  });
}

// --- Clear Database  --------------------------------------
export function clearDatabase() {
  if (typeof indexedDB === "undefined") {
    console.warn("IndexedDB not available — cannot clear MyBibleApp.");
    return Promise.resolve(false);
  }

  return new Promise((resolve, reject) => {
    deletingDb = true;
    dbPromise = null;

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
      deletingDb = false;
      resolve(true);
    };

    req.onerror = (event) => {
      console.warn(
        `Failed to delete IndexedDB database "${dbName}":`,
        event && event.target ? event.target.error : event
      );
      deletingDb = false;
      reject(event && event.target ? event.target.error : event);
    };

    req.onblocked = () => {
      console.warn(
        `Delete for IndexedDB database "${dbName}" is blocked (another tab open?).`
      );
      // Leave deletingDb true until user resolves the block; avoids reopen loops.
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
