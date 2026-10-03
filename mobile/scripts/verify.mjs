#!/usr/bin/env node
/**
 * Architectural checks for the mobile app that a type-checker cannot make.
 * Plain Node, no dependencies — runs before `npm install` has finished.
 *
 *   node scripts/verify.mjs
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const MOBILE = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const REPO = resolve(MOBILE, '..');
let failures = 0;

const fail = (rule, detail) => {
  failures += 1;
  console.error(`\x1b[91mFAIL\x1b[0m  ${rule}`);
  for (const line of [].concat(detail)) console.error(`        ${line}`);
};
const pass = (rule) => console.log(`\x1b[92mPASS\x1b[0m  ${rule}`);

function files(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...files(full));
    else if (/\.(ts|tsx)$/.test(entry)) out.push(full);
  }
  return out;
}
const SRC = files(join(MOBILE, 'src')).map((path) => ({
  rel: relative(MOBILE, path).replace(/\\/g, '/'),
  text: readFileSync(path, 'utf8'),
}));

// 1 — one door to the network ------------------------------------------------
{
  const rule = 'Faqat src/lib/api.ts fetch() chaqiradi';
  const bad = SRC.filter((f) => f.rel !== 'src/lib/api.ts' && /(?<![.\w])fetch\s*\(/.test(f.text));
  if (bad.length) fail(rule, bad.map((f) => f.rel));
  else pass(rule);
}

// 2 — one place touches device storage --------------------------------------
{
  const rule = 'Faqat src/lib/storage.ts AsyncStorage/SecureStore ga tegadi';
  const bad = SRC.filter(
    (f) => f.rel !== 'src/lib/storage.ts' && /(async-storage|expo-secure-store)['"]/.test(f.text),
  );
  if (bad.length) fail(rule, bad.map((f) => f.rel));
  else pass(rule);
}

// 3 — the catalogue is the bot's catalogue, label for label ------------------
{
  const python = readFileSync(join(REPO, 'backend', 'app', 'catalog.py'), 'utf8');
  const catalog = readFileSync(join(MOBILE, 'src', 'lib', 'catalog.ts'), 'utf8');

  function pyTable(name) {
    const block = python.match(new RegExp(`${name}[^=]*=\\s*\\{([\\s\\S]*?)\\n\\}`));
    const out = {};
    for (const m of (block?.[1] ?? '').matchAll(/"([a-z_]+)":\s*\{([^}]*)\}/g)) {
      const fields = {};
      for (const f of m[2].matchAll(/"(uz|ru|emoji)":\s*"([^"]*)"/g)) fields[f[1]] = f[2];
      out[m[1]] = fields;
    }
    return out;
  }
  function tsTable(name) {
    const block = catalog.match(new RegExp(`export const ${name}[^=]*=\\s*\\{([\\s\\S]*?)\\n\\};`));
    const out = {};
    for (const m of (block?.[1] ?? '').matchAll(/^\s*([a-z_]+):\s*\{([^}]*)\}/gm)) {
      const fields = {};
      for (const f of m[2].matchAll(/(uz|ru|emoji):\s*(['"])(.*?)\2/g)) fields[f[1]] = f[3];
      out[m[1]] = fields;
    }
    return out;
  }

  for (const name of ['CATEGORIES', 'UNITS', 'REGIONS']) {
    const rule = `catalog.ts ${name} = backend/app/catalog.py (kalit, uz, ru, emoji)`;
    const py = pyTable(name);
    const ts = tsTable(name);
    const problems = [];
    for (const key of new Set([...Object.keys(py), ...Object.keys(ts)])) {
      if (!py[key]) problems.push(`faqat ilovada: ${key}`);
      else if (!ts[key]) problems.push(`ilovada yo‘q: ${key}`);
      else {
        for (const field of Object.keys(py[key])) {
          if (py[key][field] !== ts[key][field]) {
            problems.push(`${key}.${field}: ilova "${ts[key][field]}" ≠ bot "${py[key][field]}"`);
          }
        }
      }
    }
    if (Object.keys(py).length === 0) problems.push('catalog.py dan o‘qib bo‘lmadi');
    if (problems.length) fail(rule, problems.slice(0, 6));
    else pass(`${rule} (${Object.keys(py).length} ta)`);
  }
}

// 4 — no debug output in screens and components -----------------------------
{
  const rule = 'src/app va src/components da console.log yo‘q';
  const bad = SRC.filter(
    (f) => /^src\/(app|components)\//.test(f.rel) && /(?<![.\w])console\.log\s*\(/.test(f.text),
  );
  if (bad.length) fail(rule, bad.map((f) => f.rel));
  else pass(rule);
}

// 5 — every route file is a screen ------------------------------------------
{
  const rule = 'src/app dagi har bir fayl default export qiladi (Expo Router)';
  const bad = SRC.filter((f) => f.rel.startsWith('src/app/') && !/export default function/.test(f.text));
  if (bad.length) fail(rule, bad.map((f) => f.rel));
  else pass(rule);
}

// 6 — user-facing text comes from i18n.ts, in both languages -----------------
{
  const rule = 'Ekranlarda qattiq yozilgan o‘zbekcha matn yo‘q (i18n.ts dan)';
  const uzbek = /[‘’]|\b\w+o['‘’]\w+|g['‘’]\w/;
  const bad = [];
  for (const f of SRC.filter((x) => /^src\/(app|components)\//.test(x.rel))) {
    f.text.split('\n').forEach((line, i) => {
      if (/^\s*(\/\/|\*|\/\*)/.test(line)) return;
      for (const m of line.matchAll(/>([^<>{}\n]{4,})</g)) {
        const text = m[1].trim();
        if (uzbek.test(text)) bad.push(`${f.rel}:${i + 1} ${text.slice(0, 40)}`);
      }
    });
  }
  if (bad.length) fail(rule, bad.slice(0, 6));
  else pass(rule);
}

console.log('');
if (failures) {
  console.error(`\x1b[91m${failures} ta tekshiruv muvaffaqiyatsiz.\x1b[0m`);
  process.exit(1);
}
console.log(`\x1b[92mHammasi joyida — ${SRC.length} ta fayl tekshirildi.\x1b[0m`);
