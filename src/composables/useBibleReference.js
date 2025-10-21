// src/composables/useBibleReference.js
export function useBibleReference() {
  function cleanReference(fullReference) {
    const text = String(fullReference || '');

    // first non-empty trimmed line
    var first = '';
    var lines = text.split(/\r?\n|\r/).map(function (l) { return l.trim(); });
    for (var i = 0; i < lines.length; i++) {
      if (lines[i].length > 0) { first = lines[i]; break; }
    }
    if (!first) return '';

    // strip trailing version names: "— NIV", "- ESV", "(NIV)", "[The Message]"
    first = first.replace(/\s*[–—-]\s*[A-Za-z][A-Za-z0-9 .,'’()-]{1,60}\s*$/u, '');
    first = first.replace(/\s*[\(\[]\s*[A-Za-z][A-Za-z0-9 .,'’()-]{1,60}\s*[\)\]]\s*$/u, '');

    return first.trim();
  }

  return { cleanReference };
}
