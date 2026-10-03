#!/usr/bin/env node
/**
 * Generate `lib/districts.ts` from `backend/app/districts.py`.
 *
 *   node scripts/gen-districts.mjs           # write the file
 *   node scripts/gen-districts.mjs --check   # fail if it is out of date
 *   node scripts/gen-districts.mjs --out ../mobile/src/lib/districts.ts
 *                                            # same file for the mobile app
 *
 * 175 districts kept in two places by hand would be two lists within a month.
 * The Python file is the source of truth — it is what the bot and the database
 * validate against — and this turns it into TypeScript.
 *
 * The parser is deliberately small: it reads the exact shape districts.py is
 * written in (one `{"key": ..., "uz": ..., "type": ...}` per line) rather than
 * trying to be a Python parser. If that file is reformatted, this fails loudly
 * with a line number instead of silently emitting half the districts.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const FRONTEND = resolve(HERE, '..');
const SOURCE = join(FRONTEND, '..', 'backend', 'app', 'districts.py');
// `--out <path>` (relative to the current directory) lets the mobile app
// generate its own copy from the same source, with the same code.
const outIndex = process.argv.indexOf('--out');
const TARGET =
  outIndex !== -1 && process.argv[outIndex + 1]
    ? resolve(process.cwd(), process.argv[outIndex + 1])
    : join(FRONTEND, 'lib', 'districts.ts');
const TARGET_NAME = relative(process.cwd(), TARGET) || TARGET;

const checkOnly = process.argv.includes('--check');

// --------------------------------------------------------------------------- //
//  Parse
// --------------------------------------------------------------------------- //
const python = readFileSync(SOURCE, 'utf8');

// Narrow to the DISTRICTS literal so comments elsewhere cannot confuse us.
const start = python.indexOf('DISTRICTS: dict[str, list[dict[str, str]]] = {');
if (start === -1) {
  console.error('gen-districts: DISTRICTS literal not found in districts.py');
  process.exit(1);
}
const body = python.slice(start);

const REGION_RE = /^\s{4}"([a-z_]+)":\s*\[/;
const ENTRY_RE = /^\s{8}\{"key":\s*"([a-z_]+)",\s*"uz":\s*"(.*?)",\s*"type":\s*"(city|district)"\},?\s*$/;

/** @type {Record<string, {key: string, uz: string, type: string}[]>} */
const regions = {};
let current = null;
let lineNo = 0;
let malformed = 0;

for (const raw of body.split('\n')) {
  lineNo += 1;
  const line = raw.replace(/\r$/, '');

  const regionMatch = REGION_RE.exec(line);
  if (regionMatch) {
    current = regionMatch[1];
    regions[current] = [];
    continue;
  }

  if (current && /^\s{4}\],?\s*$/.test(line)) {
    current = null;
    continue;
  }

  if (!current) continue;
  if (!line.trim() || line.trim().startsWith('#')) continue;

  const entry = ENTRY_RE.exec(line);
  if (entry) {
    regions[current].push({ key: entry[1], uz: entry[2], type: entry[3] });
  } else if (line.trim().startsWith('{')) {
    console.error(`gen-districts: unparsed entry at districts.py line ~${lineNo}: ${line.trim()}`);
    malformed += 1;
  }
}

if (malformed) {
  console.error(`gen-districts: ${malformed} entr(ies) did not match the expected shape.`);
  process.exit(1);
}

const regionKeys = Object.keys(regions);
const total = regionKeys.reduce((sum, key) => sum + regions[key].length, 0);

if (regionKeys.length !== 14) {
  console.error(`gen-districts: expected 14 regions, parsed ${regionKeys.length}`);
  process.exit(1);
}
if (total < 150) {
  console.error(`gen-districts: only ${total} districts parsed — that is too few`);
  process.exit(1);
}

// --------------------------------------------------------------------------- //
//  Emit
// --------------------------------------------------------------------------- //
const esc = (s) => s.replace(/\\/g, '\\\\').replace(/'/g, "\\'");

const lines = [
  '/**',
  ' * Districts and cities of Uzbekistan, by region.',
  ' *',
  ' * ⚠️ GENERATED FILE — do not edit by hand.',
  ' *',
  ' * Source: backend/app/districts.py',
  ' * Regenerate: npm run gen:districts',
  ' * Verified by: npm run verify (fails if this file is stale)',
  ' *',
  ` * ${regionKeys.length} regions, ${total} districts and cities.`,
  ' *',
  ' * Place names are Uzbek only. Translating 175 of them by guesswork would',
  ' * show a Russian-speaking trader the wrong name, which is worse than',
  ' * showing them the Uzbek one.',
  ' */',
  '',
  'export interface District {',
  '  key: string;',
  '  label: string;',
  "  /** 'city' sorts first — a grower names their nearest bazaar. */",
  "  type: 'city' | 'district';",
  '}',
  '',
  'export const DISTRICTS: Record<string, District[]> = {',
];

for (const region of regionKeys) {
  lines.push(`  ${region}: [`);
  for (const item of regions[region]) {
    lines.push(`    { key: '${esc(item.key)}', label: '${esc(item.uz)}', type: '${item.type}' },`);
  }
  lines.push('  ],');
}

lines.push(
  '};',
  '',
  '/** District slug -> region slug. Guards against filing Urgut under Khorezm. */',
  'export const DISTRICT_TO_REGION: Record<string, string> = Object.fromEntries(',
  '  Object.entries(DISTRICTS).flatMap(([region, items]) =>',
  '    items.map((item) => [item.key, region]),',
  '  ),',
  ');',
  '',
  'const LABELS: Record<string, string> = Object.fromEntries(',
  '  Object.values(DISTRICTS).flatMap((items) => items.map((i) => [i.key, i.label])),',
  ');',
  '',
  '/** Districts and cities of one region, or an empty list for an unknown one. */',
  'export function districtsOf(region: string | undefined | null): District[] {',
  '  if (!region || region === \'all\') return [];',
  '  return DISTRICTS[region] ?? [];',
  '}',
  '',
  '/**',
  ' * Slug -> readable name.',
  ' *',
  ' * Listings posted before the district picker existed hold free text rather',
  ' * than a slug, so anything unrecognised is returned as-is instead of being',
  ' * blanked out.',
  ' */',
  'export function districtLabel(key: string | undefined | null): string {',
  '  if (!key) return \'\';',
  '  return LABELS[key] ?? key;',
  '}',
  '',
  'export function isValidDistrict(key: string, region?: string): boolean {',
  '  const actual = DISTRICT_TO_REGION[key];',
  '  if (!actual) return false;',
  '  return !region || region === \'all\' || actual === region;',
  '}',
  '',
  `export const DISTRICT_COUNT = ${total};`,
  '',
);

const output = lines.join('\n');

if (checkOnly) {
  let existing = null;
  try {
    existing = readFileSync(TARGET, 'utf8');
  } catch {
    console.error(`gen-districts: ${TARGET_NAME} is missing — run \`npm run gen:districts\``);
    process.exit(1);
  }
  if (existing !== output) {
    console.error(
      `gen-districts: ${TARGET_NAME} is out of date with backend/app/districts.py.\n` +
        '               Run `npm run gen:districts` and commit the result.',
    );
    process.exit(1);
  }
  console.log(`gen-districts: up to date (${regionKeys.length} regions, ${total} districts)`);
} else {
  writeFileSync(TARGET, output, 'utf8');
  console.log(
    `gen-districts: wrote ${TARGET_NAME} — ${regionKeys.length} regions, ${total} districts`,
  );
}
