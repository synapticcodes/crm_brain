type UnknownRecord = Record<string, unknown>

function coerceString(value: unknown): string {
  if (typeof value === 'string') return value.trim()
  if (value == null) return ''
  return String(value).trim()
}

function tryParseJson(input: string): unknown | null {
  try {
    return JSON.parse(input)
  } catch {
    return null
  }
}

export function normalizeAssistantText(raw: string): string {
  if (!raw) return ''
  const cleaned = raw.replace(/```json|```/gi, '').trim()
  let parsed = tryParseJson(cleaned)

  if (!parsed) {
    const start = cleaned.indexOf('{')
    const end = cleaned.lastIndexOf('}')
    if (start !== -1 && end > start) {
      parsed = tryParseJson(cleaned.slice(start, end + 1))
    }
  }

  if (parsed == null) return cleaned
  if (typeof parsed === 'string') return parsed.trim()
  if (Array.isArray(parsed)) {
    return parsed.map((item) => coerceString(item)).filter(Boolean).join('\n')
  }

  const record = parsed as UnknownRecord
  const subject = coerceString(record.subject)
  const body = coerceString(record.body)
  if (subject || body) {
    return [subject ? `Assunto: ${subject}` : null, body || null]
      .filter(Boolean)
      .join('\n\n')
  }

  const preferredKeys = ['response', 'answer', 'text', 'content', 'output', 'result']
  for (const key of preferredKeys) {
    const value = record[key]
    if (typeof value === 'string') return value.trim()
    if (Array.isArray(value)) {
      return value.map((item) => coerceString(item)).filter(Boolean).join('\n')
    }
  }

  const entries = Object.entries(record)
    .map(([key, value]) => {
      const text = coerceString(value)
      return text ? `${key}: ${text}` : ''
    })
    .filter(Boolean)

  return entries.length ? entries.join('\n') : cleaned
}
