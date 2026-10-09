# @availkit/client

The official dependency-free TypeScript client for the AvailKit Booking API.

## Install

```sh
bun add @availkit/client
```

## Use

```ts
import { AvailKitError, createClient } from '@availkit/client'

const availkit = createClient({
  apiKey: process.env.AVAILKIT_API_KEY!,
})

try {
  const response = await availkit.getAvailability({
    service_id: 'svc_example',
    date: '2026-07-20',
  })
  if (response.status === 200) {
    console.log(response.data.slots)
  }
} catch (error) {
  if (error instanceof AvailKitError) {
    console.error(error.status, error.code, error.requestId)
  }
}
```

`createClient` accepts:

- `apiKey`: required secret or publishable API key.
- `baseUrl`: optional API origin or path, useful for testing and proxies.
- `fetch`: optional standards-compatible fetch implementation.

Every generated operation is available as a client method. Authentication, base URL routing, and fetch injection are handled by the client, while all generated types, response unions, enum values, operations, and URL helpers remain available as named exports.

Responses preserve the HTTP status in their TypeScript union. Narrow `response.status` before reading fields specific to a successful response. The client throws `AvailKitError` for non-successful HTTP responses.

Use only publishable keys in browser applications. Secret keys belong in trusted server runtimes.

## Runtime support

- Node.js 22.14+ through ESM import or synchronous `require()` interop.
- Bun.
- Modern browsers with native Fetch, Headers, Request, Response, and URL APIs.

The package has no runtime dependencies and ships no polyfills.
