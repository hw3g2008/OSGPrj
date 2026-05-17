import { createI18n } from 'vue-i18n'

// zh modules
import zhCommon from './locales/zh/common.json'
import zhAdmin from './locales/zh/admin.json'
import zhStudent from './locales/zh/student.json'
import zhMentor from './locales/zh/mentor.json'
import zhLeadMentor from './locales/zh/lead-mentor.json'
import zhAssistant from './locales/zh/assistant.json'
import zhDictText from './locales/zh/dictText.json'

// en modules
import enCommon from './locales/en/common.json'
import enAdmin from './locales/en/admin.json'
import enStudent from './locales/en/student.json'
import enMentor from './locales/en/mentor.json'
import enLeadMentor from './locales/en/lead-mentor.json'
import enAssistant from './locales/en/assistant.json'
import enDictText from './locales/en/dictText.json'

// 把 common.json 里的 `legacy.*` 同时铺平到根级 namespace。
// 后端 sys_dict_data.i18n_key 存的是 flat key（如 `dict_data_major_consulting`），
// 而 bundled 文案位于 `common.legacy.dict_data_major_consulting`；
// 这里 spread `legacy` 让 `t('dict_data_major_consulting')` 可直接命中。
const zhLegacy = (zhCommon as any)?.legacy ?? {}
const enLegacy = (enCommon as any)?.legacy ?? {}

const zh = {
  ...zhLegacy,
  common: zhCommon,
  admin: zhAdmin,
  student: zhStudent,
  mentor: zhMentor,
  leadMentor: zhLeadMentor,
  assistant: zhAssistant,
  dictText: zhDictText,
}

const en = {
  ...enLegacy,
  common: enCommon,
  admin: enAdmin,
  student: enStudent,
  mentor: enMentor,
  leadMentor: enLeadMentor,
  assistant: enAssistant,
  dictText: enDictText,
}

const STORAGE_KEY = 'osg_lang'

function resolveInitialLocale(): 'zh' | 'en' {
  if (typeof localStorage !== 'undefined') {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'zh' || stored === 'en') return stored
  }
  if (typeof navigator !== 'undefined' && navigator.language) {
    return navigator.language.toLowerCase().startsWith('zh') ? 'zh' : 'en'
  }
  return 'zh'
}

export const i18n = createI18n({
  legacy: false,
  locale: resolveInitialLocale(),
  fallbackLocale: 'zh',
  // 显式 widen 为 Record<string, any>，避免 spread 3950 个 legacy key 触发
  // TS2589（Type instantiation is excessively deep）—— vue-i18n 的 t() 类型推断
  // 会沿 messages 形状深度展开，spread 后 union 体积过大。
  messages: { zh, en } as unknown as Record<string, Record<string, any>>,
})

export type SupportedLocale = 'zh' | 'en'

function syncDocumentLang(lang: SupportedLocale) {
  if (typeof document !== 'undefined' && document.documentElement) {
    document.documentElement.lang = lang
  }
}

syncDocumentLang(i18n.global.locale.value as SupportedLocale)

export function setLocale(lang: SupportedLocale) {
  i18n.global.locale.value = lang
  if (typeof localStorage !== 'undefined') localStorage.setItem(STORAGE_KEY, lang)
  syncDocumentLang(lang)
  rebuildReverseMap()
}

/**
 * 反向映射: zh 文本 -> i18n key 路径
 * 用于 axios response interceptor 自动翻译 backend 返回的 dict_label 等文案。
 * 仅当 locale=en 时启用；zh 时直接 passthrough。
 */
let zhToKey: Map<string, string> = new Map()

function buildReverseMapFrom(messages: any, prefix = '', out = new Map<string, string>()): Map<string, string> {
  for (const k of Object.keys(messages || {})) {
    const v = messages[k]
    const path = prefix ? `${prefix}.${k}` : k
    if (typeof v === 'string') {
      // Only register if value is Chinese-only or mixed (skip pure English)
      if (/[一-鿿]/.test(v) && !out.has(v)) out.set(v, path)
    } else if (typeof v === 'object' && v !== null) {
      buildReverseMapFrom(v, path, out)
    }
  }
  return out
}

function rebuildReverseMap() {
  zhToKey = buildReverseMapFrom(i18n.global.messages.value.zh)
}
rebuildReverseMap()

/**
 * Convenience: translate a single zh string by reverse-map lookup.
 *
 * IMPORTANT: 仅用在已知是 UI 文案的 string 上（如 router meta title、COMING_SOON_TOAST 等常量），
 * **禁止**用作 axios response interceptor 或对整个 API response 递归扫描 —— 会误翻业务/用户数据。
 */
export function localizeText(s: string | undefined | null): string {
  if (s == null) return s as any
  if (i18n.global.locale.value === 'zh' || typeof s !== 'string') return s
  const key = zhToKey.get(s)
  return key ? (i18n.global.t as any)(key) : s
}

/**
 * 把 manifest 中的 keyPath 点号路径展开成嵌套对象，便于 vue-i18n#mergeLocaleMessage 合并。
 * 例如 keyPath="dictText.coaching_type.interview", value="Interview" 展开为：
 *   { dictText: { coaching_type: { interview: "Interview" } } }
 */
function expandKeyPath(items: ReadonlyArray<{ keyPath: string; value: string }>): Record<string, any> {
  const out: Record<string, any> = {}
  for (const { keyPath, value } of items) {
    if (!keyPath || typeof keyPath !== 'string') continue
    const segments = keyPath.split('.').filter(Boolean)
    if (segments.length === 0) continue
    let cursor: any = out
    for (let i = 0; i < segments.length - 1; i++) {
      const seg = segments[i]
      if (typeof cursor[seg] !== 'object' || cursor[seg] === null) cursor[seg] = {}
      cursor = cursor[seg]
    }
    cursor[segments[segments.length - 1]] = value
  }
  return out
}

/**
 * 把覆盖清单合并到当前 i18n messages 之上，并刷新反向映射表。
 * 由前端启动时调用，传入 fetchI18nManifest 的返回值。
 */
export function applyOverrideManifest(
  lang: SupportedLocale,
  items: ReadonlyArray<{ keyPath: string; value: string }>,
): void {
  if (!items || items.length === 0) return
  const payload = expandKeyPath(items)
  i18n.global.mergeLocaleMessage(lang, payload as any)
  rebuildReverseMap()
}

/**
 * 启动时一次性拉取覆盖清单并合入。失败静默；使用动态 import 打断
 * shared/api ↔ shared/i18n 之间的循环依赖。每个 app 的入口可显式 await，
 * 这里同时也以 fire-and-forget 形式默认触发一次（适用于尚未显式 await 的 app）。
 */
export async function bootstrapI18nOverride(lang?: SupportedLocale): Promise<void> {
  const target = (lang || (i18n.global.locale.value as SupportedLocale)) as SupportedLocale
  try {
    const mod = await import('../api/i18nOverride')
    const resp = await mod.fetchI18nManifest(target)
    applyOverrideManifest(target, resp.items)
  } catch {
    // 静默：覆盖拉取失败不影响前端启动
  }
}

// fire-and-forget：在浏览器环境下默认触发一次，避免每个 app 都重复布线。
if (typeof window !== 'undefined') {
  void bootstrapI18nOverride()
}
