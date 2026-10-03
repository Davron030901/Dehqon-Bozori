#!/usr/bin/env node
/**
 * Architectural checks that a type-checker cannot make.
 *
 *   node scripts/verify.mjs
 *
 * Every rule here encodes a decision that is easy to break by accident and
 * expensive to discover later. Needs no dependencies and no build — plain Node,
 * so it runs before `npm install` has finished and inside CI without a cache.
 *
 * Exits 1 on the first failing rule so CI stops at the real cause.
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const FRONTEND = resolve(HERE, '..');
const REPO = resolve(FRONTEND, '..');
const CATALOG = join(REPO, 'backend', 'app', 'catalog.py');

const SKIP_DIRS = new Set(['node_modules', '.next', '.git', 'scripts', 'tests']);

let failures = 0;

function fail(rule, detail) {
  failures += 1;
  console.error(`\x1b[91mFAIL\x1b[0m  ${rule}`);
  for (const line of [].concat(detail)) console.error(`        ${line}`);
}

function pass(rule) {
  console.log(`\x1b[92mPASS\x1b[0m  ${rule}`);
}

/** Every .ts/.tsx file under the frontend, excluding build output and tests. */
function sourceFiles(dir = FRONTEND) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry)) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      out.push(...sourceFiles(full));
    } else if (/\.(ts|tsx)$/.test(entry) && !entry.endsWith('.d.ts')) {
      out.push(full);
    }
  }
  return out;
}

const FILES = sourceFiles().map((path) => ({
  path,
  rel: relative(FRONTEND, path).replace(/\\/g, '/'),
  text: readFileSync(path, 'utf8'),
}));

