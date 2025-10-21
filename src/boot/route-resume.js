// boot/route-resume.js
import { boot } from "quasar/wrappers";
import { useSettingsStore } from "src/stores/SettingsStore";

const KEY = "route:lastGood";
const SKIP = "route:skipResume";
const APP_VER = String(import.meta.env.VITE_APP_VERSION || "dev").trim();
const APP_SITE = String(import.meta.env.VITE_APP || "default").trim();
const STALE_MS = 14 * 24 * 60 * 60 * 1000; // 14 days

function saveLastGood(path) {
  const rec = { path, ver: APP_VER, site: APP_SITE, ts: Date.now() };
  try { localStorage.setItem(KEY, JSON.stringify(rec)); } catch {}
}

function readLastGood() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const rec = JSON.parse(raw);
    if (!rec || typeof rec.path !== "string") return null;

    // version/site must match; avoid resurrecting old layouts
    if (rec.ver !== APP_VER || rec.site !== APP_SITE) return null;

    // ignore stale entries
    if (typeof rec.ts === "number" && Date.now() - rec.ts > STALE_MS) return null;

    // basic sanity
    if (rec.path === "/" || rec.path === "/index") return null;
    return rec;
  } catch {
    return null;
  }
}

export default boot(({ router }) => {
  const settings = useSettingsStore();

  // Save the successful destination after each navigation
  router.afterEach((to, from, failure) => {
    if (failure) return;                       // navigation aborted/failed
    if (to.meta?.resume === false) return;     // explicit opt-out
    if (to.path === "/" || to.path === "/index") return;

    const p = to.fullPath;
    settings.currentPath = p;
    saveLastGood(p);
  });

  // On first load, if user landed on '/', try to resume
  router.isReady().then(() => {
    const here = router.currentRoute.value;
    if (here.path !== "/") return;

    // If a hard reset just happened, do not resume (one-shot flag)
    try {
      if (sessionStorage.getItem(SKIP) === "1") {
        sessionStorage.removeItem(SKIP);
        return;
      }
    } catch {}

    // Prefer in-memory store; fall back to persisted record
    const fromStore = settings.currentPath;
    const fromRec = readLastGood();
    const candidate =
      (fromStore && fromStore !== "/" && fromStore !== "/index" && fromStore) ||
      (fromRec && fromRec.path);

    if (!candidate) return;

    const resolved = router.resolve(candidate);
    if (resolved.matched && resolved.matched.length > 0) {
      router.replace(candidate).catch(() => {});
    } else {
      // Bad/old path; clear it
      settings.currentPath = "/";
      try { localStorage.removeItem(KEY); } catch {}
      console.warn("[route-resume] Ignoring invalid stored path:", candidate);
    }
  });
});
