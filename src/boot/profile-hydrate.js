// src/boot/profile-hydrate.ts
import { boot } from "quasar/wrappers";
import { useSettingsStore } from "src/stores/SettingsStore";

export default boot(async () => {
  const store = useSettingsStore();

  try {
    // 1) Gather candidates (highest priority first)
    const envProfile = String(import.meta.env.VITE_API_PROFILE || "").trim();

    // Allow either injected env or legacy top-level keys
    const injectedProfile = (() => {
      try {
        const meta =
          typeof globalThis !== "undefined" &&
          typeof globalThis.__SITE_META__ !== "undefined"
            ? globalThis.__SITE_META__
            : {};
        const fromEnv = meta?.env?.VITE_API_PROFILE;
        const legacy = meta?.apiProfile ?? meta?.apiVariant;
        return String(fromEnv ?? legacy ?? "").trim();
      } catch {
        return "";
      }
    })();

    // 2) Choose the winner (env > injected > current > default)
    const current = (store.apiProfile || "").toString().trim();
    const chosen = (
      envProfile ||
      injectedProfile ||
      current ||
      "standard"
    ).trim();

    // 3) No-op if unchanged
    if (current && current === chosen) {
      console.log("[profile-hydrate] apiProfile already set →", current);
      return;
    }

    // 4) Write to store (await if your action is async)
    if (typeof store.setApiProfile === "function") {
      await store.setApiProfile(chosen);
    } else {
      store.apiProfile = chosen;
    }

    console.log(
      "[profile-hydrate] env:",
      envProfile || "(none)",
      "| injected:",
      injectedProfile || "(none)",
      "| chosen:",
      chosen
    );
  } finally {
    // 5) Mark hydrated (for router guards)
    if (typeof store.markHydrated === "function") {
      store.markHydrated("profile");
    } else {
      store.hydration = { ...(store.hydration || {}), profile: true };
    }
  }
});
