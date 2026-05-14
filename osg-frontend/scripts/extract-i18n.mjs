/**
 * Extract all Chinese strings from .vue / .ts / .tsx source files.
 * Output: scripts/i18n-map.csv  (columns: key, zh, en, file, line)
 *
 * Usage:  node scripts/extract-i18n.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PKG_DIR = path.resolve(__dirname, '../packages');
const OUT_CSV = path.resolve(__dirname, 'i18n-map.csv');

// Matches a Chinese "phrase": starts and ends with CJK, allows mixed chars in between
const ZH_RE = /[一-龥]/;
const PHRASE_RE = /[一-龥][一-龥\w\s，。！？、：；""''（）【】《》\-\/\+\.\?\!,\(\)·]*[一-龥]/g;

function* walkFiles(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
      yield* walkFiles(path.join(dir, entry.name));
    } else if (/\.(vue|ts|tsx)$/.test(entry.name)) {
      yield path.join(dir, entry.name);
    }
  }
}

function slugify(text) {
  // Build a snake_case key from the first few Chinese chars (pinyin would be better but requires a dep)
  return 'zh_' + Buffer.from(text.slice(0, 12)).toString('hex').slice(0, 16);
}

function isComment(line) {
  const t = line.trimStart();
  return t.startsWith('//') || t.startsWith('*') || t.startsWith('<!--');
}

const seen = new Map(); // zh text → { key, file, line }
let total = 0;

for (const filePath of walkFiles(PKG_DIR)) {
  const rel = path.relative(PKG_DIR, filePath).replace(/\\/g, '/');
  const lines = fs.readFileSync(filePath, 'utf8').split('\n');

  lines.forEach((raw, idx) => {
    if (!ZH_RE.test(raw)) return;
    if (isComment(raw)) return;

    const matches = raw.match(PHRASE_RE) ?? [];
    for (const m of matches) {
      const phrase = m.trim();
      if (phrase.length < 2) continue;
      total++;
      if (!seen.has(phrase)) {
        seen.set(phrase, { key: slugify(phrase), file: rel, line: idx + 1 });
      }
    }
  });
}

// Write CSV
const header = 'key,zh,en,file,line\n';
const rows = [...seen.entries()]
  .map(([zh, { key, file, line }]) => {
    const safe = (s) => `"${String(s).replace(/"/g, '""')}"`;
    return [safe(key), safe(zh), '""', safe(file), line].join(',');
  })
  .join('\n');

fs.writeFileSync(OUT_CSV, header + rows, 'utf8');

console.log(`\n✓ Extraction complete`);
console.log(`  Total occurrences : ${total}`);
console.log(`  Unique phrases    : ${seen.size}`);
console.log(`  Output            : ${OUT_CSV}\n`);
