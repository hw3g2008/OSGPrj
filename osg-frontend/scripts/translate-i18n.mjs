/**
 * Translate i18n-map.csv  zh → en  using unofficial Google Translate.
 * Supports resume: progress is saved to scripts/translate-progress.json after each batch.
 *
 * Usage:  node scripts/translate-i18n.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import https from 'https';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CSV_IN    = path.resolve(__dirname, 'i18n-map.csv');
const CSV_OUT   = path.resolve(__dirname, 'i18n-map-translated.csv');
const PROGRESS  = path.resolve(__dirname, 'translate-progress.json');

const DELAY_MS    = 1200;  // ms between requests
const MAX_RETRIES = 4;

// ── CSV helpers ──────────────────────────────────────────────────────────────

function parseCsvLine(line) {
  const cols = [];
  let cur = '', inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQ && line[i + 1] === '"') { cur += '"'; i++; }
      else inQ = !inQ;
    } else if (c === ',' && !inQ) {
      cols.push(cur); cur = '';
    } else {
      cur += c;
    }
  }
  cols.push(cur);
  return cols;
}

function toCsvField(s) {
  return `"${String(s).replace(/"/g, '""')}"`;
}

// ── Load CSV ──────────────────────────────────────────────────────────────────

const lines   = fs.readFileSync(CSV_IN, 'utf8').split('\n').filter(Boolean);
const header  = lines[0];
const records = lines.slice(1).map(l => {
  const [key, zh, en, file, line] = parseCsvLine(l);
  return { key, zh, en, file, line };
});

// ── Load progress ─────────────────────────────────────────────────────────────

let done = {};
if (fs.existsSync(PROGRESS)) {
  done = JSON.parse(fs.readFileSync(PROGRESS, 'utf8'));
  console.log(`Resuming — ${Object.keys(done).length} already translated`);
}

// ── Translation helper ────────────────────────────────────────────────────────

// MyMemory free API — no key required, ~5000 chars/day per IP
function httpGet(url) {
  return new Promise((resolve, reject) => {
    https.get(url, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error('JSON parse error: ' + data.slice(0, 100))); }
      });
    }).on('error', reject);
  });
}

async function translateOne(phrase) {
  const encoded = encodeURIComponent(phrase);
  const url = `https://api.mymemory.translated.net/get?q=${encoded}&langpair=zh-CN|en-US`;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const json = await httpGet(url);
      if (json.responseStatus === 200) {
        return json.responseData.translatedText?.trim() ?? '';
      }
      // quota exceeded
      if (json.responseStatus === 429 || json.responseDetails?.includes('QUERY LENGTH LIMIT')) {
        const wait = 30000 * attempt;
        process.stdout.write(`\n  [quota] waiting ${wait / 1000}s...`);
        await sleep(wait);
      } else {
        throw new Error(`API ${json.responseStatus}: ${json.responseDetails}`);
      }
    } catch (e) {
      if (attempt === MAX_RETRIES) throw e;
      await sleep(3000 * attempt);
    }
  }
  return '';
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ── Main ──────────────────────────────────────────────────────────────────────

const todo = records.filter(r => !done[r.zh]);
console.log(`\nTo translate: ${todo.length}  (already done: ${records.length - todo.length})\n`);

let processed = 0;
for (let i = 0; i < todo.length; i++) {
  const record = todo[i];

  try {
    const en = await translateOne(record.zh);
    if (en) done[record.zh] = en;
  } catch (e) {
    console.error(`\n  Failed [${record.zh}]: ${e.message}`);
  }

  if (done[record.zh]) fs.writeFileSync(PROGRESS, JSON.stringify(done, null, 2));

  const pct = Math.round((Object.keys(done).length / records.length) * 100);
  process.stdout.write(`\r  Progress: ${Object.keys(done).length}/${records.length}  (${pct}%)  `);

  if (i < todo.length - 1) await sleep(DELAY_MS + Math.random() * 500);
}

// ── Write output CSV ──────────────────────────────────────────────────────────

const outRows = records.map(r => {
  const en = done[r.zh] ?? '';
  return [r.key, r.zh, en, r.file, r.line].map(toCsvField).join(',');
});

fs.writeFileSync(CSV_OUT, header + '\n' + outRows.join('\n'), 'utf8');

console.log(`\n\n✓ Done — output: ${CSV_OUT}`);
console.log(`  Translated : ${Object.values(done).filter(Boolean).length}`);
console.log(`  Empty      : ${Object.values(done).filter(v => !v).length}`);
