import { chatThreadsMock, type ChatThreadMock } from './mockData'

const STORAGE_KEY = 'brain_chat_threads_mock'
const STORAGE_VERSION_KEY = 'brain_chat_threads_version'
const STORAGE_VERSION = '2026-01-26'

function notify() {
  window.dispatchEvent(new Event('brain:chatsUpdated'))
}

export function getChatThreads(): ChatThreadMock[] {
  if (typeof window === 'undefined') return chatThreadsMock
  const version = window.localStorage.getItem(STORAGE_VERSION_KEY)
  const raw = window.localStorage.getItem(STORAGE_KEY)
  if (!raw || version !== STORAGE_VERSION) {
    window.localStorage.setItem(STORAGE_VERSION_KEY, STORAGE_VERSION)
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(chatThreadsMock))
    return chatThreadsMock
  }
  try {
    return JSON.parse(raw) as ChatThreadMock[]
  } catch {
    return chatThreadsMock
  }
}

export function saveChatThreads(threads: ChatThreadMock[]) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(STORAGE_VERSION_KEY, STORAGE_VERSION)
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(threads))
  notify()
}

export function updateChatThread(threadId: string, updater: (thread: ChatThreadMock) => ChatThreadMock) {
  const threads = getChatThreads()
  const updated = threads.map((thread) => (thread.id === threadId ? updater(thread) : thread))
  saveChatThreads(updated)
  return updated
}

export function generateProtocol() {
  return `PRT-${Math.floor(100 + Math.random() * 900)}`
}
