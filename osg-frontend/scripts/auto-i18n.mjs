#!/usr/bin/env node
/**
 * auto-i18n.mjs — Batch-replace hardcoded Chinese strings with t() calls.
 *
 * Usage (from osg-frontend/):
 *   node scripts/auto-i18n.mjs <file-or-dir> [--dry-run]
 *
 * What it handles automatically:
 *   Template: text nodes (>中文<), static attrs (placeholder="中文" → :placeholder)
 *   Script:   string literals ('中文', "中文"), template literals without ${…}
 *             message.success/error/info/warning calls
 *             return/ternary/assignment string values
 *
 * What it skips / marks TODO:
 *   - Lines with i18n-skip-line
 *   - Comment lines, import lines
 *   - Object keys (string followed by :)
 *   - Template literals with ${…} → TODO(i18n-complex) comment appended
 *   - Already wrapped in t(…)
 *
 * Output:
 *   - Modifies source files in place (unless --dry-run)
 *   - Updates packages/shared/src/i18n/locales/{zh,en}/<package>.json
 *   - Adds useI18n import + const { t } = useI18n() if missing
 *
 * Key naming: <pkgPrefix>.<componentName>.k1, k2, ...
 *   e.g. leadMentor.positions.k1
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')

// ── CLI ──────────────────────────────────────────────────────────────────────
const argv = process.argv.slice(2)
let TARGET = null
let DRY_RUN = false
for (let i = 0; i < argv.length; i++) {
  if (argv[i] === '--dry-run') { DRY_RUN = true; continue }
  if (!TARGET) TARGET = argv[i]
}
if (!TARGET) {
  console.error('Usage: node scripts/auto-i18n.mjs <file-or-dir> [--dry-run]')
  process.exit(1)
}

// ── Config ───────────────────────────────────────────────────────────────────
const ZH_RE = /[一-鿿]/
const LOCALE_DIR = path.resolve(ROOT, 'packages/shared/src/i18n/locales')

const PKG_MAP = {
  'lead-mentor': { prefix: 'leadMentor', locale: 'lead-mentor' },
  'mentor':      { prefix: 'mentor',     locale: 'mentor'      },
  'admin':       { prefix: 'admin',      locale: 'admin'       },
  'assistant':   { prefix: 'assistant',  locale: 'assistant'   },
  'student':     { prefix: 'student',    locale: 'student'     },
}

// Attributes where we just add `:` prefix (static → dynamic binding)
const DYNAMIC_BIND_ATTRS = new Set([
  'placeholder', 'message', 'title', 'label', 'description',
  'content', 'tooltip', 'hint', 'text', 'suffix', 'prefix',
  'empty-text', 'no-data-text', 'loading-text',
])

// Attributes to skip (data, aria, events, vue directives, structural)
const SKIP_ATTR_RE = /^(data-|aria-|on[A-Z]|v-|id$|class$|style$|type$|key$|ref$|href$|src$|alt$|for$|name$|value$|role$|tabindex$|width$|height$|size$|step$|min$|max$|pattern$|autocomplete$|spellcheck$|lang$)/

// ── Helpers ──────────────────────────────────────────────────────────────────
function getPackageInfo(filePath) {
  const rel = path.relative(ROOT, filePath).replace(/\\/g, '/')
  const m = rel.match(/packages\/([^/]+)\//)
  return m ? (PKG_MAP[m[1]] ?? null) : null
}

/**
 * Returns { jsonNs, i18nNs }
 *   jsonNs  — namespace within the locale JSON file (e.g. "login", "positions")
 *   i18nNs  — full prefix for t() calls (e.g. "leadMentor.login")
 *
 * The locale JSON is registered under pkgInfo.prefix in the i18n config:
 *   messages.zh.leadMentor = lead-mentor.json
 * So lead-mentor.json's top-level "login" key is accessed as leadMentor.login.xxx
 */
