#!/usr/bin/env node
// Quick triage report for shared zh strings (skip test files).
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const SCAN = path.resolve(__dirname, '../packages/shared/src')
const ZH_RE = /[一-鿿]/
const PHRASE_RE = /[一-鿿][一-鿿\w\s，。！？、：；""''（）【】《》\-\/\+\.\?\!,\(\)·]*[一-鿿]/g
const SKIP_DIRS = new Set(['node_modules', 'dist', 'coverage', '.git'])

const TODO_MARKERS = ['TODO(i18n)', 'TODO(i18n-retry)', 'TODO(i18n-refactor)', 'TODO(i18n-shared)', 'TODO(i18n-backend)', 'TODO(i18n-glossary-gap)']

function isTestFile(p) { return /\.(spec|test)\.(ts|tsx|js)$/.test(p) || /[\\/]__tests__[\\/]/.test(p) }
function isCommentLike(l) { const t = l.trimStart(); return t.startsWith('//') || t.startsWith('*') || t.startsWith('/*') || t.startsWith('<!--') }
function hasTodo(l) { return TODO_MARKERS.some(m => l.includes(m)) }

function* walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    if (e.isDirectory()) { if (SKIP_DIRS.has(e.name) || e.name.startsWith('.')) continue; yield* walk(path.join(d, e.name)) }
    else if (/\.(vue|ts|tsx)$/.test(e.name)) yield path.join(d, e.name)
  }
}

const byFile = {}
for (const fp of walk(SCAN)) {
  if (isTestFile(fp)) continue
  const rel = path.relative(SCAN, fp).replace(/\\/g, '/')
  const lines = fs.readFileSync(fp, 'utf8').split('\n')
  let inBlock = false
  let count = 0
  for (const raw of lines) {
    let line = raw
    if (inBlock) {
      const end = line.indexOf('*/'); if (end === -1) continue
      line = line.slice(end + 2); inBlock = false
    }
    const bs = line.indexOf('/*')
    if (bs !== -1) {
      const be = line.indexOf('*/', bs + 2)
      if (be === -1) { line = line.slice(0, bs); inBlock = true } else line = line.slice(0, bs) + line.slice(be + 2)
    }
    if (!ZH_RE.test(line)) continue
    if (isCommentLike(line)) continue
    if (hasTodo(raw)) continue
    const m = line.match(PHRASE_RE) || []
    for (const x of m) if (x.trim().length >= 2) count++
  }
  if (count) byFile[rel] = count
}

const sorted = Object.entries(byFile).sort((a, b) => b[1] - a[1])
const total = sorted.reduce((s, [, c]) => s + c, 0)
console.log(`Total: ${total} occurrences across ${sorted.length} files`)
console.log('---')
for (const [f, c] of sorted) console.log(`${String(c).padStart(4)}  ${f}`)
