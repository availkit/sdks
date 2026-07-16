import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { spawn } from 'node:child_process'
import { resolve } from 'node:path'

const directory = await mkdtemp(resolve('.tmp/generated-check-'))
const candidate = resolve(directory, 'generated.ts')
const child = spawn('bun', ['run', 'scripts/generate.ts'], {
  env: { ...process.env, GENERATED_OUTPUT: candidate },
  stdio: 'inherit',
})
const code = await new Promise<number>((ok, fail) => {
  child.once('error', fail)
  child.once('close', value => ok(value ?? 1))
})
if (code !== 0) throw new Error(`Generation exited with ${code}`)

const [committed, generated] = await Promise.all([
  readFile(resolve('packages/typescript/src/generated.ts'), 'utf8'),
  readFile(candidate, 'utf8'),
])
await rm(directory, { recursive: true, force: true })
if (committed !== generated) {
  throw new Error('Generated client drift detected; run bun run generate and commit generated.ts')
}
