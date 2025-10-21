import { clearTable } from "src/services/IndexedDBService";
import { useContentStore } from "src/stores/ContentStore";
import {getTranslatedInterface} from "src/services/InterfaceService"


export async function clearOrUpdateData() {
  const contentStore = useContentStore();
  contentStore.$reset();
  deleteLocalStorageContentKeys();
  await clearContentTables();
  // Load new i18n interface files (assuming locale is stored in store or localStorage)
  const languageCodeHL = localStorage.getItem("locale") || "en";
  await getTranslatedInterface(languageCodeHL);
}

function deleteLocalStorageContentKeys() {
  const keysToDelete = [];

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key.endsWith("commonContent") || key.endsWith("lessonContent")) {
      keysToDelete.push(key);
    }
  }

  keysToDelete.forEach((key) => {
    console.log(`Removing localStorage key: ${key}`);
    localStorage.removeItem(key);
  });
}

async function clearContentTables() {
  const tables = ["commonContent", "lessonContent", "interface", "videoUrls"];

  for (const table of tables) {
    try {
      await clearTable(table);
      console.log(`Cleared ${table}`);
    } catch (err) {
      console.warn(`Failed to clear ${table}:`, err);
    }
  }
}
