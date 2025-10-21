// utils/allowedStudies.js
import { normId } from './normalize';

let _cache = null;

function withBase(p) {
  const base = import.meta.env.BASE_URL || '/';
  return (base.endsWith('/') ? base : base + '/') + p.replace(/^\//, '');
}

export async function getAllowedStudyKeys() {
  if (_cache) return _cache;

  try {
    const url = withBase('config/menu.json');
    const res = await fetch(url, { cache: 'no-store' });
    const json = await res.json();

    const items = Array.isArray(json) ? json : (json.menu || json.items || []);
    const set = new Set();

    for (let i = 0; i < items.length; i++) {
      const it = items[i] || {};
      const k = it.key ?? it.id ?? it.slug ?? it.code;
      if (k != null && String(k).trim() !== '') set.add(normId(k));
    }

    _cache = set;
    return set;
  } catch (e) {
    console.error('Failed to load config/menu.json', e);
    _cache = new Set();
    return _cache;
  }
}
