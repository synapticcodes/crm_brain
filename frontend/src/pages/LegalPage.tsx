import { useEffect, useMemo, useState } from 'react'
import PageHeader from '../components/PageHeader'
import Modal from '../components/Modal'
import type { LegalTicketMock } from '../lib/mockData'
import { getLegalTickets, upsertLegalTicket } from '../lib/legalTicketsStore'
import { customersMock } from '../lib/mockData'

export default function LegalPage() {
  const [tickets, setTickets] = useState<LegalTicketMock[]>(() => getLegalTickets())
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [newTicketOpen, setNewTicketOpen] = useState(false)
  const [selectedCustomerId, setSelectedCustomerId] = useState('')
  const [customerQuery, setCustomerQuery] = useState('')
  const [newTicketMessage, setNewTicketMessage] = useState('')

  const selectedTicket = tickets.find((ticket) => ticket.id === selectedId) ?? null
  const randomReplies = [
    'Solicitar comprovante atualizado e anexar ao processo.',
    'Encaminhar para revisao contratual e aguardar retorno.',
    'Aprovado para prosseguir com o protocolo judicial.',
    'Necessario complementar documentos antes de seguir.',
    'Analise juridica concluida, aguardando audiencia.',
  ]

  const grouped = useMemo(() => {
    return tickets.reduce((acc, ticket) => {
      if (!acc[ticket.status]) acc[ticket.status] = []
      acc[ticket.status].push(ticket)
      return acc
    }, {} as Record<'pendente' | 'respondido', LegalTicketMock[]>)
  }, [tickets])

  useEffect(() => {
    function syncTickets() {
      setTickets(getLegalTickets())
    }

    window.addEventListener('storage', syncTickets)
    window.addEventListener('brain:legalTicketsUpdated', syncTickets)
    return () => {
      window.removeEventListener('storage', syncTickets)
      window.removeEventListener('brain:legalTicketsUpdated', syncTickets)
    }
  }, [])

  function sendMessage(author: 'equipe' | 'juridico') {
    if (!selectedTicket || !message.trim()) return
    const updated = upsertLegalTicket({
      clienteId: selectedTicket.clienteId,
      clienteNome: selectedTicket.clienteNome,
      message: message.trim(),
      author,
    })
    setTickets((prev) => prev.map((ticket) => (ticket.id === updated.id ? updated : ticket)))
    setMessage('')
  }

  function simulateLegalReply() {
    if (!selectedTicket) return
    const reply = randomReplies[Math.floor(Math.random() * randomReplies.length)]
    const updated = upsertLegalTicket({
      clienteId: selectedTicket.clienteId,
      clienteNome: selectedTicket.clienteNome,
      message: reply,
      author: 'juridico',
    })
    setTickets((prev) => prev.map((ticket) => (ticket.id === updated.id ? updated : ticket)))
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Juridico"
        subtitle="Fluxo experimental de tickets para troca entre equipe e juridico."
        actions={
          <button
            onClick={() => setNewTicketOpen(true)}
            className="rounded-full bg-ink px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white"
          >
            Novo ticket
          </button>
        }
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="surface-panel p-6">
          <p className="text-xs uppercase tracking-[0.2em] text-ink/40">Pendentes</p>
          <p className="mt-4 text-3xl font-display text-ink">{grouped.pendente?.length ?? 0}</p>
          <p className="mt-2 text-sm text-ink/60">Aguardando resposta do juridico.</p>
        </div>
        <div className="surface-panel p-6">
          <p className="text-xs uppercase tracking-[0.2em] text-ink/40">Respondidos</p>
          <p className="mt-4 text-3xl font-display text-ink">{grouped.respondido?.length ?? 0}</p>
          <p className="mt-2 text-sm text-ink/60">Tickets com retorno juridico.</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {(['pendente', 'respondido'] as const).map((status) => (
          <div key={status} className="surface-panel p-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-display text-ink">
                {status === 'pendente' ? 'Pendentes' : 'Respondidos'}
              </h3>
              <span className="accent-pill">tickets ativos</span>
            </div>
            <div className="mt-6 space-y-4">
              {(grouped[status] ?? []).map((ticket) => (
                <button
                  key={ticket.id}
                  onClick={() => setSelectedId(ticket.id)}
                  className="flex w-full flex-wrap items-center justify-between gap-4 rounded-2xl border border-stroke bg-white/80 px-4 py-3 text-left"
                >
                  <div>
                    <p className="text-sm font-semibold text-ink">
                      {ticket.id} · {ticket.clienteNome}
                    </p>
                    <p className="text-xs text-ink/50">Ultima atualizacao: {ticket.lastUpdate}</p>
                  </div>
                  <span className="rounded-full border border-stroke bg-white px-3 py-1 text-xs uppercase tracking-[0.2em] text-ink/70">
                    {status}
                  </span>
                </button>
              ))}
              {(grouped[status] ?? []).length === 0 ? (
                <div className="rounded-2xl border border-dashed border-stroke bg-white/50 p-4 text-xs text-ink/50">
                  Sem tickets.
                </div>
              ) : null}
            </div>
          </div>
        ))}
      </div>

      <Modal
        open={Boolean(selectedTicket)}
        title={selectedTicket ? `${selectedTicket.id} · ${selectedTicket.clienteNome}` : 'Ticket'}
        onClose={() => setSelectedId(null)}
      >
        {selectedTicket ? (
          <div className="space-y-6">
            <div className="space-y-3">
              {selectedTicket.messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`rounded-2xl border border-stroke px-4 py-3 text-sm ${
                    msg.author === 'equipe' ? 'bg-white' : 'bg-amber-50'
                  }`}
                >
                  <p className="text-xs uppercase tracking-[0.2em] text-ink/50">{msg.author}</p>
                  <p className="mt-2 text-ink/70">{msg.body}</p>
                  <p className="mt-2 text-[11px] uppercase tracking-[0.2em] text-ink/40">{msg.timestamp}</p>
                </div>
              ))}
            </div>

            <div className="space-y-3">
              <textarea
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                rows={3}
                placeholder="Escreva a mensagem..."
                className="w-full rounded-2xl border border-stroke bg-white/80 px-4 py-3 text-sm shadow-soft outline-none focus:border-ink"
              />
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => sendMessage('equipe')}
                  className="rounded-full bg-ink px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white"
                >
                  Responder como equipe
                </button>
                <button
                  onClick={simulateLegalReply}
                  className="rounded-full border border-stroke bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-ink/70"
                >
                  Simular resposta juridico
                </button>
              </div>
              <p className="text-xs text-ink/50">Notificacoes e som sao simulados neste MVP.</p>
            </div>
          </div>
        ) : null}
      </Modal>

      <Modal open={newTicketOpen} title="Novo ticket" onClose={() => setNewTicketOpen(false)} size="md">
        <div className="space-y-4">
          <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-ink/50">
            Cliente
            <input
              value={customerQuery}
              onChange={(event) => {
                setCustomerQuery(event.target.value)
                setSelectedCustomerId('')
              }}
              className="mt-2 w-full rounded-xl border border-stroke bg-white px-4 py-3 text-sm text-ink shadow-soft outline-none focus:border-ink"
              placeholder="Digite o nome ou CPF"
            />
            {customerQuery.trim().length > 0 ? (
              <div className="mt-2 max-h-48 overflow-auto rounded-xl border border-stroke bg-white/90 text-sm text-ink">
                {customersMock
                  .filter((customer) =>
                    `${customer.nome} ${customer.cpf}`
                      .toLowerCase()
                      .includes(customerQuery.toLowerCase())
                  )
                  .map((customer) => (
                    <button
                      key={customer.id}
                      onClick={() => {
                        setSelectedCustomerId(customer.id)
                        setCustomerQuery(`${customer.nome} · ${customer.cpf}`)
                      }}
                      className="flex w-full items-center justify-between px-4 py-2 text-left hover:bg-white"
                    >
                      <span>{customer.nome}</span>
                      <span className="text-xs text-ink/50">{customer.cpf}</span>
                    </button>
                  ))}
                {customersMock.filter((customer) =>
                  `${customer.nome} ${customer.cpf}`.toLowerCase().includes(customerQuery.toLowerCase())
                ).length === 0 ? (
                  <div className="px-4 py-2 text-xs text-ink/50">Nenhum cliente encontrado.</div>
                ) : null}
              </div>
            ) : null}
          </label>
          <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-ink/50">
            Mensagem
            <textarea
              value={newTicketMessage}
              onChange={(event) => setNewTicketMessage(event.target.value)}
              rows={4}
              placeholder="Descreva o ocorrido..."
              className="mt-2 w-full rounded-xl border border-stroke bg-white px-4 py-3 text-sm text-ink shadow-soft outline-none focus:border-ink"
            />
          </label>
          <button
            onClick={() => {
              const selectedCustomer = customersMock.find((customer) => customer.id === selectedCustomerId)
              if (!selectedCustomer || !newTicketMessage.trim()) return
              const created = upsertLegalTicket({
                clienteId: selectedCustomer.id,
                clienteNome: selectedCustomer.nome,
                message: newTicketMessage.trim(),
                author: 'equipe',
              })
              setTickets((prev) =>
                prev.find((ticket) => ticket.id === created.id) ? prev : [created, ...prev]
              )
              setSelectedId(created.id)
              setSelectedCustomerId('')
              setNewTicketMessage('')
              setNewTicketOpen(false)
            }}
            className="w-full rounded-full bg-ink px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white"
          >
            Enviar para juridico
          </button>
          <p className="text-xs text-ink/50">
            O juridico respondera no sistema externo e atualizara este ticket.
          </p>
        </div>
      </Modal>
    </div>
  )
}