// --------------------------------------------------------------------------- //
//  Rule 1 — one data layer
// --------------------------------------------------------------------------- //
// The whole point of lib/api.ts is that the data source is swappable. The
// moment a component reaches past it, that stops being true silently.
{
  const rule = 'Faqat lib/api.ts mockData ni import qiladi';
  const offenders = FILES.filter(
    (file) => file.rel !== 'lib/api.ts' && /from\s+['"].*mockData['"]/.test(file.text),
  );
  if (offenders.length) fail(rule, offenders.map((f) => f.rel));
  else pass(rule);
}

{
  const rule = 'Faqat lib/api.ts fetch() chaqiradi';
  const offenders = FILES.filter(
    (file) => file.rel !== 'lib/api.ts' && /(?<![.\w])fetch\s*\(/.test(file.text),
  );
  if (offenders.length) fail(rule, offenders.map((f) => f.rel));
  else pass(rule);
}

// --------------------------------------------------------------------------- //
//  Rule 2 — one place that touches the browser store
// --------------------------------------------------------------------------- //
{
  const rule = 'Faqat lib/session.ts localStorage ga tegadi';
  const offenders = FILES.filter(
    (file) => file.rel !== 'lib/session.ts' && /localStorage/.test(file.text),
  );
  if (offenders.length) fail(rule, offenders.map((f) => f.rel));
  else pass(rule);
}

// --------------------------------------------------------------------------- //
//  Rule 3 — slugs must match the backend catalogue
// --------------------------------------------------------------------------- //
// A region or category the backend has never heard of produces an empty result
// grid with no error anywhere — the worst kind of bug to chase.
function pythonDictKeys(source, dictName) {
  const match = source.match(new RegExp(`${dictName}[^=]*=\\s*\\{([\\s\\S]*?)\\n\\}`));
  if (!match) return null;
  return new Set([...match[1].matchAll(/^\s*"([a-z_]+)"\s*:/gm)].map((m) => m[1]));
}

let catalogSource = null;
try {
  catalogSource = readFileSync(CATALOG, 'utf8');
} catch {
  console.log(
    '\x1b[93mSKIP\x1b[0m  backend/app/catalog.py topilmadi — slug tekshiruvi o‘tkazib yuborildi',
  );
}

if (catalogSource) {
  const backendRegions = pythonDictKeys(catalogSource, 'REGIONS');
  const backendCategories = pythonDictKeys(catalogSource, 'CATEGORIES');

  {
    const rule = 'strings.ts dagi hudud slug‘lari backend REGIONS ichida bor';
    const stringsText = readFileSync(join(FRONTEND, 'lib', 'strings.ts'), 'utf8');
    const block = stringsText.match(/export const regions[\s\S]*?\n\];/);
    const used = block
      ? [...block[0].matchAll(/key:\s*'([a-z_]+)'/g)].map((m) => m[1])
      : [];

    if (!backendRegions) {
      fail(rule, 'catalog.py dan REGIONS o‘qib bo‘lmadi');
    } else if (used.length === 0) {
      fail(rule, 'strings.ts dan regions ro‘yxati topilmadi');
    } else {
      const unknown = used.filter((key) => !backendRegions.has(key));
      if (unknown.length) fail(rule, `backend bilmaydi: ${unknown.join(', ')}`);
      else pass(`${rule} (${used.length} ta)`);
    }
  }

  // The site uses the backend's own category and unit slugs — the same eleven
  // categories and seven units as the bot. Both directions matter: a slug the
  // backend does not know is a 422 at the end of a form, and a backend slug the
  // site does not know is a listing with no label.
  const stringsText = readFileSync(join(FRONTEND, 'lib', 'strings.ts'), 'utf8');
  const typesText = readFileSync(join(FRONTEND, 'lib', 'types.ts'), 'utf8');

  function sameSet(rule, label, frontend, backend) {
    if (!backend) return fail(rule, `catalog.py dan ${label} o‘qib bo‘lmadi`);
    if (frontend.size === 0) return fail(rule, `frontend'dan ${label} topilmadi`);
    const onlyFront = [...frontend].filter((k) => !backend.has(k));
    const onlyBack = [...backend].filter((k) => !frontend.has(k));
    if (onlyFront.length || onlyBack.length) {
      return fail(rule, [
        onlyFront.length ? `backend bilmaydi: ${onlyFront.join(', ')}` : '',
        onlyBack.length ? `saytda yo‘q: ${onlyBack.join(', ')}` : '',
      ].filter(Boolean));
    }
    pass(`${rule} (${frontend.size} ta)`);
  }

  const labelBlock = stringsText.match(/export const categoryLabels[\s\S]*?\n\};/);
  const labelKeys = new Set(
    labelBlock ? [...labelBlock[0].matchAll(/^\s*([a-z_]+):\s*\{/gm)].map((m) => m[1]) : [],
  );
  sameSet(
    'strings.ts categoryLabels = backend CATEGORIES',
    'CATEGORIES',
    labelKeys,
    backendCategories,
  );

  const unionBlock = typesText.match(/export type CategoryKey[\s\S]*?;/);
  const unionKeys = new Set(
    unionBlock ? [...unionBlock[0].matchAll(/'([a-z_]+)'/g)].map((m) => m[1]) : [],
  );
  sameSet('types.ts CategoryKey = backend CATEGORIES', 'CategoryKey', unionKeys, backendCategories);

  const backendUnits = pythonDictKeys(catalogSource, 'UNITS');
  const unitBlock = stringsText.match(/export const unitLabels[\s\S]*?\n\};/);
  const unitKeys = new Set(
    unitBlock ? [...unitBlock[0].matchAll(/^\s*([a-z_]+):\s*'/gm)].map((m) => m[1]) : [],
  );
  sameSet('strings.ts unitLabels = backend UNITS', 'UNITS', unitKeys, backendUnits);
}

// --------------------------------------------------------------------------- //
//  Rule 3b — the same listing must look the same in both places
// --------------------------------------------------------------------------- //
// A seller posts tomatoes in the bot, sees 🥕, opens the site and sees 🥬. To
// them that is a different listing.
if (catalogSource) {
  const rule = 'Kategoriya emojilari bot va sayt o‘rtasida bir xil';

  // slug -> emoji, straight out of the Python catalogue.
  const backendEmoji = {};
  for (const m of catalogSource.matchAll(
    /"([a-z_]+)":\s*\{[^}]*"emoji":\s*"([^"]+)"/g,
  )) {
    backendEmoji[m[1]] = m[2];
  }

  const stringsText = readFileSync(join(FRONTEND, 'lib', 'strings.ts'), 'utf8');
  const labelBlock = stringsText.match(/export const categoryLabels[\s\S]*?\n\};/);
  const frontEmoji = {};
  if (labelBlock) {
    for (const m of labelBlock[0].matchAll(
      /^\s*([a-z_]+):\s*\{[^}]*emoji:\s*'([^']+)'/gm,
    )) {
      frontEmoji[m[1]] = m[2];
    }
  }

  const mismatches = Object.entries(frontEmoji)
    .filter(([key, emoji]) => backendEmoji[key] && backendEmoji[key] !== emoji)
    .map(([key, emoji]) => `${key}: sayt ${emoji} ≠ bot ${backendEmoji[key]}`);

  if (Object.keys(frontEmoji).length === 0) {
    fail(rule, 'strings.ts dan categoryLabels o‘qib bo‘lmadi');
  } else if (mismatches.length) {
    fail(rule, mismatches);
  } else {
    pass(`${rule} (${Object.keys(frontEmoji).length} ta)`);
  }
}

