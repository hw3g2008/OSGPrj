#!/usr/bin/env node
/**
 * Dump backend i18n_key labels from sys_role / sys_menu / sys_dict_data
 * into admin.json bundles.
 *
 *  - zh side: uses the existing Chinese label as canonical value
 *  - en side: keeps existing translation, otherwise leaves zh as placeholder
 *             so a translator (or LLM) can fill it in later
 *
 * Usage:  node scripts/dump-backend-i18n.mjs
 *
 * Idempotent — running again only adds missing keys.
 */
import mysql from 'mysql2/promise'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')

const DB = {
  host: process.env.GATE_DB_HOST || '47.94.213.128',
  port: Number(process.env.GATE_DB_PORT || 23306),
  user: process.env.GATE_DB_USER || 'ruoyi',
  password: process.env.GATE_DB_PASSWORD || 'app123456',
  database: process.env.GATE_DB_NAME || 'ry-vue',
  charset: 'utf8mb4',
}

const ZH_PATH = path.resolve(ROOT, 'packages/shared/src/i18n/locales/zh/admin.json')
const EN_PATH = path.resolve(ROOT, 'packages/shared/src/i18n/locales/en/admin.json')

async function main() {
  const conn = await mysql.createConnection(DB)
  try {
    const zh = JSON.parse(fs.readFileSync(ZH_PATH, 'utf8'))
    const en = JSON.parse(fs.readFileSync(EN_PATH, 'utf8'))

    const upsert = (obj, ns, key, value) => {
      if (!key) return false
      if (!obj[ns]) obj[ns] = {}
      if (obj[ns][key] !== undefined) return false
      obj[ns][key] = value
      return true
    }

    let added = { zh: 0, en: 0 }

    // sys_role: i18n_key, remark_i18n_key
    const [roles] = await conn.execute(
      "SELECT role_name, remark, i18n_key, remark_i18n_key FROM sys_role WHERE del_flag='0' AND i18n_key IS NOT NULL"
    )
    for (const r of roles) {
      if (upsert(zh, 'role', r.i18n_key, r.role_name)) added.zh++
      if (upsert(en, 'role', r.i18n_key, r.role_name)) added.en++
      if (r.remark_i18n_key) {
        if (upsert(zh, 'role', r.remark_i18n_key, r.remark || r.role_name)) added.zh++
        if (upsert(en, 'role', r.remark_i18n_key, r.remark || r.role_name)) added.en++
      }
    }

    // sys_menu
    const [menus] = await conn.execute(
      "SELECT menu_name, i18n_key FROM sys_menu WHERE status='0' AND i18n_key IS NOT NULL"
    )
    for (const m of menus) {
      if (upsert(zh, 'menu', m.i18n_key, m.menu_name)) added.zh++
      if (upsert(en, 'menu', m.i18n_key, m.menu_name)) added.en++
    }

    // sys_dict_data
    const [dicts] = await conn.execute(
      "SELECT dict_label, i18n_key FROM sys_dict_data WHERE status='0' AND i18n_key IS NOT NULL"
    )
    for (const d of dicts) {
      if (upsert(zh, 'dict', d.i18n_key, d.dict_label)) added.zh++
      if (upsert(en, 'dict', d.i18n_key, d.dict_label)) added.en++
    }

    fs.writeFileSync(ZH_PATH, JSON.stringify(zh, null, 2) + '\n', 'utf8')
    fs.writeFileSync(EN_PATH, JSON.stringify(en, null, 2) + '\n', 'utf8')
    console.log(`Added ${added.zh} zh keys, ${added.en} en keys`)
    console.log(`Wrote ${ZH_PATH}`)
    console.log(`Wrote ${EN_PATH}`)
  } finally {
    await conn.end()
  }
}

main().catch((e) => { console.error(e); process.exit(1) })
