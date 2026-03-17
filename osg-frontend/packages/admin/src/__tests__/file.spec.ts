import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const fileViewPath = path.resolve(__dirname, '../views/resources/files/index.vue')
const newFolderModalPath = path.resolve(__dirname, '../views/resources/files/components/NewFolderModal.vue')
const fileAuthModalPath = path.resolve(__dirname, '../views/resources/files/components/FileAuthModal.vue')
const fileApiPath = path.resolve(__dirname, '../../../shared/src/api/admin/file.ts')

const readSource = (filePath: string) => fs.readFileSync(filePath, 'utf-8')

describe('文件管理页面', () => {
  it('renders the file management shell with type icons and modal fields', () => {
    expect(fs.existsSync(fileViewPath)).toBe(true)
    expect(fs.existsSync(newFolderModalPath)).toBe(true)
    expect(fs.existsSync(fileAuthModalPath)).toBe(true)
    expect(fs.existsSync(fileApiPath)).toBe(true)

    const pageSource = readSource(fileViewPath)
    const newFolderSource = readSource(newFolderModalPath)
    const fileAuthSource = readSource(fileAuthModalPath)

    expect(pageSource).toContain('文件管理')
    expect(pageSource).toContain('管理学习文件')
    expect(pageSource).toContain('New Folder')
    expect(pageSource).toContain('mdi-folder')
    expect(pageSource).toContain('mdi-file-pdf-box')
    expect(pageSource).toContain('mdi-file-word-box')
    expect(newFolderSource).toContain('Folder Name')
    expect(newFolderSource).toContain('2024Fall')
    expect(newFolderSource).toContain('2025Spring')
    expect(fileAuthSource).toContain('全部用户')
    expect(fileAuthSource).toContain('指定班级')
    expect(fileAuthSource).toContain('指定用户')
    expect(fileAuthSource).toContain('添加用户')
  })

  it('wires the page to the real file APIs and auth modal instead of placeholders', () => {
    const pageSource = readSource(fileViewPath)
    const apiSource = readSource(fileApiPath)

    expect(apiSource).toContain('getFileList(')
    expect(apiSource).toContain('createFileFolder(')
    expect(apiSource).toContain('updateFileAuth(')
    expect(pageSource).toContain('getFileList(')
    expect(pageSource).toContain('createFileFolder(')
    expect(pageSource).toContain('updateFileAuth(')
    expect(pageSource).toContain('<NewFolderModal')
    expect(pageSource).toContain('<FileAuthModal')
    expect(pageSource).not.toContain('文件管理开发中')
  })
})
