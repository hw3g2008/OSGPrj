#!/usr/bin/env node
// Parse 副本zh-en--map-translated.xlsx (already unzipped to /tmp/xlsx-extract)
// + merge i18n-glossary.md mandatory terms
// -> osg-frontend/scripts/terms.glossary.json
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve(process.cwd(), '../..')
const XL_DIR = process.env.XLSX_DIR || '/tmp/xlsx-extract/xl'
const GLOSSARY_MD = path.join(ROOT, 'i18n-glossary.md')
const OUT_JSON = path.join(ROOT, 'osg-frontend/scripts/terms.glossary.json')

function decodeEntities(s) {
  return s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&amp;/g, '&')
}

function parseSharedStrings(xml) {
  const out = []
  const siRe = /<si\b[^>]*>([\s\S]*?)<\/si>/g
  const tRe = /<t\b[^>]*>([\s\S]*?)<\/t>/g
  let m
  while ((m = siRe.exec(xml))) {
    const inner = m[1]
    let combined = ''
    let mt
    tRe.lastIndex = 0
    while ((mt = tRe.exec(inner))) combined += decodeEntities(mt[1])
    out.push(combined)
  }
  return out
}

function parseSheet(xml, sharedStrings) {
  const rows = []
  const rowRe = /<row\b[^>]*>([\s\S]*?)<\/row>/g
  const cellRe = /<c\s+r="([A-Z]+)(\d+)"(?:\s+s="\d+")?(?:\s+t="([^"]+)")?[^>]*>([\s\S]*?)<\/c>/g
  let rm
  while ((rm = rowRe.exec(xml))) {
    const rowXml = rm[1]
    const row = {}
    let cm
    cellRe.lastIndex = 0
    while ((cm = cellRe.exec(rowXml))) {
      const col = cm[1]
      const t = cm[3]
      const inner = cm[4]
      const vMatch = inner.match(/<v\b[^>]*>([\s\S]*?)<\/v>/)
      const isMatch = inner.match(/<is\b[^>]*>([\s\S]*?)<\/is>/)
      let val = ''
      if (t === 's' && vMatch) val = sharedStrings[parseInt(vMatch[1], 10)] || ''
      else if (t === 'inlineStr' && isMatch) {
        const tm = isMatch[1].match(/<t\b[^>]*>([\s\S]*?)<\/t>/)
        val = tm ? decodeEntities(tm[1]) : ''
      } else if (vMatch) val = decodeEntities(vMatch[1])
      row[col] = val
    }
    rows.push(row)
  }
  return rows
}

// Parse glossary markdown mandatory terms (table rows: | 中文 | **English** | ...)
function parseGlossaryMd(md) {
  const out = {}
  const lines = md.split(/\r?\n/)
  for (const line of lines) {
    // Table rows like: | 中文 | **English** | 禁用 |
    const m = line.match(/^\|\s*([^|]+?)\s*\|\s*\*\*([^*]+?)\*\*\s*\|/)
    if (!m) continue
    const zhRaw = m[1].trim()
    const en = m[2].trim()
    if (!zhRaw || !en) continue
    if (/^中文$/.test(zhRaw)) continue // header
    if (/^-+$/.test(zhRaw)) continue
    // Glossary table rows may pack variants with " / ": e.g. "字典 / 字典管理"
    // Each variant is mandatory-translated to the same English term.
    const variants = zhRaw.split(/\s*\/\s*/).filter(Boolean)
    for (const zh of variants) out[zh] = en
  }
  return out
}

const sharedStringsXml = readFileSync(path.join(XL_DIR, 'sharedStrings.xml'), 'utf8')
const sheetXml = readFileSync(path.join(XL_DIR, 'worksheets/sheet1.xml'), 'utf8')
const shared = parseSharedStrings(sharedStringsXml)
const rows = parseSheet(sheetXml, shared)

console.error(`sharedStrings: ${shared.length}, rows: ${rows.length}`)

// Build map. Skip header row(s) and instruction rows.
const xlsxMap = {}
let skipped = 0
let kept = 0
for (const r of rows) {
  const zh = (r.A || '').trim()
  const en = (r.B || '').trim()
  if (!zh || !en) { skipped++; continue }
  if (zh === 'zh' && en === 'en') { skipped++; continue }
  // Skip instruction-only rows where A is Chinese instruction (like 所有的导师都翻译成 Mentor) — keep them anyway as they may be mapping hints
  // We just record them all and let glossary override
  if (xlsxMap[zh] && xlsxMap[zh] !== en) {
    // duplicate zh with different en — keep first, log
    // console.error(`dup: "${zh}" -> "${xlsxMap[zh]}" vs "${en}"`)
  } else {
    xlsxMap[zh] = en
    kept++
  }
}
console.error(`xlsx: kept ${kept}, skipped ${skipped}`)

// Parse glossary md
const md = readFileSync(GLOSSARY_MD, 'utf8')
const gloss = parseGlossaryMd(md)
console.error(`glossary md mandatory terms: ${Object.keys(gloss).length}`)

// Merge: glossary overrides xlsx
const merged = { ...xlsxMap }
let overridden = 0
for (const [zh, en] of Object.entries(gloss)) {
  if (merged[zh] && merged[zh] !== en) overridden++
  merged[zh] = en
}
console.error(`glossary overrides applied: ${overridden}`)
console.error(`final entries: ${Object.keys(merged).length}`)

// Sort keys for stable output
const sorted = {}
for (const k of Object.keys(merged).sort()) sorted[k] = merged[k]

// Attach metadata as top-level under __meta to keep dict pure use possible
const out = {
  __meta: {
    generated_at: new Date().toISOString(),
    source_xlsx: '副本zh-en--map-translated.xlsx',
    source_glossary: 'i18n-glossary.md',
    xlsx_entries: kept,
    glossary_mandatory: Object.keys(gloss).length,
    glossary_overrides: overridden,
    total: Object.keys(sorted).length,
    note: 'glossary.md mandatory terms override xlsx; xlsx overrides csv (csv not merged here, query-only).',
  },
  terms: sorted,
}

mkdirSync(path.dirname(OUT_JSON), { recursive: true })
writeFileSync(OUT_JSON, JSON.stringify(out, null, 2) + '\n', 'utf8')
console.error(`wrote ${OUT_JSON}`)