function deriveNamespace(filePath, pkgInfo) {
  const rel = path.relative(ROOT, filePath).replace(/\\/g, '/')
  const m = rel.match(/packages\/[^/]+\/src\/(.+)/)
  if (!m) return { jsonNs: 'misc', i18nNs: `${pkgInfo.prefix}.misc` }

  let srcRel = m[1].replace(/\.(vue|ts|tsx)$/, '')
  // For index files, use the parent directory name
  if (srcRel.endsWith('/index')) {
    const parts = srcRel.split('/')
    parts.pop()
    srcRel = parts[parts.length - 1]
  } else {
    srcRel = srcRel.split('/').pop()
  }

  // kebab-case / PascalCase → camelCase
  const camel = srcRel
    .replace(/-([a-z])/g, (_, c) => c.toUpperCase())
    .replace(/^[A-Z]/, c => c.toLowerCase())

  return { jsonNs: camel, i18nNs: `${pkgInfo.prefix}.${camel}` }
}

function loadJson(p) {
  return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : {}
}

function saveJson(p, data) {
  fs.writeFileSync(p, JSON.stringify(data, null, 2) + '\n', 'utf8')
}

function getNested(obj, ns) {
  return ns.split('.').reduce((o, k) => (o && typeof o === 'object' ? o[k] : undefined), obj)
}

function setNested(obj, ns, key, value) {
  const parts = ns.split('.')
  let cur = obj
  for (const p of parts) {
    if (!cur[p] || typeof cur[p] !== 'object') cur[p] = {}
    cur = cur[p]
  }
  cur[key] = value
}

function nextKeyNum(obj, ns) {
  const section = getNested(obj, ns)
  if (!section || typeof section !== 'object') return 1
  let max = 0
  for (const k of Object.keys(section)) {
    const m = k.match(/^k(\d+)$/)
    if (m) max = Math.max(max, +m[1])
  }
  return max + 1
}

// ── Replacer class ───────────────────────────────────────────────────────────
class Replacer {
  /**
   * @param {string} jsonNs  — key path within locale JSON (e.g. "login")
   * @param {string} i18nNs  — prefix used in t() calls (e.g. "leadMentor.login")
   */
  constructor(jsonNs, i18nNs, zhData, enData) {
    this.jsonNs = jsonNs
    this.i18nNs = i18nNs
    this.zh = zhData
    this.en = enData
    this._counter = nextKeyNum(zhData, jsonNs)
    this._cache = new Map() // zhText → shortKey
    this.changed = 0   // new keys created
    this.replaced = 0  // total substitutions (includes reused keys)
  }

  _nextKey() { return `k${this._counter++}` }

  keyFor(zhText) {
    if (this._cache.has(zhText)) return this._cache.get(zhText)
    // Check if value already exists in the JSON section (reuse existing key)
    const section = getNested(this.zh, this.jsonNs)
    if (section && typeof section === 'object') {
      for (const [k, v] of Object.entries(section)) {
        if (v === zhText) { this._cache.set(zhText, k); return k }
      }
    }
    // Create new key
    const k = this._nextKey()
    this._cache.set(zhText, k)
    setNested(this.zh, this.jsonNs, k, zhText)
    if (!getNested(this.en, this.jsonNs)?.[k]) {
      setNested(this.en, this.jsonNs, k, zhText) // en placeholder = zh text
    }
    this.changed++
    return k
  }

  tCall(zhText) {
    this.replaced++ // track every substitution, not just new keys
    return `t('${this.i18nNs}.${this.keyFor(zhText)}')`
  }
}

