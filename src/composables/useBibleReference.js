// src/composables/useBibleReference.js
export function useBibleReference() {
  function cleanReference(fullReference) {
    const text = String(fullReference || "");

    // first non-empty trimmed line
    var first = "";
    var lines = text.split(/\r?\n|\r/).map(function (l) {
      return l.trim();
    });
    for (var i = 0; i < lines.length; i++) {
      if (lines[i].length > 0) {
        first = lines[i];
        break;
      }
    }
    if (!first) return "";

    // strip trailing version names: "— NIV", "- ESV", "(NIV)", "[The Message]"
    // Guard rails:
    // - Only strip if the suffix looks like a version label (letters, no digits/colon)
    // - Avoid accidentally stripping ranges like "1 John 5:1-7"
    var dashSuffix = first.match(
      /\s*[–—-]\s*([A-Za-z][A-Za-z0-9 .,'’()\[\]-]{1,60})\s*$/
    );
    if (dashSuffix && dashSuffix[1] && !/[0-9:]/.test(dashSuffix[1])) {
      first = first.slice(0, first.length - dashSuffix[0].length);
    }

    var bracketSuffix = first.match(
      /\s*[\(\[]\s*([A-Za-z][A-Za-z0-9 .,'’()-]{1,60})\s*[\)\]]\s*$/
    );
    if (bracketSuffix && bracketSuffix[1] && !/[0-9:]/.test(bracketSuffix[1])) {
      first = first.slice(0, first.length - bracketSuffix[0].length);
    }
    return first.trim();
  }

  return { cleanReference };
}
