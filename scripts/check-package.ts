import { spawn } from 'node:child_process'
import { resolve } from 'node:path'

const child = spawn('npm', ['pack', '--dry-run', '--json'], {
  cwd: resolve('packages/typescript'),
  stdio: ['ignore', 'pipe', 'inherit'],
})
let stdout = ''
child.stdout.on('data', chunk => { stdout += String(chunk) })
const code = await new Promise<number>((ok, fail) => {
  child.once('error', fail)
  child.once('close', value => ok(value ?? 1))
})
if (code !== 0) throw new Error(`npm pack --dry-run exited with ${code}`)

const result = JSON.parse(stdout) as Array<{ files: Array<{ path: string }> }>
const actual = result[0]?.files.map(file => file.path).sort() ?? []
const expected = [
  'LICENSE',
  'README.md',
  'dist/client.d.ts',
  'dist/generated.d.ts',
  'dist/index.d.ts',
  'dist/index.js',
  'package.json',
  'sdk-source.json',
].sort()
if (JSON.stringify(actual) !== JSON.stringify(expected)) {
  throw new Error(`Package file allowlist mismatch\nExpected: ${expected.join(', ')}\nActual: ${actual.join(', ')}`)
}
