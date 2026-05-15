/**
 * Replace Chinese strings in .vue / .ts files with $t('key') / t('key').
 *
 * Usage:
 *   node scripts/replace-source.mjs --target admin
 *   node scripts/replace-source.mjs --target shared
 *   node scripts/replace-source.mjs --target all
 *
 * Outputs:
 *   scripts/review-list.csv  — complex patterns needing manual confirmation
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '../packages')
const KEY_MAP_FILE = path.resolve(__dirname, 'key-map.json')

// ── CLI args ──────────────────────────────────────────────────────────────────
const targetArg = process.argv.find(a => a.startsWith('--target='))?.split('=')[1]
  || process.argv[process.argv.indexOf('--target') + 1]
  || 'admin'

const TARGETS = targetArg === 'all'
  ? ['admin', 'student', 'mentor', 'lead-mentor', 'assistant', 'shared']
  : [targetArg]

// ── Load mappings ─────────────────────────────────────────────────────────────
const { zhToKey } = JSON.parse(fs.readFileSync(KEY_MAP_FILE, 'utf8'))

// Sort by length desc to avoid partial match issues
const sortedZh = Object.keys(zhToKey).sort((a, b) => b.length - a.length)
const ZH_RE = /[一-龥]/

function getKey(zh) { return zhToKey[zh] }

// ── Review list ───────────────────────────────────────────────────────────────
const reviewItems = []
function addReview(file, line, category, original, suggested) {
  reviewItems.push({ file, line, category, original, suggested })
}

// ── Helper: escape for regex ──────────────────────────────────────────────────
function escapeRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') }

// ── Section splitter for .vue files ──────────────────────────────────────────
// Handles nested <template> slots by counting open/close pairs.
function extractSection(content, tag) {
  const openRe = new RegExp(`<${tag}(\\s[^>]*)?>`, 'g')
  const closeTag = `</${tag}>`
  openRe.lastIndex = 0
  const firstOpen = openRe.exec(content)
  if (!firstOpen) return null

  const openStr = firstOpen[0]
  const attrs = firstOpen[1] ?? ''
  let depth = 1
  let i = firstOpen.index + openStr.length

  while (i < content.length && depth > 0) {
    const nextOpen = content.indexOf(`<${tag}`, i)
    const nextClose = content.indexOf(closeTag, i)
    if (nextClose === -1) break
    if (nextOpen !== -1 && nextOpen < nextClose) {
      depth++
      i = nextOpen + 1
    } else {
      depth--
      if (depth === 0) {
        return {
          open: `<${tag}${attrs}>`,
          inner: content.slice(firstOpen.index + openStr.length, nextClose),
          close: closeTag,
          startIdx: firstOpen.index,
          endIdx: nextClose + closeTag.length,
        }
      }
      i = nextClose + closeTag.length
    }
  }
  return null
}

function splitVue(content) {
  const tmpl   = extractSection(content, 'template')
  const scriptMatch = content.match(/(<script(?:\s[^>]*)?>)([\s\S]*?)(<\/script>)/)
  const styleMatch  = content.match(/(<style(?:\s[^>]*)?>)([\s\S]*?)(<\/style>)/)
  return {
    templateOpen:  tmpl?.open ?? '',
    template:      tmpl?.inner ?? '',
    templateClose: tmpl?.close ?? '',
    tmplStart:     tmpl?.startIdx ?? -1,
    tmplEnd:       tmpl?.endIdx ?? -1,
    scriptOpen:  scriptMatch?.[1] ?? '',
    script:      scriptMatch?.[2] ?? '',
    scriptClose: scriptMatch?.[3] ?? '',
    styleOpen:  styleMatch?.[1] ?? '',
    style:      styleMatch?.[2] ?? '',
    styleClose: styleMatch?.[3] ?? '',
    hasTemplate: !!tmpl,
    hasScript:   !!scriptMatch,
    hasStyle:    !!styleMatch,
  }
}

// ── Template replacements ─────────────────────────────────────────────────────
function processTemplate(tmpl, relFile) {
  let out = tmpl
  const lines = out.split('\n')

  const processed = lines.map((line, idx) => {
    // Skip comment lines
    const trimmed = line.trimStart()
    if (trimmed.startsWith('<!--') || trimmed.startsWith('//') || trimmed.startsWith('*')) return line

    let result = line

    // ── 1. Static attribute values:  attr="中文"  or  attr='中文'
    //    Handles both exact key lookup and partial match (mixed strings like "8-20位，包含字母和数字")
    const replaceAttrVal = (val) => {
      const trimmed = val.trim()
      // Exact match first
      const exactKey = getKey(trimmed)
      if (exactKey) return `$t('${exactKey}')`
      // Partial match: replace Chinese substrings, rebuild as template expression
      let rebuilt = trimmed
      let anyReplaced = false
      for (const zh of sortedZh) {
        if (!rebuilt.includes(zh)) continue
        const key = getKey(zh)
        if (!key) continue
        rebuilt = rebuilt.split(zh).join(`\${$t('${key}')}`)
        anyReplaced = true
      }
      if (anyReplaced) return `\`${rebuilt}\``
      return null
    }

    result = result.replace(/(\s)([\w:@-]+)="([^"{}]*[一-龥][^"{}]*)"/g,
      (match, space, attr, val) => {
        if (attr.startsWith(':') || attr.startsWith('v-')) return match
        const replacement = replaceAttrVal(val)
        if (!replacement) return match
        return `${space}:${attr}="${replacement}"`
      })
    result = result.replace(/(\s)([\w:@-]+)='([^'{}]*[一-龥][^'{}]*)'/g,
      (match, space, attr, val) => {
        if (attr.startsWith(':') || attr.startsWith('v-')) return match
        const replacement = replaceAttrVal(val)
        if (!replacement) return match
        return `${space}:${attr}="${replacement}"`
      })
    // Multi-line attribute (line starts with whitespace then attr="中文")
    result = result.replace(/^(\s+)([\w:@-]+)="([^"{}]*[一-龥][^"{}]*)"/,
      (match, indent, attr, val) => {
        if (attr.startsWith(':') || attr.startsWith('v-')) return match
        const replacement = replaceAttrVal(val)
        if (!replacement) return match
        return `${indent}:${attr}="${replacement}"`
      })
    result = result.replace(/^(\s+)([\w:@-]+)='([^'{}]*[一-龥][^'{}]*)'/,
      (match, indent, attr, val) => {
        if (attr.startsWith(':') || attr.startsWith('v-')) return match
        const replacement = replaceAttrVal(val)
        if (!replacement) return match
        return `${indent}:${attr}="${replacement}"`
      })

    // ── 2. Mustache with string literal: {{ '中文' }} or {{ "中文" }}
    result = result.replace(/\{\{\s*['"]([^'"]*[一-龥][^'"]*)['"]\s*\}\}/g,
      (match, val) => {
        const key = getKey(val.trim())
        if (!key) return match
        return `{{ $t('${key}') }}`
      })

    // ── 3. Ternary inside mustache:  {{ cond ? '中文A' : '中文B' }}
    //    Replace each Chinese string literal inside mustache individually
    result = result.replace(/\{\{([^{}]*[一-龥][^{}]*)\}\}/g, (match, inner) => {
      let replaced = inner
      let anyReplaced = false
      // Replace quoted strings inside
      replaced = replaced.replace(/'([^']*[一-龥][^']*)'/g, (m, val) => {
        const key = getKey(val.trim())
        if (!key) return m
        anyReplaced = true
        return `$t('${key}')`
      })
      replaced = replaced.replace(/"([^"]*[一-龥][^"]*)"/g, (m, val) => {
        const key = getKey(val.trim())
        if (!key) return m
        anyReplaced = true
        return `$t('${key}')`
      })
      if (anyReplaced) return `{{${replaced}}}`
      return match
    })

    // ── 3b. Multi-line ternary continuation lines inside {{ expr }}
    //    Lines like:  ? '中文A'   or   : '中文B' }}
    //    Must run BEFORE step 5 (bare text) to avoid double-wrapping with {{ }}
    if (ZH_RE.test(result)) {
      const tr3b = result.trimStart()
      if (tr3b.startsWith('?') || tr3b.startsWith(':')) {
        result = result.replace(/'([^']*[一-龥][^']*)'/g, (m, val) => {
          const key = getKey(val.trim())
          if (!key) return m
          return `$t('${key}')`
        })
        result = result.replace(/"([^"]*[一-龥][^"]*)"/g, (m, val) => {
          const key = getKey(val.trim())
          if (!key) return m
          return `$t('${key}')`
        })
        if (ZH_RE.test(result)) {
          addReview(relFile, idx + 1, 'TERNARY_UNMAPPED', line.trim(), result.trim())
        }
      }
    }

    // ── 4. Pure text node:  >中文文字<  (no braces, no attrs in this segment)
    //    Match content between > and < that contains Chinese but no {{ }}
    result = result.replace(/>([^<>{}]*[一-龥][^<>{}]*)</g, (match, inner) => {
      let replaced = inner
      let anyReplaced = false
      // Replace each known Chinese phrase in the text node
      for (const zh of sortedZh) {
        if (!replaced.includes(zh)) continue
        const key = getKey(zh)
        if (!key) continue
        replaced = replaced.split(zh).join(`{{ $t('${key}') }}`)
        anyReplaced = true
      }
      if (anyReplaced) return `>${replaced}<`
      return match
    })

    // ── 4b. Chinese text at start of line before sibling element: 中文<span ...
    //    e.g.  "  用户名<span class="required">*</span>"
    if (ZH_RE.test(result) && /[<]/.test(result) && !/\{\{/.test(result)) {
      result = result.replace(/^(\s*)([一-龥][^<>{}\n]*?)(<\w)/g, (match, indent, text, tag) => {
        let replaced = text
        let anyReplaced = false
        for (const zh of sortedZh) {
          if (!replaced.includes(zh)) continue
          const key = getKey(zh)
          if (!key) continue
          replaced = replaced.split(zh).join(`{{ $t('${key}') }}`)
          anyReplaced = true
        }
        if (anyReplaced) return `${indent}${replaced}${tag}`
        return match
      })
    }

    // ── 4c. Chinese text adjacent to mustache in text nodes (no < > on line)
    //    e.g. "{{ count }} 个岗位"  or  "共 {{ count }} 条记录"
    //    Split by mustache blocks so we ONLY touch raw text segments (not inside {{ }})
    if (ZH_RE.test(result) && /\}\}/.test(result) && !/[<>]/.test(result)) {
      const parts = result.split(/(\{\{[^{}]*\}\})/g)
      let anyReplaced = false
      const newParts = parts.map((part, i) => {
        if (i % 2 !== 0 || !ZH_RE.test(part)) return part
        let replaced = part
        for (const zh of sortedZh) {
          if (!replaced.includes(zh)) continue
          const key = getKey(zh)
          if (!key) continue
          replaced = replaced.split(zh).join(`{{ $t('${key}') }}`)
          anyReplaced = true
        }
        return replaced
      })
      if (anyReplaced) result = newParts.join('')
    }

    // ── 4d. Chinese text after closing tag or self-closing at end of line
    //    e.g.  "</i>列表视图"  or  "<span /> 联系方式"  or  "<i /> {{ expr }} 官网"
    if (ZH_RE.test(result) && /</.test(result)) {
      result = result.replace(/((?:<\/[\w:-]+>|\/>\s*))([^<>\n]*[一-龥][^<>\n]*)\s*$/, (match, close, text) => {
        const trimmed = text.trim()
        const parts = trimmed.split(/(\{\{[^{}]*\}\})/g)
        let anyReplaced = false
        const newParts = parts.map((part, i) => {
          if (i % 2 !== 0) return part
          if (!ZH_RE.test(part)) return part
          let replaced = part
          for (const zh of sortedZh) {
            if (!replaced.includes(zh)) continue
            const key = getKey(zh)
            if (!key) continue
            replaced = replaced.split(zh).join(`{{ $t('${key}') }}`)
            anyReplaced = true
          }
          return replaced
        })
        if (!anyReplaced) return match
        const space = text.match(/^\s/) ? ' ' : ''
        return `${close}${space}${newParts.join('')}`
      })
    }

    // ── 4f. Text node between tags with mixed mustache + Chinese
    //    e.g.  <a-tag>{{ count }} 个岗位</a-tag>  or  <span>共找到 <strong>{{ n }}</strong> 位导师</span>
    if (ZH_RE.test(result) && /</.test(result) && /\}\}/.test(result)) {
      result = result.replace(/>([^<>]+)</g, (match, inner) => {
        if (!ZH_RE.test(inner) || !/\{\{/.test(inner)) return match
        const parts = inner.split(/(\{\{[^{}]*\}\})/g)
        let anyReplaced = false
        const newParts = parts.map((part, i) => {
          if (i % 2 !== 0) return part
          if (!ZH_RE.test(part)) return part
          let replaced = part
          for (const zh of sortedZh) {
            if (!replaced.includes(zh)) continue
            const key = getKey(zh)
            if (!key) continue
            replaced = replaced.split(zh).join(`{{ $t('${key}') }}`)
            anyReplaced = true
          }
          return replaced
        })
        if (!anyReplaced) return match
        return `>${newParts.join('')}<`
      })
    }

    // ── 4e. Chinese string literals inside dynamic binding values
    //    e.g.  :locale="{ emptyText: '暂无记录' }"
    if (ZH_RE.test(result) && /:[a-zA-Z]/.test(result)) {
      result = result.replace(/(emptyText:\s*)'([^']*[一-龥][^']*)'/g, (match, prefix, val) => {
        const key = getKey(val.trim())
        if (!key) return match
        return `${prefix}$t('${key}')`
      })
    }

    // ── 5. Bare text line: line is ONLY Chinese (multi-line text node, no > < on same line)
    //    e.g.  "          个人设置"  or  "          退出登录"
    //    Skip ternary continuation lines (? / :) — already handled by step 3b
    if (ZH_RE.test(result) && !/[<>{}]/.test(result) && !/^\s*[?:]/.test(result)) {
      const bareMatch = result.match(/^(\s*)([^<>{}]*[一-龥][^<>{}]*)\s*$/)
      if (bareMatch) {
        const [, indent, text] = bareMatch
        let replaced = text.trim()
        let anyReplaced = false
        for (const zh of sortedZh) {
          if (!replaced.includes(zh)) continue
          const key = getKey(zh)
          if (!key) continue
          replaced = replaced.split(zh).join(`{{ $t('${key}') }}`)
          anyReplaced = true
        }
        if (anyReplaced) result = `${indent}${replaced}`
      }
    }

    // ── 6. Template literals with Chinese (inside :attr="...`中文${}`...")
    //    Flag for review but do basic replacement for pure literals
    if (ZH_RE.test(result)) {
      // Template literal in binding: :attr="`...${var}...中文...`"
      result = result.replace(/:\w[\w-]*="`([^`]*[一-龥][^`]*)`"/g, (match, inner) => {
        if (!inner.includes('${')) {
          // Pure template literal - treat as string
          const key = getKey(inner.trim())
          if (key) return match.replace(`\`${inner}\``, `$t('${key}')`)
        }
        addReview(relFile, idx + 1, 'TMPL_LITERAL', match, '/* TODO: t() with interpolation */')
        return match
      })
    }

    return result
  })

  return processed.join('\n')
}

