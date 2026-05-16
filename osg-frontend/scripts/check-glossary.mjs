#!/usr/bin/env node
// Glossary compliance guard for vue-i18n locale files.
//
// Usage:
//   node osg-frontend/scripts/check-glossary.mjs --staged   # check git-staged locale files (worker pre-commit gate)
//   node osg-frontend/scripts/check-glossary.mjs --all      # check entire workspace locales
//
// Sources of truth (priority): i18n-glossary.md > scripts/terms.glossary.json
//
// Two checks per (zh, en) sibling locale pair:
//   1. en value must not contain glossary-banned translations (Tutor/Instructor/CV/...)
//   2. when zh value mentions a glossary zh-term, the en value must contain the mandated en term
//
// `legacy.*` namespace (auto-migrated from old flat keys) is excluded from --all scans because it
// is pre-existing baseline that workers replace incrementally. --staged still flags any new/changed
// legacy lines so accidental regressions get caught.
//
// Exit: 0 ok, 1 violations found, 2 internal error.

import { execSync } from 'node:child_process'
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')               // osg-frontend
const REPO_ROOT = path.resolve(ROOT, '..')               // OSGPrj
const GLOSSARY_MD = path.join(REPO_ROOT, 'i18n-glossary.md')
const LOCALES_DIR = path.join(ROOT, 'packages/shared/src/i18n/locales')

const MODE = process.argv[2] || '--staged'
if (!['--staged', '--all'].includes(MODE)) {
  console.error(`unknown mode: ${MODE}. use --staged or --all`)
  process.exit(2)
}

// -------- Parse glossary --------
function parseGlossary() {
  const md = readFileSync(GLOSSARY_MD, 'utf8')
  const mandatory = {} // zh-term -> mandated en
  const banned = {}    // zh-term -> [banned en variants]
  for (const line of md.split(/\r?\n/)) {
    // | 中文（可能 / 分隔） | **English** | banned1 / banned2 / ... |
    const m = line.match(/^\|\s*([^|]+?)\s*\|\s*\*\*([^*]+?)\*\*\s*\|\s*([^|]*?)\s*\|?\s*$/)
    if (!m) continue
    const zhRaw = m[1].trim()
    const en = m[2].trim()
    const bannedRaw = m[3].trim()
    if (!zhRaw || !en) continue
    if (/^中文$/.test(zhRaw) || /^-+$/.test(zhRaw)) continue
    const variants = zhRaw.split(/\s*\/\s*/).filter(Boolean)
    const bannedList = bannedRaw && bannedRaw !== '—'
      ? bannedRaw.split(/\s*\/\s*/).map((s) => s.replace(/（[^）]*）/g, '').trim()).filter((s) => s && s !== '—')
      : []
    for (const zh of variants) {
      mandatory[zh] = en
      banned[zh] = bannedList
    }
  }
  return { mandatory, banned }
}

const { mandatory, banned } = parseGlossary()

// Sort zh terms longest-first to prevent shorter terms shadowing longer phrases.
const ZH_TERMS_LONG_FIRST = Object.keys(mandatory).sort((a, b) => b.length - a.length)

// Flatten nested locale JSON into [{ keyPath, value }] entries.
function flatten(obj, prefix = '', out = []) {
  for (const [k, v] of Object.entries(obj || {})) {
    const kp = prefix ? `${prefix}.${k}` : k
    if (v && typeof v === 'object' && !Array.isArray(v)) flatten(v, kp, out)
    else if (typeof v === 'string') out.push({ keyPath: kp, value: v })
  }
  return out
}

function readLocale(file) {
  try {
    return JSON.parse(readFileSync(file, 'utf8'))
  } catch (e) {
    console.error(`cannot read ${file}: ${e.message}`)
    process.exit(2)
  }
}

// Word-boundary safe substring for English banned terms (avoid false positives like Mentor in Mentorship if banned were Men…)
function containsWord(text, term) {
  // term may contain spaces; build regex with \b on both sides where applicable
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const re = new RegExp(`(^|[^A-Za-z])${escaped}([^A-Za-z]|$)`, 'i')
  return re.test(text)
}

// Map zh module file <-> en sibling
function siblingEn(zhFile) {
  return zhFile.replace(`${path.sep}zh${path.sep}`, `${path.sep}en${path.sep}`)
}
function siblingZh(enFile) {
  return enFile.replace(`${path.sep}en${path.sep}`, `${path.sep}zh${path.sep}`)
}

function listLocaleFiles() {
  const out = []
  for (const lang of ['zh', 'en']) {
    const dir = path.join(LOCALES_DIR, lang)
    if (!existsSync(dir)) continue
    for (const f of readdirSync(dir)) if (f.endsWith('.json')) out.push(path.join(dir, f))
  }
  return out
}

