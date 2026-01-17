// utils/languageLabel.js
// receives a language object
// returns a properly formatted label
// style:
//   - "ethnic-first":  "हिन्दी (Hindi)"
//   - "name-first":    "Hindi (हिन्दी)"
export function languageLabel(lang, style = "ethnic-first") {
  if (!lang) return "";

  const name = String(lang.name || "").trim();
  const ethnic = String(lang.ethnicName || "").trim();

  if (!name) return ethnic;
  if (!ethnic) return name;

  if (name.localeCompare(ethnic, undefined, { sensitivity: "accent" }) === 0) {
    return name;
  }

  if (style === "name-first") return `${name} (${ethnic})`;
  return `${ethnic} (${name})`;
}
