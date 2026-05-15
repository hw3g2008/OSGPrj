#!/usr/bin/env node
// Migrate flat zh.json / en.json into the 6-file modular namespace structure:
//   locales/{zh,en}/common.json         (with all current flat keys under `legacy.*`)
//   locales/{zh,en}/admin.json          (empty {})
//   locales/{zh,en}/student.json        (empty {})
//   locales/{zh,en}/mentor.json         (empty {})
//   locales/{zh,en}/lead-mentor.json    (empty {})
//   locales/{zh,en}/assistant.json      (empty {})
//
// Idempotent: re-running rebuilds common.json from the legacy flat files if they still exist,
// otherwise leaves the new structure alone.
//
// Usage: node osg-frontend/scripts/migrate-flat-to-namespace.mjs
import { readFileSync, writeFileSync, existsSync, mkdirSync, rmSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const I18N_DIR = path.resolve(__dirname, '../packages/shared/src/i18n')
const LOCALES_DIR = path.join(I18N_DIR, 'locales')

const LANGS = ['zh', 'en']
const MODULES = ['common', 'admin', 'student', 'mentor', 'lead-mentor', 'assistant']

function readJson(p) {
  return JSON.parse(readFileSync(p, 'utf8'))
}
function writeJson(p, obj) {
  mkdirSync(path.dirname(p), { recursive: true })
  writeFileSync(p, JSON.stringify(obj, null, 2) + '\n', 'utf8')
}

for (const lang of LANGS) {
  const flatFile = path.join(LOCALES_DIR, `${lang}.json`)
  const langDir = path.join(LOCALES_DIR, lang)

  // Build common.json (with legacy.*)
  const common = {
    action: {},
    message: {},
    field: {},
    validation: {},
    tip: {},
    shared: {},
    legacy: {},
  }
  if (existsSync(flatFile)) {
    const flat = readJson(flatFile)
    for (const [k, v] of Object.entries(flat)) {
      common.legacy[k] = v
    }
  }
  writeJson(path.join(langDir, 'common.json'), common)

  // Empty per-end skeletons (don't overwrite if they already exist)
  for (const mod of MODULES) {
    if (mod === 'common') continue
    const p = path.join(langDir, `${mod}.json`)
    if (!existsSync(p)) writeJson(p, {})
  }

  // Remove the old flat file once split (kept zh-en-flat backup in scripts/key-map.json + csv anyway)
  if (existsSync(flatFile)) {
    rmSync(flatFile)
    console.error(`removed ${path.relative(process.cwd(), flatFile)}`)
  }
}

console.error('migrate-flat-to-namespace: done')
