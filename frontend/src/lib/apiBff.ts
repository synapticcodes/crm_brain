type BffFetchOptions = RequestInit & {
  token?: string
}

const baseUrl = import.meta.env.VITE_BFF_BASE_URL as string | undefined

export async function bffFetch<T>(path: string, options: BffFetchOptions = {}): Promise<T> {
  if (!baseUrl) {
    throw new Error('Missing VITE_BFF_BASE_URL env var.')
  }

  const { token, headers, ...rest } = options
  const response = await fetch(`${baseUrl}${path}`, {
    ...rest,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
  })

  const text = await response.text()
  const payload = text ? (JSON.parse(text) as T) : ({} as T)

  if (!response.ok) {
    const message = typeof payload === 'object' && payload !== null && 'error' in payload
      ? String((payload as { error?: string }).error)
      : `BFF request failed (${response.status})`
    throw new Error(message)
  }

  return payload
}
