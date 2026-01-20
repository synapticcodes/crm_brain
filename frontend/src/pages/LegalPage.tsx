import { useEffect, useMemo, useState, type ChangeEvent, useRef } from 'react'
import PageHeader from '../components/PageHeader'
import Modal from '../components/Modal'
import type { LegalTicketAttachment, LegalTicketMock } from '../lib/mockData'
import { getLegalTickets, setTicketArchived, upsertLegalTicket } from '../lib/legalTicketsStore'
import { formatTimestamp } from '../lib/formatTimestamp'
import { customersMock } from '../lib/mockData'
import { playSound } from '../lib/soundEffects'

const ITEM_HEIGHT = 78
const OVERSCAN_COUNT = 4

function TicketVirtualList({
  items,
  status,
  onSelect,
}: {
  items: LegalTicketMock[]
  status: 'pendente' | 'respondido'
  onSelect: (id: string) => void
}) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [scrollTop, setScrollTop] = useState(0)
  const [containerHeight, setContainerHeight] = useState(360)

  useEffect(() => {
    if (!containerRef.current) return
    const element = containerRef.current
    function updateHeight() {
      setContainerHeight(element.clientHeight)
    }
    updateHeight()
    const observer = new ResizeObserver(() => updateHeight())
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  const totalHeight = items.length * ITEM_HEIGHT
  const startIndex = Math.max(0, Math.floor(scrollTop / ITEM_HEIGHT) - OVERSCAN_COUNT)
  const endIndex = Math.min(
    items.length,
    Math.ceil((scrollTop + containerHeight) / ITEM_HEIGHT) + OVERSCAN_COUNT
  )
  const visibleItems = items.slice(startIndex, endIndex)

  return (
    <div
      ref={containerRef}
      onScroll={(event) => setScrollTop(event.currentTarget.scrollTop)}
      className="mt-6 max-h-[360px] overflow-auto pr-2"
    >
      <div className="relative" style={{ height: totalHeight || ITEM_HEIGHT }}>
        {visibleItems.map((ticket, index) => (
          <button
            key={ticket.id}
            onClick={() => onSelect(ticket.id)}
            style={{ top: (startIndex + index) * ITEM_HEIGHT }}
            className={`absolute left-0 right-0 flex h-[72px] items-center justify-between gap-4 rounded-2xl border px-4 text-left ${
              status === 'respondido'
                ? 'border-accent/30 bg-accent/5'
                : 'border-amber-200 bg-amber-50/50'
            }`}
          >
            <div>
              <p className="text-sm font-semibold text-ink">
                {ticket.id} · {ticket.clienteNome}
              </p>
                    <p className="text-xs text-ink/50">
                      Ultima atualizacao: {formatTimestamp(ticket.lastUpdate)}
                    </p>
            </div>
            <span
              className={`rounded-full border px-3 py-1 text-xs uppercase tracking-[0.2em] ${
                status === 'respondido'
                  ? 'border-accent/30 bg-accent/10 text-accent'
                  : 'border-amber-200 bg-amber-50 text-amber-700'
              }`}
            >
              {status}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}

export default function LegalPage() {
  const [tickets, setTickets] = useState<LegalTicketMock[]>(() => getLegalTickets())
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [newTicketOpen, setNewTicketOpen] = useState(false)
  const [selectedCustomerId, setSelectedCustomerId] = useState('')
  const [customerQuery, setCustomerQuery] = useState('')
  const [newTicketMessage, setNewTicketMessage] = useState('')
  const [newTicketAttachments, setNewTicketAttachments] = useState<LegalTicketAttachment[]>([])
  const [replyAttachments, setReplyAttachments] = useState<LegalTicketAttachment[]>([])
  const [previewAttachment, setPreviewAttachment] = useState<LegalTicketAttachment | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'pendente' | 'respondido' | 'arquivado'>('all')
  const [visibleCounts, setVisibleCounts] = useState({ pendente: 12, respondido: 12, arquivado: 12 })

  const selectedTicket = tickets.find((ticket) => ticket.id === selectedId) ?? null
  const randomReplies = [
    'Solicitar comprovante atualizado e anexar ao processo.',
    'Encaminhar para revisao contratual e aguardar retorno.',
    'Aprovado para prosseguir com o protocolo judicial.',
    'Necessario complementar documentos antes de seguir.',
    'Analise juridica concluida, aguardando audiencia.',
  ]

  const filteredTickets = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    if (!query) return tickets
    return tickets.filter((ticket) => {
      return (
        ticket.id.toLowerCase().includes(query) ||
        ticket.clienteNome.toLowerCase().includes(query)
      )
    })
  }, [tickets, searchQuery])

  const orderedTickets = useMemo(() => {
    return [...filteredTickets].sort((a, b) => {
      const dateA = new Date(a.lastUpdate.replace(' ', 'T')).getTime()
      const dateB = new Date(b.lastUpdate.replace(' ', 'T')).getTime()
      return dateB - dateA
    })
  }, [filteredTickets])

  const visibleTickets = useMemo(() => {
    if (statusFilter === 'all') return orderedTickets.filter((ticket) => !ticket.archived)
    if (statusFilter === 'arquivado') return orderedTickets.filter((ticket) => ticket.archived)
    return orderedTickets.filter((ticket) => ticket.status === statusFilter && !ticket.archived)
  }, [orderedTickets, statusFilter])

  const grouped = useMemo(() => {
    return visibleTickets.reduce((acc, ticket) => {
      if (!acc[ticket.status]) acc[ticket.status] = []
      acc[ticket.status].push(ticket)
      return acc
    }, {} as Record<'pendente' | 'respondido', LegalTicketMock[]>)
  }, [visibleTickets])

  const activeGrouped = useMemo(() => {
    return orderedTickets
      .filter((ticket) => !ticket.archived)
      .reduce((acc, ticket) => {
        if (!acc[ticket.status]) acc[ticket.status] = []
        acc[ticket.status].push(ticket)
        return acc
      }, {} as Record<'pendente' | 'respondido', LegalTicketMock[]>)
  }, [orderedTickets])

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

  useEffect(() => {
    setVisibleCounts({ pendente: 12, respondido: 12, arquivado: 12 })
  }, [searchQuery])

  function formatFileSize(size: number) {
    if (size < 1024) return `${size} B`
    const kb = size / 1024
    if (kb < 1024) return `${kb.toFixed(1)} KB`
    return `${(kb / 1024).toFixed(1)} MB`
  }

  function getAttachmentKind(attachment: LegalTicketAttachment) {
    const lowerName = attachment.name.toLowerCase()
    if (attachment.type.startsWith('image/')) return 'image'
    if (attachment.type.startsWith('audio/')) return 'audio'
    if (attachment.type.startsWith('video/')) return 'video'
    if (attachment.type.includes('pdf') || lowerName.endsWith('.pdf')) return 'pdf'
    return 'file'
  }

  async function buildAttachments(files: FileList) {
    const now = new Date().toISOString().slice(0, 16).replace('T', ' ')
    const items = await Promise.all(
      Array.from(files).map(
        (file) =>
          new Promise<LegalTicketAttachment>((resolve, reject) => {
            const reader = new FileReader()
            reader.onload = () => {
              resolve({
                id: `ATT-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                name: file.name,
                type: file.type || 'application/octet-stream',
                sizeLabel: formatFileSize(file.size),
                uploadedAt: now,
                url: typeof reader.result === 'string' ? reader.result : '',
              })
            }
            reader.onerror = () => reject(reader.error)
            reader.readAsDataURL(file)
          })
      )
    )
    return items
  }

  async function handleNewTicketAttachments(event: ChangeEvent<HTMLInputElement>) {
    if (!event.target.files?.length) return
    try {
      const attachments = await buildAttachments(event.target.files)
      setNewTicketAttachments((prev) => [...prev, ...attachments])
    } catch {
      // Ignore upload errors in mock flow.
    } finally {
      event.target.value = ''
    }
  }

  async function handleReplyAttachments(event: ChangeEvent<HTMLInputElement>) {
    if (!event.target.files?.length) return
    try {
      const attachments = await buildAttachments(event.target.files)
      setReplyAttachments((prev) => [...prev, ...attachments])
    } catch {
      // Ignore upload errors in mock flow.
    } finally {
      event.target.value = ''
    }
  }

  function sendMessage(author: 'equipe' | 'juridico') {
    if (!selectedTicket) return
    const trimmed = message.trim()
    if (!trimmed && replyAttachments.length === 0) return
    const updated = upsertLegalTicket({
      clienteId: selectedTicket.clienteId,
      clienteNome: selectedTicket.clienteNome,
      message: trimmed || 'Arquivo anexado.',
      author,
      attachments: replyAttachments,
    })
    setTickets((prev) => prev.map((ticket) => (ticket.id === updated.id ? updated : ticket)))
    setMessage('')
    setReplyAttachments([])
    playSound(author === 'juridico' ? 'incoming' : 'success')
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
        subtitle="Gerencie solicitações jurídicas através de tickets entre sua equipe e o departamento jurídico"
        actions={
          <div className="flex flex-wrap items-center gap-3">
            <input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Buscar ticket ou cliente..."
              className="h-10 w-56 rounded-full border border-stroke bg-white px-4 text-sm text-ink shadow-soft outline-none focus:border-accent"
            />
            <div className="flex items-center rounded-full border border-stroke bg-white p-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-ink/70">
              {(['all', 'pendente', 'respondido', 'arquivado'] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setStatusFilter(filter)}
                  className={`rounded-full px-3 py-1 ${
                    statusFilter === filter ? 'bg-accent text-white' : 'text-ink/70'
                  }`}
                >
                  {filter === 'all' ? 'Todos' : filter}
                </button>
              ))}
            </div>
            <button
              onClick={() => setNewTicketOpen(true)}
              className="rounded-full bg-accent px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white"
            >
              Novo ticket
            </button>
          </div>
        }
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="surface-panel p-6">
          <p className="text-xs uppercase tracking-[0.2em] text-ink/40">Pendentes</p>
          <p className="mt-4 text-3xl font-display text-ink">{activeGrouped.pendente?.length ?? 0}</p>
          <p className="mt-2 text-sm text-ink/60">Aguardando resposta do juridico.</p>
        </div>
        <div className="surface-panel p-6">
          <p className="text-xs uppercase tracking-[0.2em] text-ink/40">Respondidos</p>
          <p className="mt-4 text-3xl font-display text-ink">{activeGrouped.respondido?.length ?? 0}</p>
          <p className="mt-2 text-sm text-ink/60">Tickets com retorno juridico.</p>
        </div>
      </div>

      <div className={`grid gap-6 ${statusFilter === 'arquivado' ? 'lg:grid-cols-1' : 'lg:grid-cols-2'}`}>
        {statusFilter === 'arquivado' ? (
          (() => {
            const items = visibleTickets
            const visibleCount = visibleCounts.arquivado
            const listItems = items.slice(0, visibleCount)
            return (
              <div className="surface-panel p-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-display text-ink">Arquivados</h3>
                  <span className="accent-pill">historico</span>
                </div>
                <TicketVirtualList items={listItems} status="respondido" onSelect={setSelectedId} />
                <p className="mt-3 text-xs text-ink/50">
                  Mostrando {listItems.length} de {items.length}
                </p>
                {items.length > visibleCount ? (
                  <button
                    onClick={() =>
                      setVisibleCounts((prev) => ({
                        ...prev,
                        arquivado: prev.arquivado + 12,
                      }))
                    }
                    className="mt-4 w-full rounded-full border border-stroke bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-ink/70"
                  >
                    Carregar mais
                  </button>
                ) : null}
                {items.length === 0 ? (
                  <div className="mt-6 rounded-2xl border border-dashed border-stroke bg-white/50 p-4 text-xs text-ink/50">
                    Sem tickets.
                  </div>
                ) : null}
              </div>
            )
          })()
        ) : (
          ((statusFilter === 'all' ? ['pendente', 'respondido'] : [statusFilter]) as const).map(
            (status) => {
              const items = grouped[status] ?? []
              const visibleCount = visibleCounts[status]
              const listItems = items.slice(0, visibleCount)
              return (
                <div key={status} className="surface-panel p-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-display text-ink">
                      {status === 'pendente' ? 'Pendentes' : 'Respondidos'}
                    </h3>
                    <span className="accent-pill">tickets ativos</span>
                  </div>
                  <TicketVirtualList items={listItems} status={status} onSelect={setSelectedId} />
                  <p className="mt-3 text-xs text-ink/50">
                    Mostrando {listItems.length} de {items.length}
                  </p>
                  {items.length > visibleCount ? (
                    <button
                      onClick={() =>
                        setVisibleCounts((prev) => ({
                          ...prev,
                          [status]: prev[status] + 12,
                        }))
                      }
                      className="mt-4 w-full rounded-full border border-stroke bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-ink/70"
                    >
                      Carregar mais
                    </button>
                  ) : null}
                  {items.length === 0 ? (
                    <div className="mt-6 rounded-2xl border border-dashed border-stroke bg-white/50 p-4 text-xs text-ink/50">
                      Sem tickets.
                    </div>
                  ) : null}
                </div>
              )
            }
          )
        )}
      </div>

      <Modal
        open={Boolean(selectedTicket)}
        title={selectedTicket ? `${selectedTicket.id} · ${selectedTicket.clienteNome}` : 'Ticket'}
        onClose={() => {
          setSelectedId(null)
          setReplyAttachments([])
          setMessage('')
        }}
      >
        {selectedTicket ? (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                <span
                  className={`h-2 w-2 rounded-full ${
                    selectedTicket.status === 'respondido' ? 'bg-accent/70' : 'bg-amber-400'
                  }`}
                />
                Conversa
              </div>
              <span
                className={`rounded-full border px-3 py-1 text-xs uppercase tracking-[0.2em] ${
                  selectedTicket.status === 'respondido'
                    ? 'border-accent/30 bg-accent/10 text-accent'
                    : 'border-amber-200 bg-amber-50 text-amber-700'
                }`}
              >
                {selectedTicket.status}
              </span>
            </div>
            {selectedTicket.archived ? (
              <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-ink/50">
                <span className="h-2 w-2 rounded-full bg-ink/40" />
                Ticket arquivado
              </div>
            ) : null}

            <div className="space-y-3">
              {selectedTicket.messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`rounded-2xl border border-stroke px-4 py-3 text-sm ${
                    msg.author === 'equipe'
                      ? 'bg-white/90'
                      : 'bg-amber-50/80'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">{msg.author}</p>
                    <span
                      className={`h-2 w-2 rounded-full ${
                        msg.author === 'equipe' ? 'bg-accent/60' : 'bg-amber-400'
                      }`}
                    />
                  </div>
                  <p className="mt-2 text-slate-600">{msg.body}</p>
                  <p className="mt-2 text-[11px] uppercase tracking-[0.2em] text-slate-400">
                    {formatTimestamp(msg.timestamp)}
                  </p>
                  {msg.attachments?.length ? (
                    <div className="mt-3 space-y-2">
                      {msg.attachments.map((attachment) => (
                        <div
                          key={attachment.id}
                          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-stroke bg-white px-3 py-2 text-xs"
                        >
                          <div>
                            <p className="font-semibold text-ink">{attachment.name}</p>
                            <p className="text-ink/50">
                              {attachment.sizeLabel} · {formatTimestamp(attachment.uploadedAt)}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setPreviewAttachment(attachment)}
                              className="btn-primary rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em]"
                            >
                              visualizar
                            </button>
                            <a
                              href={attachment.url}
                              download={attachment.name}
                              className="btn-primary rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] !text-white"
                            >
                              baixar
                            </a>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>

            <div className="rounded-2xl border border-stroke bg-white/90 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Resposta da equipe</p>
              <textarea
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                rows={3}
                placeholder="Escreva a mensagem..."
                className="input-base mt-3"
              />
              <div className="mt-3 rounded-2xl border border-stroke bg-white/80 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Arquivos anexados</p>
                  <label className="btn-primary cursor-pointer rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em]">
                    Anexar arquivo
                    <input
                      type="file"
                      multiple
                      accept=".pdf,.jpg,.jpeg,.png,.ogg,.mp3,.mp4,.docx,.csv,.xlsx"
                      onChange={handleReplyAttachments}
                      className="hidden"
                    />
                  </label>
                </div>
                <div className="mt-3 space-y-2">
                  {replyAttachments.length === 0 ? (
                    <p className="text-xs text-slate-500">Nenhum arquivo anexado.</p>
                  ) : (
                    replyAttachments.map((attachment) => (
                      <div
                        key={attachment.id}
                        className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-stroke bg-white px-3 py-2 text-xs"
                      >
                        <div>
                          <p className="font-semibold text-ink">{attachment.name}</p>
                          <p className="text-ink/50">
                            {attachment.sizeLabel} · {formatTimestamp(attachment.uploadedAt)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setPreviewAttachment(attachment)}
                            className="btn-primary rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em]"
                          >
                            visualizar
                          </button>
                          <a
                            href={attachment.url}
                            download={attachment.name}
                            className="btn-primary rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] !text-white"
                          >
                            baixar
                          </a>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-3">
                <button
                  onClick={() => sendMessage('equipe')}
                  className="btn-primary rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em]"
                >
                  Responder
                </button>
                {selectedTicket.status === 'respondido' && !selectedTicket.archived ? (
                  <button
                    onClick={() => {
                      const updated = setTicketArchived(selectedTicket.id, true)
                      if (!updated) return
                      setTickets((prev) =>
                        prev.map((ticket) => (ticket.id === updated.id ? updated : ticket))
                      )
                    }}
                    className="btn-primary rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em]"
                  >
                    Arquivar ticket
                  </button>
                ) : null}
              </div>
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
              className="mt-2 w-full rounded-xl border border-stroke bg-white px-4 py-3 text-sm text-ink shadow-soft outline-none focus:border-accent"
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
              className="mt-2 w-full rounded-xl border border-stroke bg-white px-4 py-3 text-sm text-ink shadow-soft outline-none focus:border-accent"
            />
          </label>
          <div className="rounded-2xl border border-stroke bg-white/80 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink/60">Arquivos anexados</p>
              <label className="btn-outline cursor-pointer rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em]">
                Anexar arquivo
                <input
                  type="file"
                  multiple
                  accept=".pdf,.jpg,.jpeg,.png,.ogg,.mp3,.mp4,.docx,.csv,.xlsx"
                  onChange={handleNewTicketAttachments}
                  className="hidden"
                />
              </label>
            </div>
            <div className="mt-3 space-y-2">
              {newTicketAttachments.length === 0 ? (
                <p className="text-xs text-ink/50">Nenhum arquivo anexado.</p>
              ) : (
                newTicketAttachments.map((attachment) => (
                  <div
                    key={attachment.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-stroke bg-white px-4 py-3 text-sm"
                  >
                    <div>
                      <p className="font-semibold text-ink">{attachment.name}</p>
                      <p className="text-xs text-ink/50">
                          {attachment.sizeLabel} · {formatTimestamp(attachment.uploadedAt)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setPreviewAttachment(attachment)}
                        className="rounded-full border border-stroke px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-ink/70"
                      >
                        Visualizar
                      </button>
                      <a
                        href={attachment.url}
                        download={attachment.name}
                        className="rounded-full border border-stroke px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-ink/70"
                      >
                        Baixar
                      </a>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
          <button
            onClick={() => {
              const selectedCustomer = customersMock.find((customer) => customer.id === selectedCustomerId)
              if (!selectedCustomer) return
              const trimmed = newTicketMessage.trim()
              if (!trimmed && newTicketAttachments.length === 0) return
              const created = upsertLegalTicket({
                clienteId: selectedCustomer.id,
                clienteNome: selectedCustomer.nome,
                message: trimmed || 'Arquivo anexado.',
                author: 'equipe',
                attachments: newTicketAttachments,
              })
              setTickets((prev) =>
                prev.find((ticket) => ticket.id === created.id) ? prev : [created, ...prev]
              )
              setSelectedId(created.id)
              setSelectedCustomerId('')
              setNewTicketMessage('')
              setNewTicketAttachments([])
              setNewTicketOpen(false)
              playSound('success')
            }}
            className="w-full rounded-full bg-accent px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white"
          >
            Enviar para juridico
          </button>
          <p className="text-xs text-ink/50">
            O juridico respondera no sistema externo e atualizara este ticket.
          </p>
        </div>
      </Modal>

      <Modal
        open={Boolean(previewAttachment)}
        title={previewAttachment?.name ?? 'Arquivo'}
        onClose={() => setPreviewAttachment(null)}
        size="lg"
      >
        {previewAttachment ? (
          <div className="space-y-4">
            {(() => {
              const kind = getAttachmentKind(previewAttachment)
              if (kind === 'image') {
                return (
                  <img
                    src={previewAttachment.url}
                    alt={previewAttachment.name}
                    className="max-h-[60vh] w-full rounded-2xl object-contain"
                  />
                )
              }
              if (kind === 'audio') {
                return <audio controls className="w-full" src={previewAttachment.url} />
              }
              if (kind === 'video') {
                return <video controls className="w-full max-h-[60vh] rounded-2xl" src={previewAttachment.url} />
              }
              if (kind === 'pdf') {
                return (
                  <iframe
                    title={previewAttachment.name}
                    src={previewAttachment.url}
                    className="h-[60vh] w-full rounded-2xl border border-stroke"
                  />
                )
              }
              return (
                <div className="rounded-2xl border border-dashed border-stroke bg-white/80 p-6 text-sm text-ink/60">
                  Visualizacao rapida indisponivel para este tipo de arquivo.
                </div>
              )
            })()}
            <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
              <div>
                <p className="font-semibold text-ink">{previewAttachment.name}</p>
                <p className="text-xs text-ink/50">
                  {previewAttachment.sizeLabel} · {formatTimestamp(previewAttachment.uploadedAt)}
                </p>
              </div>
              <a
                href={previewAttachment.url}
                download={previewAttachment.name}
                className="btn-primary rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] !text-white"
              >
                Baixar arquivo
              </a>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  )
}
