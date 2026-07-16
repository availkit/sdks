import * as generated from './generated.js'

const DEFAULT_BASE_URL = 'https://api.availkit.com/'

type GeneratedModule = typeof generated
type OperationName = {
  [Name in keyof GeneratedModule]-?: GeneratedModule[Name] extends (...args: never[]) => Promise<unknown>
    ? Name
    : never
}[keyof GeneratedModule]

type BindFetch<Operation> = Operation extends (
  ...args: [...infer Args, fetchFn?: typeof globalThis.fetch]
) => infer Result
  ? (...args: Args) => Result
  : never

export type AvailKitClient = {
  readonly [Name in OperationName]: BindFetch<GeneratedModule[Name]>
}

export type Fetch = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>

export interface CreateClientOptions {
  apiKey: string
  baseUrl?: string
  fetch?: Fetch
}

export interface AvailKitErrorOptions {
  cause?: unknown
  code?: string
  details?: unknown
  requestId?: string
  response?: unknown
  status?: number
}

export class AvailKitError extends Error {
  readonly code?: string
  readonly details?: unknown
  readonly requestId?: string
  readonly response?: unknown
  readonly status?: number

  constructor(message: string, options: AvailKitErrorOptions = {}) {
    super(message, { cause: options.cause })
    this.name = 'AvailKitError'
    this.code = options.code
    this.details = options.details
    this.requestId = options.requestId
    this.response = options.response
    this.status = options.status
  }
}

type GeneratedOperation = (...args: unknown[]) => Promise<unknown>
type GeneratedResponse = { data: unknown; headers: Headers; status: number }

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

const readString = (record: Record<string, unknown>, key: string): string | undefined =>
  typeof record[key] === 'string' ? record[key] : undefined

const toApiError = (response: GeneratedResponse): AvailKitError => {
  const body = isRecord(response.data) ? response.data : {}
  const payload = isRecord(body.error) ? body.error : body
  const message = readString(payload, 'message') ?? `AvailKit API request failed with status ${response.status}`
  return new AvailKitError(message, {
    code: readString(payload, 'code'),
    details: payload.details,
    requestId: response.headers.get('x-request-id') ?? undefined,
    response: response.data,
    status: response.status,
  })
}

const asBaseUrl = (value: string): URL => {
  const url = new URL(value)
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new TypeError('baseUrl must use http or https')
  }
  url.hash = ''
  url.search = ''
  if (!url.pathname.endsWith('/')) url.pathname += '/'
  return url
}

export const createClient = (options: CreateClientOptions): AvailKitClient => {
  if (!options.apiKey.trim()) throw new TypeError('apiKey must not be empty')
  const baseUrl = asBaseUrl(options.baseUrl ?? DEFAULT_BASE_URL)
  const fetchImpl = options.fetch ?? globalThis.fetch
  if (typeof fetchImpl !== 'function') throw new TypeError('A fetch implementation is required')

  const clientFetch: Fetch = async (input, init) => {
    const request = input instanceof Request ? input : undefined
    const original = new URL(request?.url ?? String(input))
    const target = new URL(original.pathname.replace(/^\/+/, ''), baseUrl)
    target.search = original.search
    const headers = new Headers(request?.headers)
    new Headers(init?.headers).forEach((value, key) => headers.set(key, value))
    headers.set('Authorization', `Bearer ${options.apiKey}`)

    try {
      if (request) return await fetchImpl(new Request(target, request), { ...init, headers })
      return await fetchImpl(target, { ...init, headers })
    } catch (cause) {
      if (cause instanceof AvailKitError) throw cause
      throw new AvailKitError('AvailKit request failed before receiving a response', { cause })
    }
  }

  const client: Record<string, GeneratedOperation> = {}
  for (const [name, value] of Object.entries(generated)) {
    if (typeof value !== 'function' || name.endsWith('Url')) continue
    const operation = value as GeneratedOperation
    client[name] = async (...args: unknown[]) => {
      const callArgs = [...args]
      while (callArgs.length < operation.length - 1) callArgs.push(undefined)
      callArgs.push(clientFetch as typeof globalThis.fetch)
      try {
        const result = await operation(...callArgs)
        if (isRecord(result) && typeof result.status === 'number' && result.status >= 400) {
          throw toApiError(result as GeneratedResponse)
        }
        return result
      } catch (cause) {
        if (cause instanceof AvailKitError) throw cause
        throw new AvailKitError('AvailKit request failed before receiving a valid response', { cause })
      }
    }
  }
  return Object.freeze(client) as AvailKitClient
}
