// main.js (or main.ts)
import { createApp } from "vue";
import App from "./App.vue";
import router from "./router";

const app = createApp(App); // ← keep the returned instance
app.use(router);

// Enable Vue Devtools (works in dev by default; see note for prod)
app.config.devtools = true;

app.mount("#app");
