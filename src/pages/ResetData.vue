<script setup>
import { useSettingsStore } from "src/stores/SettingsStore";
import { useContentStore } from "src/stores/ContentStore";
import { clearDatabase } from "src/services/IndexedDBService";

import { useQuasar } from "quasar";
import { useRouter } from "vue-router";

const settingsStore = useSettingsStore();
const contentStore = useContentStore();
const $q = useQuasar();
const router = useRouter();

const confirmClearData = () => {
  $q.dialog({
    title: "Confirm",
    message: "Are you sure you want to clear all data? This cannot be undone.",
    cancel: true,
    persistent: true,
  }).onOk(() => {
    clearData();
  });
};

const clearData = async () => {
  localStorage.clear(); // Clear local storage
  settingsStore.$reset(); // Reset Pinia store
  contentStore.$reset();
  // Clear IndexedDB database
  try {
    await clearDatabase();
  } catch (err) {
    console.warn("Failed to clear IndexedDB:", err);
  }
  window.location.href = "/index"; // full reload
};
</script>

<template>
  <div class="container">
    <h2>Reset Application Data</h2>
    <p>
      This will clear all locally stored data and reset the application state.
    </p>
    <q-btn color="red" @click="confirmClearData">Clear Data</q-btn>
  </div>
</template>

<style scoped>
.container {
  text-align: center;
  padding: 20px;
  background-color: #efefef;
}
</style>
