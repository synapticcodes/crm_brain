import { legalTicketsMock, type LegalTicketAttachment, type LegalTicketMock } from './mockData'
import { appendCustomerTimeline } from './customersStore'

const STORAGE_KEY = 'brain_legal_tickets_mock'

function notify() {
  window.dispatchEvent(new Event('brain:legalTicketsUpdated'))
}

export function getLegalTickets(): LegalTicketMock[] {
  if (typeof window === 'undefined') return legalTicketsMock
  const raw = window.localStorage.getItem(STORAGE_KEY)
  if (!raw) return legalTicketsMock
  try {
    return JSON.parse(raw) as LegalTicketMock[]
  } catch {
    return legalTicketsMock
  }
}

export function saveLegalTickets(tickets: LegalTicketMock[]) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(tickets))
  notify()
}

export function upsertLegalTicket(payload: {
  clienteId: string
  clienteNome: string
  message: string
  author: 'equipe' | 'juridico'
  attachments?: LegalTicketAttachment[]
}) {
  const now = new Date().toISOString().slice(0, 16).replace('T', ' ')
  const tickets = getLegalTickets()
  const existing = tickets.find((ticket) => ticket.clienteId === payload.clienteId)

  if (existing) {
    const updated: LegalTicketMock = {
      ...existing,
      status: payload.author === 'juridico' ? 'respondido' : 'pendente',
      archived: false,
      lastUpdate: now,
      messages: [
        ...existing.messages,
        {
          id: `M-${Date.now()}`,
          author: payload.author,
          body: payload.message,
          timestamp: now,
          attachments: payload.attachments?.length ? payload.attachments : undefined,
        },
      ],
    }
    saveLegalTickets(tickets.map((ticket) => (ticket.id === updated.id ? updated : ticket)))
    if (payload.author === 'juridico') {
      appendCustomerTimeline(payload.clienteId, {
        title: 'Resposta do juridico',
        description: payload.message,
        timestamp: now,
        type: 'juridico',
      })
      window.dispatchEvent(
        new CustomEvent('brain:juridicoReply', {
          detail: {
            clienteId: payload.clienteId,
            clienteNome: payload.clienteNome,
            message: payload.message,
            timestamp: now,
          },
        })
      )
    }
    return updated
  }

  const nextId = `JUR-${Math.floor(100 + Math.random() * 900)}`
  const created: LegalTicketMock = {
    id: nextId,
    clienteId: payload.clienteId,
    clienteNome: payload.clienteNome,
    status: payload.author === 'juridico' ? 'respondido' : 'pendente',
    archived: false,
    lastUpdate: now,
    messages: [
      {
        id: `M-${Date.now()}`,
        author: payload.author,
        body: payload.message,
        timestamp: now,
        attachments: payload.attachments?.length ? payload.attachments : undefined,
      },
    ],
  }
  saveLegalTickets([created, ...tickets])
  if (payload.author === 'juridico') {
    appendCustomerTimeline(payload.clienteId, {
      title: 'Resposta do juridico',
      description: payload.message,
      timestamp: now,
      type: 'juridico',
    })
    window.dispatchEvent(
      new CustomEvent('brain:juridicoReply', {
        detail: {
          clienteId: payload.clienteId,
          clienteNome: payload.clienteNome,
          message: payload.message,
          timestamp: now,
        },
      })
    )
  }
  return created
}

export function setTicketArchived(ticketId: string, archived: boolean) {
  const now = new Date().toISOString().slice(0, 16).replace('T', ' ')
  const tickets = getLegalTickets()
  const existing = tickets.find((ticket) => ticket.id === ticketId)
  if (!existing) return null
  const updated: LegalTicketMock = {
    ...existing,
    archived,
    lastUpdate: now,
  }
  saveLegalTickets(tickets.map((ticket) => (ticket.id === updated.id ? updated : ticket)))
  return updated
}
