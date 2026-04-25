/**
 * PageHeader 三端共用页头组件（M0.5 Phase 2.1）
 *
 * 抽取背景：Asst + Admin 现有 PageHeader.vue 实测一字不差（仅 margin-bottom 极小差异），
 * Mentor/LM 内嵌相同 BEM 结构，三端 Asst/LM/Mentor + Vue3 admin 共性 100%。
 *
 * 详见 docs/architecture/shared-infrastructure/m0.5-step1-pageheader-extraction-plan.md
 */

export { default as PageHeader } from './PageHeader.vue'
