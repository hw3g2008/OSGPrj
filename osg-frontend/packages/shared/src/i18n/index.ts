import { createI18n } from 'vue-i18n'

// zh modules
import zhCommon from './locales/zh/common.json'
import zhAdmin from './locales/zh/admin.json'
import zhStudent from './locales/zh/student.json'
import zhMentor from './locales/zh/mentor.json'
import zhLeadMentor from './locales/zh/lead-mentor.json'
import zhAssistant from './locales/zh/assistant.json'

// en modules
import enCommon from './locales/en/common.json'
import enAdmin from './locales/en/admin.json'
import enStudent from './locales/en/student.json'
import enMentor from './locales/en/mentor.json'
import enLeadMentor from './locales/en/lead-mentor.json'
import enAssistant from './locales/en/assistant.json'

const zh = {
  common: zhCommon,
  admin: zhAdmin,
  student: zhStudent,
  mentor: zhMentor,
  leadMentor: zhLeadMentor,
  assistant: zhAssistant,
}

const en = {
  common: enCommon,
  admin: enAdmin,
  student: enStudent,
  mentor: enMentor,
  leadMentor: enLeadMentor,
  assistant: enAssistant,
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
  messages: { zh, en },
})

export type SupportedLocale = 'zh' | 'en'

export function setLocale(lang: SupportedLocale) {
  i18n.global.locale.value = lang
  if (typeof localStorage !== 'undefined') localStorage.setItem(STORAGE_KEY, lang)
}
