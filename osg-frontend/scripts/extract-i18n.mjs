/**
 * Extract / detect Chinese strings from .vue / .ts / .tsx source files.
 *
 * Usage:
 *   node scripts/extract-i18n.mjs                          # default: scan all packages, write i18n-map.csv
 *   node scripts/extract-i18n.mjs --module <path>          # scan a single package / directory
 *   node scripts/extract-i18n.mjs --check [<path>]         # report-only mode; exit 1 if hardcoded zh found (excluding TODO-marked lines)
 *   node scripts/extract-i18n.mjs --module <path> --check  # combined
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT_PKG = path.resolve(__dirname, '../packages')
const DEFAULT_OUT = path.resolve(__dirname, 'i18n-map.csv')

const argv = process.argv.slice(2)
let MODULE = null
let CHECK = false
let INCLUDE_TESTS = false
let positional = []
for (let i = 0; i < argv.length; i++) {
  const a = argv[i]
  if (a === '--module') { MODULE = argv[++i]; continue }
  if (a === '--check') { CHECK = true; continue }
  if (a === '--include-tests') { INCLUDE_TESTS = true; continue }
  positional.push(a)
}
if (CHECK && !MODULE && positional[0]) MODULE = positional[0]

const SCAN_DIR = MODULE ? path.resolve(process.cwd(), MODULE) : ROOT_PKG

const ZH_RE = /[一-鿿]/
const PHRASE_RE = /[一-鿿][一-鿿\w\s，。！？、：；""''（）【】《》\-\/\+\.\?\!,\(\)·]*[一-鿿]/g

const TODO_MARKERS = [
  'TODO(i18n)',
  'TODO(i18n-retry)',
  'TODO(i18n-refactor)',
  'TODO(i18n-shared)',
  'TODO(i18n-backend)',
  'TODO(i18n-glossary-gap)',
]

const SKIP_DIRS = new Set(['node_modules', 'dist', 'coverage', '.git', '.turbo', 'playwright-report'])

function isTestFile(filePath) {
  return /\.(spec|test)\.(ts|tsx|js)$/.test(filePath) || /[\\/]__tests__[\\/]/.test(filePath) || /[\\/]tests[\\/]e2e[\\/]/.test(filePath)
}

function* walkFiles(dir) {
  if (!fs.existsSync(dir)) return
  const stat = fs.statSync(dir)
  if (stat.isFile()) {
    if (/\.(vue|ts|tsx)$/.test(dir)) yield dir
    return
  }
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name) || entry.name.startsWith('.')) continue
      yield* walkFiles(path.join(dir, entry.name))
    } else if (/\.(vue|ts|tsx)$/.test(entry.name)) {
      yield path.join(dir, entry.name)
    }
  }
}

function slugify(text) {
  return 'zh_' + Buffer.from(text.slice(0, 12)).toString('hex').slice(0, 16)
}

function isCommentLike(line) {
  const t = line.trimStart()
  return t.startsWith('//') || t.startsWith('*') || t.startsWith('/*') || t.startsWith('<!--')
}

function hasTodoMarker(line) {
  return TODO_MARKERS.some((m) => line.includes(m))
}

const seen = new Map()
let total = 0
const violations = []

for (const filePath of walkFiles(SCAN_DIR)) {
  if (!INCLUDE_TESTS && isTestFile(filePath)) continue
  const rel = path.relative(process.cwd(), filePath).replace(/\\/g, '/')
  const lines = fs.readFileSync(filePath, 'utf8').split('\n')
  // File-level skip pragma — must appear in the first 10 lines.
  // Use this for files where Chinese strings are mapping keys / regex patterns / etc.,
  // NOT user-facing display text. Mark with: // i18n-skip-file: <reason>
  if (lines.slice(0, 10).some((l) => /i18n-skip-file/.test(l))) continue

  // Track block-comment and HTML-comment state
  let inBlockComment = false
  let inHtmlComment = false

  lines.forEach((raw, idx) => {
    let line = raw

    // HTML comment tracking (<!-- ... -->)
    if (inHtmlComment) {
      const end = line.indexOf('-->')
      if (end === -1) return
      line = line.slice(end + 3)
      inHtmlComment = false
    }
    const htmlStart = line.indexOf('<!--')
    if (htmlStart !== -1) {
      const htmlEnd = line.indexOf('-->', htmlStart + 4)
      if (htmlEnd === -1) {
        line = line.slice(0, htmlStart)
        inHtmlComment = true
      } else {
        line = line.slice(0, htmlStart) + line.slice(htmlEnd + 3)
      }
    }

    // Block-comment tracking (/* ... */)
    if (inBlockComment) {
      const end = line.indexOf('*/')
      if (end === -1) return
      line = line.slice(end + 2)
      inBlockComment = false
    }
    const blockStart = line.indexOf('/*')
    if (blockStart !== -1) {
      const blockEnd = line.indexOf('*/', blockStart + 2)
      if (blockEnd === -1) {
        line = line.slice(0, blockStart)
        inBlockComment = true
      } else {
        line = line.slice(0, blockStart) + line.slice(blockEnd + 2)
      }
    }
    // Strip playwright selector attributes (data-field-name / data-field-name-alias)
    // These are used as e2e test selectors and must stay in Chinese to match tests.
    line = line.replace(/\bdata-field-name(?:-alias)?="[^"]*"/g, '')
    line = line.replace(/:data-field-name(?:-alias)?="[^"]*"/g, '')
    // Strip data-tab-text and similar test/screen-reader-only attributes
    line = line.replace(/\b:?data-tab-text="[^"]*"/g, '')
    // Strip aria-label attribute values (screen reader content; locale handled separately).
    // Static and dynamic bindings handled.
    line = line.replace(/\baria-label="[^"]*"/g, '')
    line = line.replace(/:aria-label="(?:[^"\\]|\\.)*"/g, '')
    line = line.replace(/:aria-label="`[^`]*`"/g, '')

    if (!ZH_RE.test(line)) return
    if (isCommentLike(line)) return
    if (hasTodoMarker(raw)) return
    if (/i18n-skip-line/.test(raw)) return

    const matches = line.match(PHRASE_RE) ?? []
    for (const m of matches) {
      const phrase = m.trim()
      if (phrase.length < 2) continue
      total++
      if (!seen.has(phrase)) {
        seen.set(phrase, { key: slugify(phrase), file: rel, line: idx + 1 })
      }
      violations.push({ file: rel, line: idx + 1, phrase })
    }
  })
}