// ── Script replacements ───────────────────────────────────────────────────────
function processScript(script, relFile, isSetupContext = true) {
  let out = script
  let needsI18n = false
  const lines = out.split('\n')

  const processed = lines.map((line, idx) => {
    // Skip comment lines and import statements
    const trimmed = line.trimStart()
    if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) return line
    if (trimmed.startsWith('import ')) return line
    // Skip TypeScript type declarations (interface / type alias body lines with union types)
    // e.g.  status: '待评价' | '已评价'  — these are type literals, not runtime strings
    if (/:\s*'[^']*'\s*\|/.test(line) || /\|\s*'[^']*'\s*[;,}]/.test(line)) return line
    if (!ZH_RE.test(line)) return line

    let result = line

    // ── A. Template literals with variables → review
    result = result.replace(/`([^`]*[一-龥][^`]*)`/g, (match, inner) => {
      if (inner.includes('${')) {
        addReview(relFile, idx + 1, 'TMPL_LITERAL', match, '/* TODO: t() with named interpolation */')
        return match
      }
      // Pure template literal (no vars)
      const key = getKey(inner.trim())
      if (!key) return match
      needsI18n = true
      return `t('${key}')`
    })

    // ── B. Single-quoted and double-quoted string literals
    //    Skip object keys: '中文': ...  or  "中文": ...
    //    Handles: message: '中文', label: '中文', '中文', Promise.reject('中文')
    result = result.replace(/'([^'\n\\]*[一-龥][^'\n\\]*)'/g, (match, val, offset) => {
      // Check if this is an object key position (followed by colon)
      const afterMatch = result.slice(offset + match.length).trimStart()
      if (afterMatch.startsWith(':') && !afterMatch.startsWith('::')) return match
      const key = getKey(val.trim())
      if (!key) return match
      needsI18n = true
      return `t('${key}')`
    })
    result = result.replace(/"([^"\n\\]*[一-龥][^"\n\\]*)"/g, (match, val, offset) => {
      const afterMatch = result.slice(offset + match.length).trimStart()
      if (afterMatch.startsWith(':') && !afterMatch.startsWith('::')) return match
      const key = getKey(val.trim())
      if (!key) return match
      needsI18n = true
      return `t('${key}')`
    })

    // ── C. Object label/title/text/message values that are still Chinese
    //    (catch-all for mapping objects like { active: '活跃' })
    if (ZH_RE.test(result)) {
      addReview(relFile, idx + 1, 'UNMAPPED', line.trim(), result.trim())
    }

    return result
  })

  return { code: processed.join('\n'), needsI18n }
}

