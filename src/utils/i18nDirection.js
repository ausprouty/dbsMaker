// Minimal, dependency-free RTL/LTR helpers

// Return "rtl" or "ltr" based on your language object.
// Priority:
// 1) explicit lang.direction ('rtl' | 'ltr')
// 2) ISO code heuristic (common RTL languages)
// 3) default 'ltr'
export function detectDirection(lang) {
  const explicit = String(lang?.direction || '').toLowerCase();
  if (explicit === 'rtl' || explicit === 'ltr') return explicit;

  // Try ISO(639) code (adjust property name if yours differs)
  const iso = String(lang?.languageCodeIso || lang?.iso || lang?.hl || '').toLowerCase();
  const RTL = new Set(['ar','fa','he','ur','ps','sd','ug','yi','ku','ckb','dv','ks']);
  return RTL.has(iso) ? 'rtl' : 'ltr';
}

// Apply direction to the document safely.
// Sets <html dir="..."> and toggles a .rtl class on <body> for your CSS.
export function applyDirection(dir) {
  const d = dir === 'rtl' ? 'rtl' : 'ltr';
  try {
    const html = document?.documentElement;
    if (html && html.getAttribute('dir') !== d) html.setAttribute('dir', d);

    const body = document?.body;
    if (body) {
      if (d === 'rtl') body.classList.add('rtl');
      else body.classList.remove('rtl');
    }
  } catch {
    // no-op (e.g., SSR)
  }
}
