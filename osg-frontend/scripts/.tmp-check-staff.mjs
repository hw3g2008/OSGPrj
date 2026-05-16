import { readFileSync, readdirSync } from 'fs'
import { join } from 'path'

const targetDir = 'packages/admin/src/views/users/staff'
let total = 0

function scanDir(dir) {
  const entries = readdirSync(dir, { withFileTypes: true })
  for (const e of entries) {
    const full = join(dir, e.name)
    if (e.isDirectory()) {
      scanDir(full)
    } else if (/\.(vue|ts)$/.test(e.name)) {
      const lines = readFileSync(full, 'utf8').split('\n')
      lines.forEach((line, idx) => {
        if (/i18n-skip-line/.test(line)) return
        if (/[一-鿿]/.test(line)) {
          console.log(full, 'L' + (idx + 1) + ':', line.trim().slice(0, 120))
          total++
        }
      })
    }
  }
}

scanDir(targetDir)
console.log('Total hits:', total)
