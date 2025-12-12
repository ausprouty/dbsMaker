//src/i18n/i18nDirection

// Minimal, dependency-free RTL/LTR helpers
// Your source of truth is languageObject.textDirection.
// This helper just normalises that value to "rtl" or "ltr".

export function detectDirection(lang) {
  if (!lang || typeof lang !== "object") {
    return "ltr";
  }

  const raw = String(lang.textDirection || "")
    .toLowerCase()
    .trim();

  if (raw === "rtl") {
    return "rtl";
  }

  // Anything else (including blank) is treated as LTR.
  return "ltr";
}

// Apply direction to the document safely.
// Sets <html dir="..."> and toggles a .rtl class on <body> for your CSS.
export function applyDirection(dir) {
  const d = dir === "rtl" ? "rtl" : "ltr";
  try {
    const html = document?.documentElement;
    if (html && html.getAttribute("dir") !== d) html.setAttribute("dir", d);

    const body = document?.body;
    if (body) {
      if (d === "rtl") body.classList.add("rtl");
      else body.classList.remove("rtl");
    }
  } catch {
    // no-op (e.g., SSR)
  }
}
