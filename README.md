# AvailKit SDKs

Official, dependency-free SDKs for the AvailKit Booking API.

## TypeScript

`@availkit/client` provides a small handwritten client boundary over the complete generated API surface. It supports Node.js 22.14+, Bun, and modern browsers as one ESM artifact with declarations.

```ts
import { createClient } from '@availkit/client'

const availkit = createClient({ apiKey: process.env.AVAILKIT_API_KEY! })
const { data } = await availkit.getWorkspace()
```

See [`packages/typescript/README.md`](packages/typescript/README.md) for usage and [`docs/contract-releases.md`](docs/contract-releases.md) for the immutable contract flow.

## Development

```sh
bun install --frozen-lockfile
OPENAPI_PATH=/verified/contract.json bun run generate
bun run generate:check
bun run build
bun run typecheck
bun run test
```

The OpenAPI schema is distributed as a GitHub release asset and is never committed to this repository.

## License

Apache-2.0