// ── Inject useI18n ────────────────────────────────────────────────────────────
function injectUseI18n(script) {
  if (script.includes('useI18n')) return script // already has it

  const lines = script.split('\n')
  // Find the END of the last import block (handles multi-line imports)
  let lastImportEnd = -1
  let i = 0
  while (i < lines.length) {
    const trimmed = lines[i].trimStart()
    if (trimmed.startsWith('import ')) {
      // Check for multi-line import: "import {" without closing "}" on same line
      if (trimmed.startsWith('import {') && !trimmed.includes('} from') && !trimmed.endsWith('}')) {
        // Advance to the closing "} from ..."
        let j = i + 1
        while (j < lines.length && !lines[j].trimStart().startsWith('}')) j++
        lastImportEnd = j
        i = j + 1
        continue
      }
      lastImportEnd = i
    }
    i++
  }

  const injection = `import { useI18n } from 'vue-i18n'`
  const useInjection = `const { t } = useI18n()`

  if (lastImportEnd >= 0) {
    if (!lines.some(l => l.includes('vue-i18n'))) {
      lines.splice(lastImportEnd + 1, 0, injection)
      lastImportEnd++
    }
    let insertAt = lastImportEnd + 1
    while (insertAt < lines.length && (lines[insertAt].trimStart().startsWith('import ') || lines[insertAt].trim() === '')) {
      insertAt++
    }
    if (!lines.some(l => l.includes('const { t }') || l.includes('const {t}'))) {
      lines.splice(insertAt, 0, useInjection)
    }
  }
  return lines.join('\n')
}