// --------------------------------------------------------------------------- //
//  Rule 3c — the generated district file matches its Python source
// --------------------------------------------------------------------------- //
// `npm run verify` regenerates lib/districts.ts before running this, so a
// mismatch here means the generator itself disagrees with what is committed.
{
  const rule = 'lib/districts.ts backend/app/districts.py bilan mos';
  let pyText = null;
  try {
    pyText = readFileSync(join(REPO, 'backend', 'app', 'districts.py'), 'utf8');
  } catch {
    /* handled below */
  }

  if (!pyText) {
    console.log('\x1b[93mSKIP\x1b[0m  districts.py topilmadi');
  } else {
    const pyKeys = new Set(
      [...pyText.matchAll(/\{"key":\s*"([a-z_]+)"/g)].map((m) => m[1]),
    );
    let tsText = null;
    try {
      tsText = readFileSync(join(FRONTEND, 'lib', 'districts.ts'), 'utf8');
    } catch {
      /* handled below */
    }

    if (!tsText) {
      fail(rule, 'lib/districts.ts yo‘q — `npm run gen:districts` ishlating');
    } else {
      const tsKeys = new Set(
        [...tsText.matchAll(/\{\s*key:\s*'([a-z_]+)'/g)].map((m) => m[1]),
      );
      const onlyPy = [...pyKeys].filter((k) => !tsKeys.has(k));
      const onlyTs = [...tsKeys].filter((k) => !pyKeys.has(k));
      if (onlyPy.length || onlyTs.length) {
        fail(rule, [
          onlyPy.length ? `faqat Python'da: ${onlyPy.slice(0, 5).join(', ')}` : '',
          onlyTs.length ? `faqat TS'da: ${onlyTs.slice(0, 5).join(', ')}` : '',
          '`npm run gen:districts` ishlating',
        ].filter(Boolean));
      } else if (pyKeys.size < 150) {
        fail(rule, `atigi ${pyKeys.size} ta tuman o‘qildi — juda kam`);
      } else {
        pass(`${rule} (${pyKeys.size} ta tuman va shahar)`);
      }
    }
  }
}

// --------------------------------------------------------------------------- //
//  Rule 4 — no debug leftovers
// --------------------------------------------------------------------------- //
{
  const rule = 'app/ va components/ da console.log qolmagan';
  const offenders = FILES.filter(
    (file) =>
      /^(app|components)\//.test(file.rel) && /(?<![.\w])console\.log\s*\(/.test(file.text),
  );
  if (offenders.length) fail(rule, offenders.map((f) => f.rel));
  else pass(rule);
}

// --------------------------------------------------------------------------- //
//  Rule 5 — client hooks need the client directive
// --------------------------------------------------------------------------- //
// Next.js reports this at build time, but the message points at a stack trace
// rather than the file, and a build takes a minute. This takes no time at all.
{
  const rule = "useState/useEffect ishlatgan fayllarda 'use client' bor";
  const offenders = FILES.filter((file) => {
    if (!/^(app|components)\//.test(file.rel)) return false;
    const usesHooks = /\buse(State|Effect|Callback|Ref|Memo|Reducer)\s*\(/.test(file.text);
    const hasDirective = /^\s*(['"])use client\1/m.test(file.text.slice(0, 400));
    return usesHooks && !hasDirective;
  });
  if (offenders.length) fail(rule, offenders.map((f) => f.rel));
  else pass(rule);
}

// --------------------------------------------------------------------------- //
//  Rule 6 — no locale-dependent sorting in rendered components
// --------------------------------------------------------------------------- //
// Node's ICU and the browser's disagree on Uzbek collation ("Toshkent shahri"
// vs "Toshkent viloyati"), so a list sorted with localeCompare renders one way
// on the server and another in the browser, and React throws a hydration
// error. Sort by a fixed order or by code point instead.
{
  const rule = 'app/ va components/ da localeCompare yo‘q (hydration)';
  const offenders = FILES.filter(
    (file) => /^(app|components)\//.test(file.rel) && /\.localeCompare\s*\(/.test(file.text),
  );
  if (offenders.length) fail(rule, offenders.map((f) => f.rel));
  else pass(rule);
}

// --------------------------------------------------------------------------- //
//  Rule 7 — links to a listing never prefetch
// --------------------------------------------------------------------------- //
// Rendering /mahsulot/<id> counts a view. A prefetching <Link> renders it in the
// background for every card on screen, so the homepage alone used to credit 24
// listings with views nobody made — and spent the buyer's data doing it.
{
  const rule = '/mahsulot/ ga <Link> lar prefetch={false}';
  const offenders = [];
  for (const file of FILES.filter((f) => /^(app|components)\//.test(f.rel))) {
    for (const m of file.text.matchAll(/<Link\b[^>]*?href=\{`\/mahsulot\/[^>]*>/gs)) {
      if (!/prefetch=\{false\}/.test(m[0])) offenders.push(file.rel);
    }
  }
  if (offenders.length) fail(rule, [...new Set(offenders)]);
  else pass(rule);
}

// --------------------------------------------------------------------------- //
console.log('');
if (failures) {
  console.error(`\x1b[91m${failures} ta tekshiruv muvaffaqiyatsiz.\x1b[0m`);
  process.exit(1);
}
console.log(`\x1b[92mHammasi joyida — ${FILES.length} ta fayl tekshirildi.\x1b[0m`);
