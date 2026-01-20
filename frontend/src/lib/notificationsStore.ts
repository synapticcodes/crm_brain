export type NotificationType = 'chat' | 'email' | 'juridico'

export type NotificationItem = {
  id: string
  type: NotificationType
  title: string
  message: string
  timestamp: string
  read: boolean
  dedupeKey?: string
}

const STORAGE_KEY = 'brain_notifications'

function notify() {
  window.dispatchEvent(new Event('brain:notificationsUpdated'))
}

export function getNotifications(): NotificationItem[] {
  if (typeof window === 'undefined') return []
  const raw = window.localStorage.getItem(STORAGE_KEY)
  if (!raw) return []
  try {
    const items = JSON.parse(raw) as NotificationItem[]
    return items.sort((a, b) => b.timestamp.localeCompare(a.timestamp))
  } catch {
    return []
  }
}

export function saveNotifications(items: NotificationItem[]) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  notify()
}

export function addNotification(input: Omit<NotificationItem, 'id' | 'read'>) {
  const items = getNotifications()
  if (input.dedupeKey && items.some((item) => item.dedupeKey === input.dedupeKey)) {
    return items
  }
  const next: NotificationItem = {
    ...input,
    id: `N-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    read: false,
  }
  const updated = [next, ...items].slice(0, 200)
  saveNotifications(updated)
  return updated
}

export function markAllNotificationsRead() {
  const items = getNotifications()
  const updated = items.map((item) => ({ ...item, read: true }))
  saveNotifications(updated)
  return updated
}

export function markNotificationRead(id: string) {
  const items = getNotifications()
  const updated = items.map((item) => (item.id === id ? { ...item, read: true } : item))
  saveNotifications(updated)
  return updated
}
