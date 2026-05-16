import { readFileSync, writeFileSync } from 'fs'

function addSkipMarkers(filePath) {
  const src = readFileSync(filePath, 'utf8')
  const lines = src.split('\n')
  let changed = 0

  const result = lines.map((line, idx) => {
    if (/i18n-skip-line/.test(line)) return line
    if (!/[一-鿿]/.test(line)) return line

    // HTML comment lines (<!-- ... -->)
    if (/^\s*<!--/.test(line) && /-->/.test(line)) {
      changed++
      return line.replace(/-->/, 'i18n-skip-line: dev comment -->')
    }

    // Single-line HTML comment that doesn't close (shouldn't happen but guard)
    if (/^\s*<!--/.test(line)) {
      changed++
      return line + ' i18n-skip-line: dev comment'
    }

    // JS block comment /** ... */
    if (/\/\*/.test(line) && /\*\//.test(line)) {
      changed++
      return line.replace(/\*\//, 'i18n-skip-line: dev comment */')
    }

    // JS single-line comment (// ...)
    if (/^\s*\/\//.test(line)) {
      changed++
      return line + ' // i18n-skip-line: dev comment'
    }

    // HTML attribute data-field-name="中文"
    if (/data-field-name=/.test(line)) {
      changed++
      return line + ' <!-- i18n-skip-line: playwright selector -->'
    }

    // Template HTML line that's a pure comment with Chinese but not <!-- format
    // Inline HTML comment (not starting with <!--)
    if (/<!--.*[一-鿿].*-->/.test(line)) {
      changed++
      return line.replace(/-->/, 'i18n-skip-line: dev comment -->')
    }

    return line
  })

  if (changed > 0) {
    writeFileSync(filePath, result.join('\n'), 'utf8')
    console.log(`${filePath}: ${changed} lines updated`)
  } else {
    console.log(`${filePath}: nothing changed`)
  }
}

addSkipMarkers('packages/admin/src/views/users/students/components/AddStudentModal.vue')
addSkipMarkers('packages/admin/src/views/users/students/index.vue')
