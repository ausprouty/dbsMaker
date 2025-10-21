<script setup>
  import { computed, onMounted, watch } from "vue"
  import { useRouter } from "vue-router"
  import { useI18n } from "vue-i18n"
  import { useSettingsStore } from "src/stores/SettingsStore"

  const router = useRouter()
  const { t, te, locale } = useI18n({ useScope: "global" })
  const settingsStore = useSettingsStore()

  const loading = computed(
    () =>
      settingsStore.menuStatus === "loading" &&
      (!settingsStore.menu || settingsStore.menu.length === 0)
  )
  const error = computed(() => settingsStore.menuError)
  const menuItems = computed(() => settingsStore.menu ?? [])

  const handleImageClick = (to) => { if (to) router.push(to) }


</script>


<template>
  <q-page class="bg-white q-pa-md">
    <div class="menu-container">
      <p>{{ t("index.para.1") }}</p>
      <p>{{ t("index.para.2") }}</p>

      <div v-if="error" class="text-negative q-mt-md">{{ error }}</div>
      <div v-else-if="loading" class="q-mt-md">Loading…</div>

      <div v-else class="menu-grid">
        <div
          v-for="item in menuItems"
          :key="item.key"
          class="menu-col"
          @click="handleImageClick(item.route)"
        >
          <div class="menu-card hoverable">
            <img :src="item.image" class="menu-picture" />
            <div class="menu-label">
               <h6>{{ t((String(item.key) || "").toLowerCase() + ".title", item.title || item.key) }}</h6>

              <p class="menu-explanation">
                 {{ t((String(item.key) || "").toLowerCase() + ".summary", item.summary || "") }}

              </p>
            </div>
          </div>
        </div>
      </div>

      <div class="text-center q-mt-xl">
        <img
          class="icon"
          src="images/settings.png"
          @click="handleImageClick('/reset')"
        />
      </div>
    </div>
  </q-page>
</template>

<style scoped>
.menu-container {
  max-width: 1100px;
  margin: 0 auto;
  padding: 0 1rem;
}

.menu-container p {
  overflow-wrap: anywhere;
}

.menu-grid {
  display: grid;
  gap: 16px;
  grid-template-columns: 1fr; /* phones: 1 across */
  max-width: 1200px; /* optional cap so cards don’t sprawl */
  margin: 0 auto;
}

/* tablets */
@media (min-width: 600px) {
  .menu-grid {
    grid-template-columns: repeat(2, 1fr); /* 2 across */
  }
}

/* desktops and larger laptops */
@media (min-width: 1024px) {
  .menu-grid {
    grid-template-columns: repeat(3, 1fr); /* 3 across */
  }
}

/* no sizing on items - let the grid handle it */
.menu-col {
  box-sizing: border-box;
}

.menu-card {
  background-color: #dddddd;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  padding: 10px;
  text-align: center;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  height: 100%;
  cursor: pointer;
}
p.menu-explanation {
  text-align: left;
}

.menu-card:hover {
  transform: scale(1.03);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.menu-picture {
  display: block;
  width: 85%;
  margin: 12px auto 2px auto;
  height: auto;
  object-fit: cover;
}

.menu-label h6 {
  margin: 0 0 4px 0; /* top, right, bottom, left */
  font-size: 1.5rem; /* Optional: adjust text size */
  text-align: center;
}

.menu-label p {
  margin: 0;
}

img.icon {
  height: 30px;
  cursor: pointer;
}
</style>