function stagedLocaleFiles() {
  let raw = ''
  try {
    raw = execSync('git diff --cached --name-only --diff-filter=AM', { encoding: 'utf8' })
  } catch (e) {
    console.error(`git diff failed: ${e.message}`)
    process.exit(2)
  }
  const out = []
  for (const line of raw.split(/\r?\n/)) {
    const l = line.trim()
    if (!l) continue
    if (!l.includes('packages/shared/src/i18n/locales/') || !l.endsWith('.json')) continue
    out.push(path.resolve(REPO_ROOT, l))
  }
  return out
}

const violations = []

function checkEntry({ keyPath, zhVal, enVal, file }) {
  if (!enVal || !zhVal) return
  // Skip legacy.* unless in --staged mode (worker may have touched it deliberately)
  if (MODE === '--all' && keyPath.startsWith('legacy.')) return

  // Check 1: en value uses a banned translation tied to a zh term that appears in this entry's zh value
  for (const zhTerm of ZH_TERMS_LONG_FIRST) {
    if (!zhVal.includes(zhTerm)) continue
    const mandatedEn = mandatory[zhTerm]
    const bannedList = banned[zhTerm] || []

    // Build a "stripped" en value that removes mandatory phrases for OTHER zh terms present in this zh string.
    // This prevents false positives when a banned word appears only as part of a different term's mandatory phrase.
    // e.g. zh has both "求职中心" (mandate "Job Search Center") and "岗位" (ban "Job"):
    //      stripping "Job Search Center" from en before checking the "Job" ban avoids the false positive.
    let enForBanCheck = enVal
    for (const otherTerm of ZH_TERMS_LONG_FIRST) {
      if (otherTerm === zhTerm) continue
      if (!zhVal.includes(otherTerm)) continue
      const otherMandated = mandatory[otherTerm]
      if (otherMandated) {
        const escaped = otherMandated.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        enForBanCheck = enForBanCheck.replace(new RegExp(escaped, 'gi'), '')
      }
    }

    for (const bad of bannedList) {
      if (containsWord(enForBanCheck, bad)) {
        violations.push({
          file,
          keyPath,
          rule: 'banned-translation',
          msg: `zh contains "${zhTerm}" but en uses banned "${bad}"; mandated: "${mandatedEn}"`,
          zh: zhVal,
          en: enVal,
        })
      }
    }
    // Check 2: when zh has the term, en SHOULD contain the mandated en form (best-effort, case-insensitive)
    // Skip if mandated has multiple-word phrase that's overly strict; only flag if missing entirely.
    if (mandatedEn && !containsWord(enVal, mandatedEn)) {
      // Avoid flagging trivial phrases (e.g., the zh-term may appear inside a larger compound)
      // We only flag when the en value plausibly should mention the mandated term but uses some variant.
      // Heuristic: only flag if any banned variant present (already handled above), or if zh term is the
      // entire zh value (strong "this entry IS that term"). The second case is the most common one to catch typos.
      if (zhVal.trim() === zhTerm) {
        violations.push({
          file,
          keyPath,
          rule: 'missing-mandatory',
          msg: `zh "${zhTerm}" must map to "${mandatedEn}"`,
          zh: zhVal,
          en: enVal,
        })
      }
    }
  }
}

function checkPair(zhFile, enFile) {
  if (!existsSync(zhFile) || !existsSync(enFile)) return
  const zh = flatten(readLocale(zhFile))
  const en = flatten(readLocale(enFile))
  const enMap = Object.fromEntries(en.map((e) => [e.keyPath, e.value]))
  for (const { keyPath, value } of zh) {
    const enVal = enMap[keyPath]
    if (enVal == null) continue
    checkEntry({ keyPath, zhVal: value, enVal, file: enFile })
  }
}

// Choose which file pairs to check
const targets = MODE === '--staged' ? stagedLocaleFiles() : listLocaleFiles()
const pairs = new Set()
for (const f of targets) {
  if (f.includes(`${path.sep}zh${path.sep}`)) {
    pairs.add(`${f}|${siblingEn(f)}`)
  } else if (f.includes(`${path.sep}en${path.sep}`)) {
    pairs.add(`${siblingZh(f)}|${f}`)
  }
}

for (const p of pairs) {
  const [zhFile, enFile] = p.split('|')
  checkPair(zhFile, enFile)
}

if (violations.length === 0) {
  console.error(`check-glossary [${MODE}]: 0 violations across ${pairs.size} locale pair(s)`)
  process.exit(0)
}

console.error(`check-glossary [${MODE}]: ${violations.length} violation(s)\n`)
for (const v of violations) {
  console.error(`  [${v.rule}] ${path.relative(REPO_ROOT, v.file)} :: ${v.keyPath}`)
  console.error(`    zh: ${v.zh}`)
  console.error(`    en: ${v.en}`)
  console.error(`    -> ${v.msg}\n`)
}
process.exit(1)
