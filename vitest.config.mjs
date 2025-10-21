// vitest.config.mjs
import { defineConfig } from "vitest/config";
import vue from "@vitejs/plugin-vue";
import path from "path";

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      src: path.resolve(__dirname, "./src"),
      stores: path.resolve(__dirname, "./src/stores"),
      boot: path.resolve(__dirname, "./src/boot"),
      components: path.resolve(__dirname, "./src/components"),
      services: path.resolve(__dirname, "./src/services"),
      utils: path.resolve(__dirname, "./src/utils"),
    },
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: "./vitest.setup.js", // Optional
  },
  define: {
    "process.env.CURRENT_API": JSON.stringify(
      "http://localhost/api_mylanguage/"
    ),
    "process.env.LEGACY_API": JSON.stringify(
      "http://localhost/mylanguage-namespaced/"
    ),
  },
});
