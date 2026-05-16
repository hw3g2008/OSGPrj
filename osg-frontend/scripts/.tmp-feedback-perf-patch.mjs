import { readFileSync, writeFileSync } from 'node:fs'
const zh = JSON.parse(readFileSync('packages/shared/src/i18n/locales/zh/admin.json','utf8'))
const en = JSON.parse(readFileSync('packages/shared/src/i18n/locales/en/admin.json','utf8'))

zh.teaching.feedback.filter.perf = {
  excellent: '优秀', good: '良好', average: '一般', needsImprovement: '需改进'
}
en.teaching.feedback.filter.perf = {
  excellent: 'Excellent', good: 'Good', average: 'Average', needsImprovement: 'Needs Improvement'
}

writeFileSync('packages/shared/src/i18n/locales/zh/admin.json', JSON.stringify(zh, null, 2), 'utf8')
writeFileSync('packages/shared/src/i18n/locales/en/admin.json', JSON.stringify(en, null, 2), 'utf8')
console.log('done')
