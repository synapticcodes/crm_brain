export function formatTimestamp(value: string) {
  if (!value) return value
  if (/^\d{2}:\d{2}-\d{4}-\d{2}-\d{2}$/.test(value)) return value

  const separator = value.includes('T') ? 'T' : ' '
  const [datePart, timePartRaw] = value.split(separator)
  if (!datePart || !timePartRaw) return value
  if (!/^\d{4}-\d{2}-\d{2}$/.test(datePart)) return value

  const timePart = timePartRaw.slice(0, 5)
  if (!/^\d{2}:\d{2}$/.test(timePart)) return value

  return `${timePart}-${datePart}`
}
