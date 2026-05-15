/**
 * Generate zh.json / en.json from i18n-map-translated.csv
 * Keys are derived from English translation (snake_case, max 40 chars).
 *
 * Also outputs key-map.json mapping old hex keys → new readable keys
 * for use by the replacement script.
 *
 * Usage:  node scripts/generate-locale.mjs
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const CSV_IN = path.resolve(__dirname, 'i18n-map-translated.csv')
const LOCALE_DIR = path.resolve(__dirname, '../packages/shared/src/i18n/locales')
const KEY_MAP_OUT = path.resolve(__dirname, 'key-map.json')

function parseCsvLine(line) {
  const cols = []
  let cur = '', inQ = false
  for (let i = 0; i < line.length; i++) {
    const c = line[i]
    if (c === '"') {
      if (inQ && line[i + 1] === '"') { cur += '"'; i++ }
      else inQ = !inQ
    } else if (c === ',' && !inQ) { cols.push(cur); cur = '' }
    else cur += c
  }
  cols.push(cur)
  return cols
}

function toSnakeKey(en) {
  return en
    .toLowerCase()
    .replace(/[''""]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 40)
}

// Parse CSV
const lines = fs.readFileSync(CSV_IN, 'utf8').split('\n').filter(Boolean)
const records = lines.slice(1).map(l => {
  const [hexKey, zh, en, file, line] = parseCsvLine(l)
  return { hexKey, zh, en: en || '', file, line }
})

// Generate readable keys with dedup
const zh_json = {}
const en_json = {}
const keyMap = {}      // hexKey → readableKey
const zhToKey = {}     // zh text → readableKey (for replacement script)
const usedKeys = new Set()

for (const r of records) {
  // If same zh text already has a key, reuse it
  if (zhToKey[r.zh]) {
    keyMap[r.hexKey] = zhToKey[r.zh]
    continue
  }

  let base = toSnakeKey(r.en || r.zh)
  if (!base) base = 'text'

  let key = base
  let counter = 2
  while (usedKeys.has(key)) {
    key = `${base}_${counter}`
    counter++
  }
  usedKeys.add(key)

  zh_json[key] = r.zh
  en_json[key] = r.en || r.zh  // fallback to zh if no translation
  keyMap[r.hexKey] = key
  zhToKey[r.zh] = key
}

// Write locale files
fs.writeFileSync(path.join(LOCALE_DIR, 'zh.json'), JSON.stringify(zh_json, null, 2), 'utf8')
fs.writeFileSync(path.join(LOCALE_DIR, 'en.json'), JSON.stringify(en_json, null, 2), 'utf8')
fs.writeFileSync(KEY_MAP_OUT, JSON.stringify({ keyMap, zhToKey }, null, 2), 'utf8')

console.log(`✓ Generated locale files`)
console.log(`  zh.json: ${Object.keys(zh_json).length} keys`)
console.log(`  en.json: ${Object.keys(en_json).length} keys`)
console.log(`  key-map.json: ${Object.keys(keyMap).length} hex→readable mappings`)
console.log(`  zhToKey: ${Object.keys(zhToKey).length} unique zh→key mappings`)
