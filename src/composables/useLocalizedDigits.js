// src/composables/useLocalizedDigits.js
import { computed } from "vue";
import { useSettingsStore } from "src/stores/SettingsStore";

const ARABIC_FULL_STOP = "\u06D4"; // Arabic full stop (looks like ".")

/**
 * Map of Unicode decimal digit sets by numeral system code.
 * Keys should match hl_languages.numeralSet / numeral_systems.code.
 */
const digitMaps = {
  // Latin (ASCII)
  latn: ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"],

  // Arabic-Indic (U+0660–U+0669)
  arab: ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"],

  // Extended Arabic-Indic / Persian (U+06F0–U+06F9)
  arabext: ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"],

  // Devanagari (Hindi, Marathi, etc.) (U+0966–U+096F)
  deva: ["०", "१", "२", "३", "४", "५", "६", "७", "८", "९"],

  // Bengali (U+09E6–U+09EF)
  beng: ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"],

  // Gurmukhi (Punjabi) (U+0A66–U+0A6F)
  guru: ["੦", "੧", "੨", "੩", "੪", "੫", "੬", "੭", "੮", "੯"],

  // Gujarati (U+0AE6–U+0AEF)
  gujr: ["૦", "૧", "૨", "૩", "૪", "૫", "૬", "૭", "૮", "૯"],

  // Oriya / Odia (U+0B66–U+0B6F)
  orya: ["୦", "୧", "୨", "୩", "୪", "୫", "୬", "୭", "୮", "୯"],

  // Tamil decimal (U+0BE6–U+0BEF)
  tamldec: ["௦", "௧", "௨", "௩", "௪", "௫", "௬", "௭", "௮", "௯"],

  // Telugu (U+0C66–U+0C6F)
  telu: ["౦", "౧", "౨", "౩", "౪", "౫", "౬", "౭", "౮", "౯"],

  // Kannada (U+0CE6–U+0CEF)
  knda: ["೦", "೧", "೨", "೩", "೪", "೫", "೬", "೭", "೮", "೯"],

  // Malayalam (U+0D66–U+0D6F)
  mlym: ["൦", "൧", "൨", "൩", "൪", "൫", "൬", "൭", "൮", "൯"],

  // Thai (U+0E50–U+0E59)
  thai: ["๐", "๑", "๒", "๓", "๔", "๕", "๖", "๗", "๘", "๙"],

  // Lao (U+0ED0–U+0ED9)
  laoo: ["໐", "໑", "໒", "໓", "໔", "໕", "໖", "໗", "໘", "໙"],

  // Tibetan (U+0F20–U+0F29)
  tibt: ["༠", "༡", "༢", "༣", "༤", "༥", "༦", "༧", "༨", "༩"],

  // Myanmar (U+1040–U+1049)
  mymr: ["၀", "၁", "၂", "၃", "၄", "၅", "၆", "၇", "၈", "၉"],

  // Khmer (U+17E0–U+17E9)
  khmr: ["០", "១", "២", "៣", "៤", "៥", "៦", "៧", "៨", "៩"],
};

/**
 * For Arabic-family numeral systems in RTL languages, normalise dots
 * so that "digits + '.'" and sentence-ending '.' behave nicely in bidi.
 *
 * Example (after digit localisation):
 *   "۱۰. متن ..." -> "۱۰۔ متن ..."
 *   "...است."     -> "...است۔"
 */
function applyRtlDotFix(str, numeralCode, lang) {
  if (numeralCode !== "arab" && numeralCode !== "arabext") {
    return str;
  }

  const dir = String(lang && lang.textDirection ? lang.textDirection : "")
    .toLowerCase()
    .trim();

  if (dir !== "rtl") {
    return str;
  }

  let out = str;

  // 1) Fix leading "digits + '.'"
  out = out.replace(
    /^(\s*[\u0660-\u0669\u06F0-\u06F9]+)\./,
    "$1" + ARABIC_FULL_STOP
  );

  // 2) Fix sentence-ending '.' after RTL letters/digits
  out = out.replace(
    /([\u0600-\u06FF\u0660-\u0669\u06F0-\u06F9])\.(?=\s|$)/g,
    "$1" + ARABIC_FULL_STOP
  );

  return out;
}

/**
 * Composable for converting Latin digits 0–9 into the
 * correct numeral set for the current language.
 *
 * Depends on SettingsStore.languageObjectSelected.numeralSet.
 */
export function useLocalizedDigits() {
  const settingsStore = useSettingsStore();

  const numeralSet = computed(() => {
    const lang = settingsStore.languageObjectSelected;
    if (lang && lang.numeralSet) {
      return lang.numeralSet;
    }
    return "latn";
  });

  const activeDigitMap = computed(() => {
    const code = numeralSet.value;
    if (digitMaps[code]) {
      return digitMaps[code];
    }
    return digitMaps.latn;
  });

  /**
   * Convert all ASCII digits (0–9) in `value` to the
   * currently active numeral set, or to `overrideSetCode`
   * if you want to force a particular system.
   */
  function toLocalizedDigits(value, overrideSetCode) {
    const str = String(value);

    const code = overrideSetCode || numeralSet.value;

    // Fast path: do nothing for plain Latin numerals
    if (code === "latn") {
      return str;
    }

    const map = digitMaps[code] || digitMaps.latn;

    let out = "";
    for (let i = 0; i < str.length; i += 1) {
      const ch = str[i];

      if (ch >= "0" && ch <= "9") {
        const index = ch.charCodeAt(0) - 48; // "0" -> 0
        out += map[index];
      } else {
        out += ch;
      }
    }

    // Bidi-friendly dot normalisation for Arabic/Farsi etc.
    const lang = settingsStore.languageObjectSelected || null;
    out = applyRtlDotFix(out, code, lang);

    return out;
  }

  /**
   * Convenience for arrays of labels, e.g. [ "1", "2", "3" ]
   * or [ "Lesson 1", "Lesson 2" ].
   */
  function localizeArray(list, overrideSetCode) {
    if (!Array.isArray(list)) {
      return list;
    }
    return list.map((item) => toLocalizedDigits(item, overrideSetCode));
  }

  return {
    numeralSet, // e.g. "latn", "arabext"
    activeDigitMap, // array of digits for that set
    toLocalizedDigits,
    localizeArray,
  };
}
