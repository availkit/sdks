import { mkdir, mkdtemp, readFile, rm } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { spawn } from 'node:child_process'

type SourceMetadata = {
  apiAsset: string
  apiAssetUrl: string
  apiSha256: string
  generator: string
  generatorConfigSha256: string
  generatorVersion: string
}

const sourcePath = resolve('packages/typescript/sdk-source.json')
const source = JSON.parse(await readFile(sourcePath, 'utf8')) as SourceMetadata
const canonicalConfig = {
  availkit: {
    input: { target: '<verified-openapi>' },
    output: {
      target: 'packages/typescript/src/generated.ts',
      mode: 'single',
      client: 'fetch',
      clean: true,
      baseUrl: 'https://api.availkit.com',
      override: {
        fetch: {
          includeHttpResponseReturnType: true,
          forceSuccessResponse: false,
          useRuntimeFetcher: true,
        },
      },
    },
  },
} as const
const configDigest = new Bun.CryptoHasher('sha256')
  .update(JSON.stringify(canonicalConfig))
  .digest('hex')
if (source.generator !== 'orval' || source.generatorVersion !== '8.22.0') {
  throw new Error('sdk-source.json must pin Orval 8.22.0')
}
if (source.generatorConfigSha256 !== configDigest) {
  throw new Error(`Generator config digest mismatch: expected ${source.generatorConfigSha256}, got ${configDigest}`)
}

const localInput = process.env.OPENAPI_PATH
const input = localInput
  ? resolve(localInput)
  : resolve('.tmp/contracts', source.apiAsset)
let contract: Uint8Array
if (localInput) {
  contract = await readFile(input)
} else {
  const response = await fetch(source.apiAssetUrl, { redirect: 'follow' })
  if (!response.ok) throw new Error(`Failed to download ${source.apiAssetUrl}: HTTP ${response.status}`)
  contract = new Uint8Array(await response.arrayBuffer())
  await mkdir(dirname(input), { recursive: true })
  await Bun.write(input, contract)
}
const contractDigest = new Bun.CryptoHasher('sha256').update(contract).digest('hex')
if (contractDigest !== source.apiSha256) {
  throw new Error(`OpenAPI digest mismatch: expected ${source.apiSha256}, got ${contractDigest}`)
}

const target = resolve(process.env.GENERATED_OUTPUT ?? 'packages/typescript/src/generated.ts')
await mkdir(dirname(target), { recursive: true })
const config = resolve('.tmp/orval.config.mjs')
await mkdir(dirname(config), { recursive: true })
// Orval clean:true removes the target directory, including handwritten seams.
// Generate in isolation and replace only the intended artifact after success.
const generationDirectory = await mkdtemp(resolve('.tmp/orval-output-'))
const generatedTarget = resolve(generationDirectory, 'generated.ts')
const runtimeConfig = {
  availkit: {
    input: { target: input },
    output: { ...canonicalConfig.availkit.output, target: generatedTarget },
  },
}
try {
  await Bun.write(config, `export default ${JSON.stringify(runtimeConfig, null, 2)}\n`)
  const child = spawn('bun', ['run', 'orval', '--config', config], { stdio: 'inherit' })
  const code = await new Promise<number>((ok, fail) => { child.once('error', fail); child.once('close', value => ok(value ?? 1)) })
  if (code !== 0) throw new Error(`Orval exited with ${code}`)
  const output = await readFile(generatedTarget, 'utf8')
  if (/generatedAt|timestamp/i.test(output)) throw new Error('Generated output contains a timestamp')
  await Bun.write(target, output)
} finally {
  await rm(generationDirectory, { recursive: true, force: true })
}