if (CHECK) {
  if (violations.length === 0) {
    console.error(`extract-i18n --check: 0 hardcoded zh in ${path.relative(process.cwd(), SCAN_DIR) || '.'}`)
    process.exit(0)
  }
  console.error(`extract-i18n --check: ${violations.length} hardcoded zh occurrence(s) in ${path.relative(process.cwd(), SCAN_DIR) || '.'} (${seen.size} unique)`)
  const sample = violations.slice(0, 50)
  for (const v of sample) console.error(`  ${v.file}:${v.line}  ${v.phrase}`)
  if (violations.length > sample.length) console.error(`  ... (${violations.length - sample.length} more)`)
  process.exit(1)
}

// Default mode: write CSV
const header = 'key,zh,en,file,line\n'
const rows = [...seen.entries()]
  .map(([zh, { key, file, line }]) => {
    const safe = (s) => `"${String(s).replace(/"/g, '""')}"`
    return [safe(key), safe(zh), '""', safe(file), line].join(',')
  })
  .join('\n')

const outPath = MODULE
  ? path.resolve(__dirname, `i18n-map-${path.basename(SCAN_DIR)}.csv`)
  : DEFAULT_OUT
fs.writeFileSync(outPath, header + rows, 'utf8')

console.log(`\n✓ Extraction complete`)
console.log(`  Scanned dir       : ${path.relative(process.cwd(), SCAN_DIR) || '.'}`)
console.log(`  Total occurrences : ${total}`)
console.log(`  Unique phrases    : ${seen.size}`)
console.log(`  Output            : ${outPath}\n`)
