// src/utils/debug.js
import { unref, toRaw } from "vue";

const isDev =
  typeof import.meta !== "undefined" &&
  import.meta.env &&
  import.meta.env.DEV;

export function dump(label, value) {
  if (!isDev) return; // no-op in prod builds

  const unwrapped = unref(value);
  const raw = toRaw(unwrapped) || unwrapped;

  try {
    const snap =
      typeof structuredClone === "function"
        ? structuredClone(raw)
        : JSON.parse(JSON.stringify(raw));
    console.log(label, snap);
  } catch (e) {
    // fallback if something isn’t cloneable
    console.log(label, raw);
  }
}

// optional: quick conditional dump
export function dumpIf(cond, label, value) {
  if (cond) dump(label, value);
}

// optional: expose in console during dev for ad-hoc use
export function installGlobalDump() {
  if (isDev && typeof window !== "undefined") {
    window.dump = dump;
  }
}
