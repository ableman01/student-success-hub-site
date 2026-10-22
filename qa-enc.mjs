import { readFileSync } from 'node:fs'
import { execSync } from 'node:child_process'

const files = ['src/pages/dashboard.vue', 'src/pages/index.vue', 'src/pages/loginPage.vue', 'src/pages/saved-materials.vue', 'src/pages/signup.vue']

for (const file of files) {
  const current = readFileSync(file, 'utf8')
  const head = execSync(`git show HEAD:${file}`, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
  const nonAscii = s => [...new Set([...s].filter(c => c.codePointAt(0) > 127))].sort().join('')
  console.log(`${file}`)
  console.log(`  HEAD non-ascii    : ${nonAscii(head)}`)
  console.log(`  current non-ascii : ${nonAscii(current)}`)
}