// ── Script section processor ─────────────────────────────────────────────────
function processScriptLine(line, r) {
  if (!ZH_RE.test(line)) return line
  if (line.includes('i18n-skip-line')) return line

  const tr = line.trimStart()
  // Skip comment lines
  if (tr.startsWith('//') || tr.startsWith('*') || tr.startsWith('/*') || tr.startsWith('<!--')) return line
  // Skip import lines
  if (tr.startsWith('import ')) return line

  // Template literals WITH variables → mark TODO, leave untouched
  if (/`[^`]*[一-鿿][^`]*\$\{/.test(line) || /\$\{[^`]*[一-鿿][^`]*`/.test(line)) {
    return line.includes('TODO(i18n') ? line : line.trimEnd() + ' // TODO(i18n-complex)'
  }

  // Template literals WITHOUT variables
  let result = line.replace(/`([^`]*[一-鿿][^`]*)`/g, (match, text) => {
    if (text.includes('${')) return match
    return r.tCall(text.trim())
  })

  // Single-quoted strings
  result = result.replace(/'([^'\n]*[一-鿿][^'\n]*)'/g, (match, text, offset, str) => {
    if (str.slice(offset + match.length).trimStart().startsWith(':')) return match // object key
    if (str.slice(0, offset).match(/import\s*[{(]?[^;]*$/)) return match // import statement
    return r.tCall(text)
  })

  // Double-quoted strings
  result = result.replace(/"([^"\n]*[一-鿿][^"\n]*)"/g, (match, text, offset, str) => {
    if (str.slice(offset + match.length).trimStart().startsWith(':')) return match
    return r.tCall(text)
  })

  return result
}

// ── Template section processor ────────────────────────────────────────────────
function processTemplateBlock(template, r) {
  let result = template

  // 1. Text nodes: >  中文  <
  //    Matches content between > and < that has Chinese, no braces, no nested tags
  result = result.replace(/>([^<>{}]*[一-鿿][^<>{}]*)</g, (match, inner) => {
    const trimmed = inner.trim()
    if (!trimmed || !ZH_RE.test(trimmed)) return match
    if (trimmed.includes("t('")) return match // already replaced
    const lead = inner.match(/^(\s*)/)[1]
    const trail = inner.match(/(\s*)$/)[1]
    return `>${lead}{{ ${r.tCall(trimmed)} }}${trail}<`
  })

  // 2. Static attribute values: attr="中文" → :attr="t('...')"
  //    Also handles already-dynamic: :attr="'中文'" → :attr="t('...')"
  result = result.replace(/(\s+):?([a-zA-Z][a-zA-Z0-9-]*)="([^"]*[一-鿿][^"]*)"/g, (match, space, attr, value) => {
    if (SKIP_ATTR_RE.test(attr)) return match
    if (value.includes("t('")) return match
    const zhText = value.trim()
    // All matched attrs get dynamic binding
    return `${space}:${attr}="${r.tCall(zhText)}"`
  })

  return result
}

// ── useI18n injection ─────────────────────────────────────────────────────────
function ensureUseI18n(content) {
  // Already has t()
  const hasT = /const\s*\{[^}]*\bt\b[^}]*\}\s*=\s*useI18n\(\)/.test(content)
  const hasImport = /from\s+['"]vue-i18n['"]/.test(content)

  let result = content

  // Add import if missing
  if (!hasImport) {
    // After last `from 'vue'` import, or first import block
    if (/from\s+['"]vue['"]/.test(result)) {
      result = result.replace(
        /(from\s+['"]vue['"][^\n]*\n)/,
        `$1import { useI18n } from 'vue-i18n'\n`
      )
    } else {
      // Prepend after <script ...> tag
      result = result.replace(
        /(<script[^>]*>\n)/,
        `$1import { useI18n } from 'vue-i18n'\n`
      )
    }
  } else if (!/useI18n/.test(result.match(/from\s+['"]vue-i18n['"]\s*\n/)?.[0] ?? '')) {
    // vue-i18n is imported but maybe not useI18n — check
    if (!/useI18n/.test(result)) {
      result = result.replace(
        /(from\s+['"]vue-i18n['"])/,
        `from 'vue-i18n'`
      )
    }
  }

  // Add const { t } = useI18n() if missing
  if (!hasT) {
    // Find the last line of the last import block (handles multi-line imports)
    const scriptRe = /(<script[^>]*>)([\s\S]*?)(<\/script>)/
    const sm = result.match(scriptRe)
    if (sm) {
      const body = sm[2]
      const lines = body.split('\n')
      let lastImportEnd = -1
      let inMultiLineImport = false
      for (let i = 0; i < lines.length; i++) {
        if (/^\s*import\s/.test(lines[i])) {
          inMultiLineImport = !lines[i].includes(' from ')
          lastImportEnd = i
        } else if (inMultiLineImport) {
          lastImportEnd = i
          if (lines[i].includes(' from ') || /^\}\s*from\s+['"]/.test(lines[i])) {
            inMultiLineImport = false
          }
        }
      }
      const insertAt = lastImportEnd >= 0 ? lastImportEnd : 0
      lines.splice(insertAt + 1, 0, '\nconst { t } = useI18n()')
      result = result.replace(sm[2], lines.join('\n'))
    }
  }

  return result
}

// ── File processor ────────────────────────────────────────────────────────────
function processFile(filePath, pkgInfo, zhData, enData) {
  const content = fs.readFileSync(filePath, 'utf8')
  if (!ZH_RE.test(content)) return 0

  const { jsonNs, i18nNs } = deriveNamespace(filePath, pkgInfo)
  const r = new Replacer(jsonNs, i18nNs, zhData, enData)

  let result = content
  const ext = path.extname(filePath)

  if (ext === '.vue') {
    // Split into sections
    const tplRe = /(<template>)([\s\S]*)(<\/template>)/
    const scrRe = /(<script[^>]*>)([\s\S]*?)(<\/script>)/

    const tplMatch = result.match(tplRe)
    if (tplMatch) {
      const processed = processTemplateBlock(tplMatch[2], r)
      result = result.replace(tplMatch[2], processed)
    }

    const scrMatch = result.match(scrRe)
    if (scrMatch) {
      const processed = scrMatch[2]
        .split('\n')
        .map(line => processScriptLine(line, r))
        .join('\n')
      result = result.replace(scrMatch[2], processed)
    }
  } else {
    // .ts / .tsx — treat as script
    result = result
      .split('\n')
      .map(line => processScriptLine(line, r))
      .join('\n')
  }

  if (r.replaced === 0) return null

  // Add useI18n boilerplate
  if (ext === '.vue') result = ensureUseI18n(result)

  if (!DRY_RUN && result !== content) {
    fs.writeFileSync(filePath, result, 'utf8')
  }

  return { replaced: r.replaced, newKeys: r.changed }
}

// ── File walker ───────────────────────────────────────────────────────────────
const SKIP_DIRS = new Set(['node_modules', 'dist', '__tests__', 'tests', '.git', '.turbo', 'coverage'])

function* walkFiles(dir) {
  if (!fs.existsSync(dir)) return
  const stat = fs.statSync(dir)
  if (stat.isFile()) {
    if (/\.(vue|ts|tsx)$/.test(dir) && !/(spec|test)\.(ts|tsx)$/.test(dir)) yield dir
    return
  }
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name) || entry.name.startsWith('.')) continue
      yield* walkFiles(path.join(dir, entry.name))
    } else if (/\.(vue|ts|tsx)$/.test(entry.name) && !/(spec|test)\.(ts|tsx)$/.test(entry.name)) {
      yield path.join(dir, entry.name)
    }
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────
const targetPath = path.resolve(process.cwd(), TARGET)
let totalNew = 0
let filesChanged = 0

// Group files by package so we share locale JSON objects
const byPkg = new Map()
for (const filePath of walkFiles(targetPath)) {
  const pkgInfo = getPackageInfo(filePath)
  if (!pkgInfo) continue
  if (!byPkg.has(pkgInfo.locale)) byPkg.set(pkgInfo.locale, { pkgInfo, files: [] })
  byPkg.get(pkgInfo.locale).files.push(filePath)
}

for (const [locale, { pkgInfo, files }] of byPkg) {
  const zhPath = path.join(LOCALE_DIR, 'zh', `${locale}.json`)
  const enPath = path.join(LOCALE_DIR, 'en', `${locale}.json`)
  const zhData = loadJson(zhPath)
  const enData = loadJson(enPath)

  for (const filePath of files) {
    const res = processFile(filePath, pkgInfo, zhData, enData)
    if (res) {
      const rel = path.relative(process.cwd(), filePath).replace(/\\/g, '/')
      console.log(`  ✓ ${rel}  (${res.replaced} substitution(s), ${res.newKeys} new key(s))`)
      totalNew += res.replaced
      filesChanged++
    }
  }

  if (!DRY_RUN && filesChanged > 0) {
    saveJson(zhPath, zhData)
    saveJson(enPath, enData)
    console.log(`  → saved ${locale}.json (zh + en)`)
  }
}

if (totalNew === 0) {
  console.log('No changes needed.')
} else {
  console.log(`\n${DRY_RUN ? '[DRY RUN] ' : ''}Done: +${totalNew} new keys across ${filesChanged} files`)
  console.log('Next: run `node scripts/extract-i18n.mjs --check` to see remaining complex cases')
}
