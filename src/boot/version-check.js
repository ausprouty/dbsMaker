// src/boot/version-check.js
import { boot } from "quasar/wrappers";
import { DEFAULTS } from "src/constants/Defaults";
import { clearOrUpdateData } from "src/utils/versionUtilities";

const META_KEY = "app:meta";
const SKIP_RESUME = "route:skipResume";

// Optional: skip in dev unless you want to test migrations
const SKIP_IN_DEV = false;

// Very small semver comparator: returns -1 / 0 / 1
function semverCmp(a = "", b = "") {
  const pa = String(a)
    .split(".")
    .map((n) => parseInt(n, 10) || 0);
  const pb = String(b)
    .split(".")
    .map((n) => parseInt(n, 10) || 0);
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i++) {
    const da = pa[i] || 0;
    const db = pb[i] || 0;
    if (da < db) return -1;
    if (da > db) return 1;
  }
  return 0;
}

function readMeta() {
  try {
    const raw = localStorage.getItem(META_KEY);
    if (!raw) return null;
    const m = JSON.parse(raw);
    if (!m || typeof m.ver !== "string") return null;
    return m;
  } catch {
    return null;
  }
}

function writeMeta(meta) {
  try {
    localStorage.setItem(META_KEY, JSON.stringify(meta));
  } catch {}
}

export default boot(async () => {
  if (import.meta.env.DEV && SKIP_IN_DEV) return;

  // avoid multiple runs during one page session (HMR, duplicate boots, etc.)
  try {
    if (sessionStorage.getItem("app:versionChecked") === "1") return;
    sessionStorage.setItem("app:versionChecked", "1");
  } catch {}

  const current = {
    ver: String(
      DEFAULTS?.appVersion || import.meta.env.VITE_APP_VERSION || "dev"
    ).trim(),
    site: String(
      import.meta.env.VITE_APP || DEFAULTS?.site || "default"
    ).trim(),
    ts: Number(import.meta.env.VITE_BUILD_TS || Date.now()),
  };

  const prev = readMeta();

  // First run or metadata missing: record and continue
  if (!prev) {
    writeMeta(current);
    return;
  }

  const versionChanged = prev.ver !== current.ver;
  const siteChanged = prev.site !== current.site;
  if (!versionChanged && !siteChanged) return;

  const downgraded = semverCmp(current.ver, prev.ver) < 0;
  const context = { prev, current, downgraded, siteChanged };

  try {
    // Your util may accept context; if not, it can ignore the arg safely.
    await clearOrUpdateData?.(context);

    // Prevent route-resume on the next load after a clear/migration
    try {
      sessionStorage.setItem(SKIP_RESUME, "1");
    } catch {}
  } catch (err) {
    console.warn(
      "[version-check] clearOrUpdateData failed; falling back:",
      err
    );
    // Fallback: minimally ensure we don't resume into bad state
    try {
      // Prefer your util to do targeted clears; this is last-resort.
      // localStorage.clear();  // Uncomment only if you want a full nuke here.
      sessionStorage.setItem(SKIP_RESUME, "1");
    } catch {}
  } finally {
    // Write new meta regardless so we don't loop on every boot
    writeMeta(current);
  }
});
