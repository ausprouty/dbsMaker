// receives a language object
// returns a properly formatted selection
// with ethnic name if different from English name
//

export function languageLabel(lang) {
  if (!lang) return "";

  const name = String(lang.name || "").trim();
  const ethnic = String(lang.ethnicName || "").trim();

  if (!name) return ethnic;

  if (!ethnic) return name;

  const nameLower = name.toLocaleLowerCase();
  const ethnicLower = ethnic.toLocaleLowerCase();

  return nameLower === ethnicLower ? name : name + " (" + ethnic + ")";
}