// ── Process a single .vue file ────────────────────────────────────────────────
function processVueFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8')
  const relFile = path.relative(ROOT, filePath).replace(/\\/g, '/')

  if (!ZH_RE.test(content)) return false

  const sec = splitVue(content)

  let changed = false

  if (sec.hasTemplate) {
    const newTmpl = processTemplate(sec.template, relFile)
    if (newTmpl !== sec.template) { sec.template = newTmpl; changed = true }
  }

  if (sec.hasScript) {
    const isSetup = sec.scriptOpen.includes('setup')
    const { code, needsI18n } = processScript(sec.script, relFile, isSetup)
    if (code !== sec.script) { sec.script = code; changed = true }
    if (needsI18n && isSetup) {
      sec.script = injectUseI18n(sec.script)
      changed = true
    } else if (needsI18n && !isSetup) {
      addReview(relFile, 0, 'NO_SETUP_CTX', sec.scriptOpen, 'Inject t() manually — not a <script setup> file')
    }
  }

  if (!changed) return false

  // Reassemble — use index-based splice for template (avoids nested <template> regex issue)
  let out = content
  if (sec.hasTemplate && sec.tmplStart >= 0) {
    out = out.slice(0, sec.tmplStart)
      + sec.templateOpen + sec.template + sec.templateClose
      + out.slice(sec.tmplEnd)
  }
  if (sec.hasScript) {
    out = out.replace(
      /(<script(?:\s[^>]*)?>)([\s\S]*?)(<\/script>)/,
      `${sec.scriptOpen}${sec.script}${sec.scriptClose}`,
    )
  }

  fs.writeFileSync(filePath, out, 'utf8')
  return true
}

