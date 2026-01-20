import { logsMock, type LogMock } from './mockData'

const LOGS_KEY = 'brain_logs'

export function getLogs(): LogMock[] {
  if (typeof window === 'undefined') return logsMock
  const raw = window.localStorage.getItem(LOGS_KEY)
  if (!raw) return logsMock
  try {
    const parsed = JSON.parse(raw) as LogMock[]
    return Array.isArray(parsed) ? parsed : logsMock
  } catch {
    return logsMock
  }
}

export function saveLogs(logs: LogMock[]) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(LOGS_KEY, JSON.stringify(logs))
}

export function appendLog(entry: LogMock) {
  const logs = getLogs()
  saveLogs([entry, ...logs])
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('brain:logsUpdated'))
  }
}
