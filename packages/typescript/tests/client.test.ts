import { describe, expect, test } from 'bun:test'
import {
  AvailKitError,
  createClient,
  type BookingCreateRequestBody,
} from '../src/index.js'

const json = (data: unknown, status = 200, headers?: HeadersInit): Response =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  })

describe('createClient', () => {
  test('applies auth, rewrites the base URL, and preserves request options', async () => {
    let observedUrl = ''
    let observedHeaders = new Headers()
    const client = createClient({
      apiKey: 'ak_test_example',
      baseUrl: 'https://sandbox.example.test/v1',
      fetch: async (input, init) => {
        observedUrl = String(input)
        observedHeaders = new Headers(init?.headers)
        return json({ id: 'ws_123', name: 'Example' })
      },
    })

    const result = await client.getWorkspace({
      headers: { Authorization: 'Bearer ignored', 'X-Trace': 'trace-1' },
    })

    expect(result.status).toBe(200)
    expect(observedUrl).toBe('https://sandbox.example.test/v1/workspace/')
    expect(observedHeaders.get('authorization')).toBe('Bearer ak_test_example')
    expect(observedHeaders.get('x-trace')).toBe('trace-1')
  })

  test('supports a representative generated booking operation without a fetch argument', async () => {
    let observedMethod = ''
    let observedBody = ''
    const client = createClient({
      apiKey: 'ak_test_example',
      fetch: async (_input, init) => {
        observedMethod = init?.method ?? ''
        observedBody = String(init?.body)
        return json({ id: 'bkg_123', status: 'confirmed' }, 201)
      },
    })
    const booking = {
      customer_id: 'cus_123',
      service_id: 'svc_123',
      starts_at: '2026-07-20T10:00:00.000Z',
    } as BookingCreateRequestBody

    const result = await client.createBooking(booking)

    expect(result.status).toBe(201)
    if (result.status !== 201) throw new Error(`Unexpected status ${result.status}`)
    expect(result.data.id).toBe('bkg_123')
    expect(observedMethod).toBe('POST')
    expect(JSON.parse(observedBody)).toEqual(booking)
  })

  test('throws AvailKitError with structured API error context', async () => {
    const client = createClient({
      apiKey: 'bad-key',
      fetch: async () => json(
        { error: { code: 'unauthorized', message: 'Invalid API key', details: { reason: 'revoked' } } },
        401,
        { 'X-Request-Id': 'req_123' },
      ),
    })

    try {
      await client.getWorkspace()
      throw new Error('Expected getWorkspace to fail')
    } catch (error) {
      expect(error).toBeInstanceOf(AvailKitError)
      expect(error).toMatchObject({
        code: 'unauthorized',
        details: { reason: 'revoked' },
        message: 'Invalid API key',
        requestId: 'req_123',
        status: 401,
      })
    }
  })

  test('wraps transport failures consistently', async () => {
    const cause = new Error('offline')
    const client = createClient({ apiKey: 'ak_test_example', fetch: async () => { throw cause } })
    await expect(client.getWorkspace()).rejects.toMatchObject({
      cause,
      name: 'AvailKitError',
      status: undefined,
    })
  })
})