// ── Process a single .ts file ─────────────────────────────────────────────────
function processTsFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8')
  const relFile = path.relative(ROOT, filePath).replace(/\\/g, '/')

  if (!ZH_RE.test(content)) return false
  // Skip test files
  if (relFile.includes('__tests__') || relFile.includes('.spec.') || relFile.includes('.test.')) return false

  const { code, needsI18n } = processScript(content, relFile, false)
  if (code === content) return false

  // For pure .ts files, flag for review instead of auto-injecting useI18n
  if (needsI18n) {
    addReview(relFile, 0, 'TS_FILE_I18N', '', 'This .ts file uses t() — wrap exports in a function accepting t, or move to .vue')
  }

  fs.writeFileSync(filePath, code, 'utf8')
  return true
}

// ── Walk and process ──────────────────────────────────────────────────────────
function* walkFiles(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name.startsWith('.') || entry.name === 'dist') continue
      yield* walkFiles(path.join(dir, entry.name))
    } else if (/\.(vue|ts)$/.test(entry.name) && !entry.name.endsWith('.d.ts')) {
      yield path.join(dir, entry.name)
    }
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────
let totalChanged = 0
let totalSkipped = 0

for (const target of TARGETS) {
  const pkgDir = path.join(ROOT, target, 'src')
  if (!fs.existsSync(pkgDir)) { console.warn(`  [skip] ${target}: src not found`); continue }

  console.log(`\nProcessing: ${target}`)
  let changed = 0, skipped = 0

  for (const filePath of walkFiles(pkgDir)) {
    const ext = path.extname(filePath)
    const wasChanged = ext === '.vue' ? processVueFile(filePath) : processTsFile(filePath)
    if (wasChanged) changed++
    else skipped++
  }

  console.log(`  Changed: ${changed}  Unchanged: ${skipped}`)
  totalChanged += changed
  totalSkipped += skipped
}

// ── Write review list ─────────────────────────────────────────────────────────
const REVIEW_OUT = path.resolve(__dirname, 'review-list.csv')
const header = 'file,line,category,original,suggested\n'
const rows = reviewItems.map(r => {
  const f = (s) => `"${String(s ?? '').replace(/"/g, '""').slice(0, 200)}"`
  return [f(r.file), r.line, r.category, f(r.original), f(r.suggested)].join(',')
}).join('\n')
fs.writeFileSync(REVIEW_OUT, header + rows, 'utf8')

console.log(`\n✓ Done`)
console.log(`  Total changed : ${totalChanged} files`)
console.log(`  Review items  : ${reviewItems.length} (see scripts/review-list.csv)`)
