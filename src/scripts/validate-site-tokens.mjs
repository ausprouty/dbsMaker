#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const sitesDir = path.join(root, 'src', 'sites');

const CONTRACT = [
  'primary','secondary','accent',
  'minor1','minor2','neutral',
  'dark','dark-page',
  'positive','negative','info','warning',
  'highlight-scripture','shadow','success-highlight'
];

const allowed = new Set(CONTRACT.map(n => `$${n}`));

const dirs = fs.readdirSync(sitesDir)
  .filter(d => fs.statSync(path.join(sitesDir, d)).isDirectory());

let ok = true;

for (const d of dirs) {
  const file = path.join(sitesDir, d, 'quasar.variables.scss');
  if (!fs.existsSync(file)) {
    console.error(`[${d}] Missing file: quasar.variables.scss`);
    ok = false;
    continue;
  }
  const src = fs.readFileSync(file, 'utf8');

  // Collect declared SCSS variables in this file
  const vars = Array.from(src.matchAll(/^\s*(\$\w[\w-]*):/gm)).map(m => m[1]);

  // Check missing vs extra
  const missing = CONTRACT.filter(n => !vars.includes(`$${n}`));
  const extra = vars.filter(v => !allowed.has(v));

  if (missing.length) {
    console.error(`[${d}] Missing: ${missing.join(', ')}`);
    ok = false;
  }
  if (extra.length) {
    console.error(`[${d}] Extra: ${extra.map(v => v.slice(1)).join(', ')}`);
    ok = false;
  }
}

if (!ok) {
  console.error('\nToken validation failed. Fix the issues above.');
  process.exit(1);
} else {
  console.log('✔ Site token files pass validation.');
}
