import { useEffect, useMemo, useRef, useState } from 'react'
import PageHeader from '../components/PageHeader'
import Modal from '../components/Modal'
import { type CustomerMock, type CustomerTimelineItem } from '../lib/mockData'
import { upsertLegalTicket } from '../lib/legalTicketsStore'
import { getCustomers, saveCustomers } from '../lib/customersStore'

const LANE_CONFIG = [
  {
    key: 'documentacao_pendente',
    title: 'Documentacao pendente',
    tone: 'border-amber-300 bg-amber-50/70',
    badge: 'text-amber-700',
  },
  {
    key: 'documentacao_enviada',
    title: 'Documentacao enviada',
    tone: 'border-sky-300 bg-sky-50/70',
    badge: 'text-sky-700',
  },
  {
    key: 'em_dia',
    title: 'Em dia',
    tone: 'border-emerald-300 bg-emerald-50/70',
    badge: 'text-emerald-700',
  },
  {
    key: 'provas',
    title: 'Provas',
    tone: 'border-orange-300 bg-orange-50/70',
    badge: 'text-orange-700',
  },
  {
    key: 'inadimplentes',
    title: 'Inadimplentes',
    tone: 'border-rose-300 bg-rose-50/70',
    badge: 'text-rose-700',
  },
] as const

const DATE_FILTERS = [
  { value: 'all', label: 'Todo periodo' },
  { value: '7', label: 'Ultimos 7 dias' },
  { value: '30', label: 'Ultimos 30 dias' },
  { value: '90', label: 'Ultimos 90 dias' },
  { value: 'year', label: 'Anual' },
  { value: 'custom', label: 'Personalizado' },
] as const

function buildTimelineItem(title: string, description: string, type: CustomerTimelineItem['type']) {
  const now = new Date()
  const timestamp = now.toISOString().slice(0, 16).replace('T', ' ')
  return {
    id: `T-${now.getTime()}`,
    title,
    description,
    timestamp,
    type,
  }
}

const timelineTone = {
  update: 'border-stroke text-ink/70',
  documento: 'border-amber-300 text-amber-700',
  comunicacao: 'border-sky-300 text-sky-700',
  contato: 'border-teal/40 text-teal',
  juridico: 'border-orange-300 text-orange-700',
  processo: 'border-stone-400 text-stone-700',
  pagamento: 'border-emerald-300 text-emerald-700',
  app: 'border-rose-300 text-rose-700',
} satisfies Record<CustomerTimelineItem['type'], string>

export default function CustomersPage() {
  const [customers, setCustomers] = useState<CustomerMock[]>(() => getCustomers())
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [laneFilter, setLaneFilter] = useState('all')
  const [dateFilter, setDateFilter] = useState('all')
  const [selectedYear, setSelectedYear] = useState(String(new Date().getFullYear()))
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')
  const [sellerFilter, setSellerFilter] = useState('')
  const [editing, setEditing] = useState(false)
  const [legalMessageOpen, setLegalMessageOpen] = useState(false)
  const [legalMessage, setLegalMessage] = useState('')
  const [rejectingFileId, setRejectingFileId] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [createError, setCreateError] = useState('')
  const [createForm, setCreateForm] = useState({
    nome: '',
    telefone: '',
    email: '',
    cpf: '',
    rg: '',
    telefoneSecundario: '',
    vendedor: '',
    processoSuper: '',
    processoRmc: '',
    endereco: '',
    numero: '',
    bairro: '',
    cidade: '',
    estado: '',
    cep: '',
    servicoContratado: '',
    contratoValor: '',
    parcelas: '',
    formaPagamento: '',
  })
  const [draft, setDraft] = useState({
    email: '',
    telefone: '',
    telefoneSecundario: '',
    processoSuper: '',
    processoRmc: '',
    appStatus: 'pendente' as CustomerMock['appStatus'],
  })

  const selectedCustomer = customers.find((customer) => customer.id === selectedId) ?? null
  const customersRef = useRef(customers)
  const pendingFiles = selectedCustomer?.files.filter((file) => file.status === 'pendente') ?? []
  const approvedFiles = selectedCustomer?.files.filter((file) => file.status === 'aprovado') ?? []

  useEffect(() => {
    setEditing(false)
    setLegalMessageOpen(false)
    setLegalMessage('')
  }, [selectedId])

  useEffect(() => {
    customersRef.current = customers
  }, [customers])

  useEffect(() => {
    saveCustomers(customers)
  }, [customers])

  useEffect(() => {
    function syncCustomers() {
      const next = getCustomers()
      if (JSON.stringify(next) === JSON.stringify(customersRef.current)) {
        return
      }
      setCustomers(next)
    }

    window.addEventListener('brain:customersUpdated', syncCustomers)
    window.addEventListener('storage', syncCustomers)
    return () => {
      window.removeEventListener('brain:customersUpdated', syncCustomers)
      window.removeEventListener('storage', syncCustomers)
    }
  }, [])

  const filteredCustomers = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    const sellerNormalized = sellerFilter.trim().toLowerCase()
    const now = Date.now()
    const rangeDays =
      dateFilter === 'all' || dateFilter === 'year' || dateFilter === 'custom'
        ? null
        : Number(dateFilter)

    return customers.filter((customer) => {
      const matchesLane = laneFilter === 'all' || customer.kanbanLane === laneFilter
      const matchesQuery =
        !normalized ||
        [customer.nome, customer.email, customer.cpf, customer.telefone]
          .filter(Boolean)
          .concat([customer.processoSuper, customer.processoRmc])
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(normalized))
      const matchesSeller =
        !sellerNormalized || customer.vendedor.toLowerCase().includes(sellerNormalized)

      const createdAt = new Date(customer.createdAt)
      const matchesDate = rangeDays
        ? now - createdAt.getTime() <= rangeDays * 24 * 60 * 60 * 1000
        : dateFilter === 'year'
        ? createdAt.getFullYear() === Number(selectedYear)
        : dateFilter === 'custom'
        ? (!customStart || createdAt >= new Date(customStart)) &&
          (!customEnd || createdAt <= new Date(customEnd))
        : true

      return matchesLane && matchesQuery && matchesSeller && matchesDate
    })
  }, [customers, query, sellerFilter, laneFilter, dateFilter])

  const sellerOptions = useMemo(() => {
    return Array.from(new Set(customers.map((customer) => customer.vendedor))).sort()
  }, [customers])

  const grouped = useMemo(() => {
    return filteredCustomers.reduce((acc, customer) => {
      if (!acc[customer.kanbanLane]) acc[customer.kanbanLane] = []
      acc[customer.kanbanLane].push(customer)
      return acc
    }, {} as Record<string, CustomerMock[]>)
  }, [filteredCustomers])

  function updateCustomer(id: string, updater: (customer: CustomerMock) => CustomerMock) {
    setCustomers((prev) => prev.map((customer) => (customer.id === id ? updater(customer) : customer)))
  }

  function addTimeline(id: string, item: CustomerTimelineItem) {
    updateCustomer(id, (customer) => ({
      ...customer,
      timeline: [item, ...customer.timeline],
    }))
  }

  function resetCreateForm() {
    setCreateForm({
      nome: '',
      telefone: '',
      email: '',
      cpf: '',
      rg: '',
      telefoneSecundario: '',
      vendedor: '',
      processoSuper: '',
      processoRmc: '',
      endereco: '',
      numero: '',
      bairro: '',
      cidade: '',
      estado: '',
      cep: '',
      servicoContratado: '',
      contratoValor: '',
      parcelas: '',
      formaPagamento: '',
    })
    setCreateError('')
  }

  function handleCreateCustomer(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!createForm.nome || !createForm.telefone || !createForm.email || !createForm.cpf) {
      setCreateError('Nome, telefone, email e CPF sao obrigatorios.')
      return
    }
    const now = new Date()
    const timestamp = now.toISOString().slice(0, 16).replace('T', ' ')
    const newCustomer: CustomerMock = {
      id: `CLI-${Math.floor(1000 + Math.random() * 9000)}`,
      nome: createForm.nome,
      cpf: createForm.cpf,
      rg: createForm.rg,
      email: createForm.email,
      telefone: createForm.telefone,
      telefoneSecundario: createForm.telefoneSecundario || undefined,
      statusPagamento: 'Aguardando primeiro pagamento',
      kanbanLane: 'documentacao_pendente',
      vendedor: createForm.vendedor || 'Nao atribuido',
      createdAt: timestamp.slice(0, 10),
      documentosPendentes: false,
      appStatus: 'pendente',
      processoRmc: createForm.processoRmc || '0000000-00.2025.8.00.0000',
      processoSuper: createForm.processoSuper || '0000000-00.2025.8.00.0000',
      endereco: createForm.endereco,
      numero: createForm.numero,
      bairro: createForm.bairro,
      cep: createForm.cep,
      cidade: createForm.cidade,
      estado: createForm.estado,
      servicoContratado: createForm.servicoContratado,
      contratoValor: createForm.contratoValor,
      formaPagamento: createForm.formaPagamento,
      parcelas: createForm.parcelas,
      parcelasPagas: [],
      idade: 0,
      genero: '',
      profissao: '',
      estadoCivil: '',
      situacao: '',
      vulnerabilidade: '',
      escolaridade: '',
      dependentes: false,
      numeroDependentes: 0,
      rendaIndividual: '',
      rendaFamiliar: '',
      despesas: {
        luz: '',
        agua: '',
        telefone: '',
        internet: '',
        aluguel: '',
        prestacaoCasa: '',
        alimentacao: '',
        planoSaude: '',
        medicamentos: '',
        impostos: '',
        transporte: '',
        outras: '',
      },
      causaDividas: '',
      numeroCredores: 0,
      comprometimentoMensal: '',
      cadastroInadimplencia: false,
      casaPropria: false,
      financiamentoVeiculo: false,
      files: [],
      timeline: [
        {
          id: `T-${now.getTime()}`,
          title: 'Cliente criado no painel',
          description: 'Cadastro criado manualmente.',
          timestamp,
          type: 'update',
        },
      ],
      appTimeline: [],
    }

    setCustomers((prev) => [newCustomer, ...prev])
    setCreateOpen(false)
    resetCreateForm()
  }

  function handleDragStart(customerId: string) {
    setDraggingId(customerId)
  }

  function handleDrop(targetLane: CustomerMock['kanbanLane']) {
    if (!draggingId) return
    const dragged = customers.find((customer) => customer.id === draggingId)
    if (!dragged) return
    const allowed = ['documentacao_pendente', 'documentacao_enviada'] as const
    if (!allowed.includes(dragged.kanbanLane) || !allowed.includes(targetLane)) return
    if (dragged.kanbanLane === targetLane) return
    updateCustomer(draggingId, (customer) => ({ ...customer, kanbanLane: targetLane }))
    addTimeline(
      draggingId,
      buildTimelineItem(
        'Movimento manual no kanban',
        `Cliente movido para ${targetLane.replace('_', ' ')}.`,
        'documento'
      )
    )
    setDraggingId(null)
  }

  function handleSendToLegal() {
    if (!selectedCustomer) return
    if (!legalMessage.trim()) return
    upsertLegalTicket({
      clienteId: selectedCustomer.id,
      clienteNome: selectedCustomer.nome,
      message: legalMessage.trim(),
      author: 'equipe',
    })
    addTimeline(
      selectedCustomer.id,
      buildTimelineItem('Mensagem ao juridico', 'Caso encaminhado para analise.', 'juridico')
    )
    setLegalMessage('')
    setLegalMessageOpen(false)
  }

  function handleAttachFile() {
    if (!selectedCustomer) return
    const now = new Date()
    const timestamp = now.toISOString().slice(0, 16).replace('T', ' ')
    updateCustomer(selectedCustomer.id, (customer) => ({
      ...customer,
      files: [
        {
          id: `F-${now.getTime()}`,
          name: 'novo_arquivo.pdf',
          type: 'pdf',
          timestamp,
          status: 'aprovado',
          source: 'equipe',
        },
        ...customer.files,
      ],
    }))
    addTimeline(
      selectedCustomer.id,
      buildTimelineItem('Arquivo anexado', 'Arquivo incluido manualmente.', 'documento')
    )
  }

  function handleApproveFile(fileId: string) {
    if (!selectedCustomer) return
    updateCustomer(selectedCustomer.id, (customer) => {
      const files = customer.files.map((file) =>
        file.id === fileId ? { ...file, status: 'aprovado' } : file
      )
      return {
        ...customer,
        files,
        documentosPendentes: files.some((file) => file.status === 'pendente'),
        documentosRecusados: false,
      }
    })
    addTimeline(
      selectedCustomer.id,
      buildTimelineItem('Documento aprovado', 'Arquivo aprovado pela equipe.', 'documento')
    )
  }

  function handleRejectFile(fileId: string) {
    if (!selectedCustomer) return
    if (!rejectReason.trim()) return
    updateCustomer(selectedCustomer.id, (customer) => {
      const files = customer.files.filter((file) => file.id !== fileId)
      return {
        ...customer,
        files,
        documentosPendentes: files.some((file) => file.status === 'pendente'),
        documentosRecusados: true,
      }
    })
    addTimeline(
      selectedCustomer.id,
      buildTimelineItem('Documento recusado', `Motivo: ${rejectReason.trim()}`, 'documento')
    )
    setRejectingFileId(null)
    setRejectReason('')
  }

  function startEditing(customer: CustomerMock) {
    setDraft({
      email: customer.email,
      telefone: customer.telefone,
      telefoneSecundario: customer.telefoneSecundario ?? '',
      processoSuper: customer.processoSuper,
      processoRmc: customer.processoRmc,
      appStatus: customer.appStatus,
    })
    setEditing(true)
  }

  function cancelEditing() {
    setEditing(false)
  }

  function saveEditing() {
    if (!selectedCustomer) return
    updateCustomer(selectedCustomer.id, (customer) => ({
      ...customer,
      email: draft.email,
      telefone: draft.telefone,
      telefoneSecundario: draft.telefoneSecundario || undefined,
      processoSuper: draft.processoSuper,
      processoRmc: draft.processoRmc,
      appStatus: draft.appStatus,
    }))
    addTimeline(
      selectedCustomer.id,
      buildTimelineItem('Dados editados', 'Contato e processos atualizados no painel.', 'update')
    )
    setEditing(false)
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Clientes"
        subtitle="Kanban experimental com timeline, documentos e status financeiros."
        actions={
          <>
            <button
              onClick={() => setCreateOpen(true)}
              className="rounded-full bg-ink px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white"
            >
              Novo cliente
            </button>
          </>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'Total clientes', value: customers.length },
          { label: 'Em dia', value: customers.filter((c) => c.kanbanLane === 'em_dia').length },
          { label: 'Docs pendentes', value: customers.filter((c) => c.documentosPendentes).length },
          { label: 'Inadimplentes', value: customers.filter((c) => c.kanbanLane === 'inadimplentes').length },
        ].map((stat) => (
          <div key={stat.label} className="surface-panel p-5">
            <p className="text-xs uppercase tracking-[0.2em] text-ink/40">{stat.label}</p>
            <p className="mt-4 text-3xl font-display text-ink">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Buscar por nome, email, CPF ou telefone"
          className="w-full rounded-full border border-stroke bg-white/80 px-5 py-3 text-sm shadow-soft outline-none focus:border-ink sm:max-w-md"
        />
        <select
          value={sellerFilter}
          onChange={(event) => setSellerFilter(event.target.value)}
          className="w-full rounded-full border border-stroke bg-white/80 px-5 py-3 text-sm shadow-soft outline-none focus:border-ink sm:max-w-md"
        >
          <option value="">Vendedor responsavel</option>
          {sellerOptions.map((seller) => (
            <option key={seller} value={seller}>
              {seller}
            </option>
          ))}
        </select>
        <select
          value={laneFilter}
          onChange={(event) => setLaneFilter(event.target.value)}
          className="rounded-full border border-stroke bg-white/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-ink/70"
        >
          <option value="all">Todas as colunas</option>
          {LANE_CONFIG.map((lane) => (
            <option key={lane.key} value={lane.key}>
              {lane.title}
            </option>
          ))}
        </select>
        <select
          value={dateFilter}
          onChange={(event) => setDateFilter(event.target.value)}
          className="rounded-full border border-stroke bg-white/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-ink/70"
        >
          {DATE_FILTERS.map((filter) => (
            <option key={filter.value} value={filter.value}>
              {filter.label}
            </option>
          ))}
        </select>
        {dateFilter === 'year' ? (
          <select
            value={selectedYear}
            onChange={(event) => setSelectedYear(event.target.value)}
            className="rounded-full border border-stroke bg-white/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-ink/70"
          >
            {Array.from({ length: 6 }, (_, index) => {
              const year = new Date().getFullYear() - 2 + index
              return (
                <option key={year} value={String(year)}>
                  {year}
                </option>
              )
            })}
          </select>
        ) : null}
        {dateFilter === 'custom' ? (
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="date"
              value={customStart}
              onChange={(event) => setCustomStart(event.target.value)}
              className="rounded-full border border-stroke bg-white/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-ink/70"
            />
            <span className="text-xs uppercase tracking-[0.2em] text-ink/50">ate</span>
            <input
              type="date"
              value={customEnd}
              onChange={(event) => setCustomEnd(event.target.value)}
              className="rounded-full border border-stroke bg-white/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-ink/70"
            />
          </div>
        ) : null}
        <span className="accent-pill">filtros experimentais</span>
      </div>

      <div className="grid gap-5 lg:grid-cols-2 xl:grid-cols-5">
        {LANE_CONFIG.map((lane) => {
          const laneItems = grouped[lane.key] ?? []
          const canDrop = lane.key === 'documentacao_pendente' || lane.key === 'documentacao_enviada'
          return (
            <div
              key={lane.key}
              className={`surface-panel flex min-h-[320px] flex-col border-l-4 ${lane.tone}`}
              onDragOver={(event) => {
                if (canDrop) event.preventDefault()
              }}
              onDrop={() => {
                if (canDrop) handleDrop(lane.key)
              }}
            >
              <div className="flex items-center justify-between border-b border-stroke/70 px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-ink">{lane.title}</p>
                  <p className="text-xs text-ink/50">{laneItems.length} clientes</p>
                </div>
                <span className={`text-xs font-semibold uppercase tracking-[0.2em] ${lane.badge}`}>
                  {laneItems.length}
                </span>
              </div>
              <div className="flex flex-1 flex-col gap-3 p-4">
                {laneItems.map((customer) => (
                  <button
                    key={customer.id}
                    onClick={() => setSelectedId(customer.id)}
                    className="rounded-2xl border border-stroke bg-white/90 p-4 text-left shadow-soft transition hover:shadow-card"
                    draggable={
                      customer.kanbanLane === 'documentacao_pendente' ||
                      customer.kanbanLane === 'documentacao_enviada'
                    }
                    onDragStart={() => handleDragStart(customer.id)}
                    onDragEnd={() => setDraggingId(null)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-ink">{customer.nome}</p>
                        <p className="text-xs text-ink/50">{customer.cpf}</p>
                      </div>
                      {customer.files.some((file) => file.status === 'pendente') ? (
                        <span className="rounded-full border border-amber-300 bg-amber-50 px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-amber-700">
                          docs pendentes
                        </span>
                      ) : null}
                      {customer.documentosRecusados ? (
                        <span className="rounded-full border border-rose-300 bg-rose-50 px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-rose-700">
                          recusado
                        </span>
                      ) : null}
                    </div>
                    <div className="mt-3 text-xs text-ink/60">
                      <p>{customer.email}</p>
                      <p>{customer.telefone}</p>
                      <p>Super: {customer.processoSuper}</p>
                      <p>RMC: {customer.processoRmc}</p>
                      <p>Responsavel: {customer.vendedor}</p>
                    </div>
                    <div className="mt-3 flex items-center justify-between text-[11px] uppercase tracking-[0.2em] text-ink/50">
                      <span>{customer.statusPagamento}</span>
                      <span>{customer.vendedor}</span>
                    </div>
                  </button>
                ))}
                {laneItems.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-stroke bg-white/50 p-4 text-xs text-ink/50">
                    Sem clientes nesta etapa.
                  </div>
                ) : null}
              </div>
            </div>
          )
        })}
      </div>

      <Modal
        open={Boolean(selectedCustomer)}
        title={selectedCustomer ? `${selectedCustomer.nome} · ${selectedCustomer.id}` : 'Cliente'}
        onClose={() => setSelectedId(null)}
        size="xl"
      >
        {selectedCustomer ? (
          <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="space-y-6">
              <section className="surface-panel p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-ink/40">Contato</p>
                    <p className="mt-2 text-sm font-semibold text-ink">{selectedCustomer.email}</p>
                    <p className="text-xs text-ink/60">{selectedCustomer.telefone}</p>
                    {selectedCustomer.telefoneSecundario ? (
                      <p className="text-xs text-ink/60">{selectedCustomer.telefoneSecundario}</p>
                    ) : null}
                  </div>
                  <div className="text-xs uppercase tracking-[0.2em] text-ink/50">
                    <p>{selectedCustomer.cidade}</p>
                    <p>{selectedCustomer.estado}</p>
                  </div>
                </div>
              </section>
              <section className="surface-panel p-5">
                <div className="grid gap-3 text-sm text-ink/70 sm:grid-cols-2">
                  <div className="rounded-xl border border-stroke bg-white/80 px-3 py-2">
                    <p className="text-xs uppercase tracking-[0.2em] text-ink/40">CPF</p>
                    <p className="mt-1 font-semibold text-ink">{selectedCustomer.cpf}</p>
                  </div>
                  <div className="rounded-xl border border-stroke bg-white/80 px-3 py-2">
                    <p className="text-xs uppercase tracking-[0.2em] text-ink/40">RG</p>
                    <p className="mt-1 font-semibold text-ink">{selectedCustomer.rg}</p>
                  </div>
                </div>
              </section>
              <section className="surface-panel p-5">
                <p className="text-xs uppercase tracking-[0.2em] text-ink/40">Endereco</p>
                <div className="mt-3 grid gap-3 text-sm text-ink/70 sm:grid-cols-2">
                  <div className="rounded-xl border border-stroke bg-white/80 px-3 py-2">
                    {selectedCustomer.endereco}, {selectedCustomer.numero}
                  </div>
                  <div className="rounded-xl border border-stroke bg-white/80 px-3 py-2">
                    {selectedCustomer.bairro}
                  </div>
                  <div className="rounded-xl border border-stroke bg-white/80 px-3 py-2">
                    {selectedCustomer.cidade} - {selectedCustomer.estado}
                  </div>
                  <div className="rounded-xl border border-stroke bg-white/80 px-3 py-2">
                    CEP {selectedCustomer.cep}
                  </div>
                </div>
              </section>

              <section className="surface-panel p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-ink/40">Financeiro</p>
                    <p className="mt-2 text-sm font-semibold text-ink">{selectedCustomer.contratoValor}</p>
                    <p className="text-xs text-ink/60">{selectedCustomer.parcelas}</p>
                  </div>
                  <span className="rounded-full border border-stroke bg-white px-3 py-1 text-xs uppercase tracking-[0.2em] text-ink/70">
                    {selectedCustomer.statusPagamento}
                  </span>
                </div>
                <div className="mt-4 grid gap-3 text-sm text-ink/70 sm:grid-cols-2">
                  <div className="rounded-xl border border-stroke bg-white/80 px-3 py-2">
                    Servico: {selectedCustomer.servicoContratado}
                  </div>
                  <div className="rounded-xl border border-stroke bg-white/80 px-3 py-2">
                    Forma de pagamento: {selectedCustomer.formaPagamento}
                  </div>
                </div>
              </section>
              <section className="surface-panel p-5">
                <p className="text-xs uppercase tracking-[0.2em] text-ink/40">Parcelas pagas</p>
                <div className="mt-3 space-y-2 text-sm text-ink/70">
                  {selectedCustomer.parcelasPagas.map((parcela) => (
                    <div key={parcela.label} className="rounded-xl border border-stroke bg-white/80 px-3 py-2">
                      {parcela.label} - {parcela.vencimento} {parcela.status}
                    </div>
                  ))}
                </div>
              </section>

              <section className="surface-panel p-5">
                <p className="text-xs uppercase tracking-[0.2em] text-ink/40">Processos</p>
                <div className="mt-3 grid gap-3 text-sm text-ink/70 sm:grid-cols-2">
                  <div className="rounded-xl border border-stroke bg-white/80 px-3 py-2">
                    Processo super: {selectedCustomer.processoSuper}
                  </div>
                  <div className="rounded-xl border border-stroke bg-white/80 px-3 py-2">
                    Processo RMC: {selectedCustomer.processoRmc}
                  </div>
                </div>
              </section>
              <section className="surface-panel p-5">
                <p className="text-xs uppercase tracking-[0.2em] text-ink/40">Perfil</p>
                <div className="mt-3 grid gap-3 text-sm text-ink/70 sm:grid-cols-2">
                  <div className="rounded-xl border border-stroke bg-white/80 px-3 py-2">
                    Idade: {selectedCustomer.idade}
                  </div>
                  <div className="rounded-xl border border-stroke bg-white/80 px-3 py-2">
                    Genero: {selectedCustomer.genero}
                  </div>
                  <div className="rounded-xl border border-stroke bg-white/80 px-3 py-2">
                    Profissao: {selectedCustomer.profissao}
                  </div>
                  <div className="rounded-xl border border-stroke bg-white/80 px-3 py-2">
                    Estado civil: {selectedCustomer.estadoCivil}
                  </div>
                  <div className="rounded-xl border border-stroke bg-white/80 px-3 py-2">
                    Situacao: {selectedCustomer.situacao}
                  </div>
                  <div className="rounded-xl border border-stroke bg-white/80 px-3 py-2">
                    Vulnerabilidade: {selectedCustomer.vulnerabilidade}
                  </div>
                  <div className="rounded-xl border border-stroke bg-white/80 px-3 py-2">
                    Escolaridade: {selectedCustomer.escolaridade}
                  </div>
                  <div className="rounded-xl border border-stroke bg-white/80 px-3 py-2">
                    Dependentes: {selectedCustomer.dependentes ? 'Sim' : 'Nao'} ({selectedCustomer.numeroDependentes})
                  </div>
                </div>
              </section>
              <section className="surface-panel p-5">
                <p className="text-xs uppercase tracking-[0.2em] text-ink/40">Renda e despesas</p>
                <div className="mt-3 grid gap-3 text-sm text-ink/70 sm:grid-cols-2">
                  <div className="rounded-xl border border-stroke bg-white/80 px-3 py-2">
                    Renda individual: {selectedCustomer.rendaIndividual}
                  </div>
                  <div className="rounded-xl border border-stroke bg-white/80 px-3 py-2">
                    Renda familiar: {selectedCustomer.rendaFamiliar}
                  </div>
                  <div className="rounded-xl border border-stroke bg-white/80 px-3 py-2">
                    Luz: {selectedCustomer.despesas.luz}
                  </div>
                  <div className="rounded-xl border border-stroke bg-white/80 px-3 py-2">
                    Agua: {selectedCustomer.despesas.agua}
                  </div>
                  <div className="rounded-xl border border-stroke bg-white/80 px-3 py-2">
                    Telefone: {selectedCustomer.despesas.telefone}
                  </div>
                  <div className="rounded-xl border border-stroke bg-white/80 px-3 py-2">
                    Internet: {selectedCustomer.despesas.internet}
                  </div>
                  <div className="rounded-xl border border-stroke bg-white/80 px-3 py-2">
                    Aluguel: {selectedCustomer.despesas.aluguel}
                  </div>
                  <div className="rounded-xl border border-stroke bg-white/80 px-3 py-2">
                    Prestacao casa: {selectedCustomer.despesas.prestacaoCasa}
                  </div>
                  <div className="rounded-xl border border-stroke bg-white/80 px-3 py-2">
                    Alimentacao: {selectedCustomer.despesas.alimentacao}
                  </div>
                  <div className="rounded-xl border border-stroke bg-white/80 px-3 py-2">
                    Plano de saude: {selectedCustomer.despesas.planoSaude}
                  </div>
                  <div className="rounded-xl border border-stroke bg-white/80 px-3 py-2">
                    Medicamentos: {selectedCustomer.despesas.medicamentos}
                  </div>
                  <div className="rounded-xl border border-stroke bg-white/80 px-3 py-2">
                    Impostos: {selectedCustomer.despesas.impostos}
                  </div>
                  <div className="rounded-xl border border-stroke bg-white/80 px-3 py-2">
                    Transporte: {selectedCustomer.despesas.transporte}
                  </div>
                  <div className="rounded-xl border border-stroke bg-white/80 px-3 py-2">
                    Outras: {selectedCustomer.despesas.outras}
                  </div>
                </div>
              </section>
              <section className="surface-panel p-5">
                <p className="text-xs uppercase tracking-[0.2em] text-ink/40">Dividas</p>
                <div className="mt-3 grid gap-3 text-sm text-ink/70 sm:grid-cols-2">
                  <div className="rounded-xl border border-stroke bg-white/80 px-3 py-2">
                    Causa: {selectedCustomer.causaDividas}
                  </div>
                  <div className="rounded-xl border border-stroke bg-white/80 px-3 py-2">
                    Numero de credores: {selectedCustomer.numeroCredores}
                  </div>
                  <div className="rounded-xl border border-stroke bg-white/80 px-3 py-2">
                    Comprometimento mensal: {selectedCustomer.comprometimentoMensal}
                  </div>
                  <div className="rounded-xl border border-stroke bg-white/80 px-3 py-2">
                    Cadastro de inadimplencia: {selectedCustomer.cadastroInadimplencia ? 'Sim' : 'Nao'}
                  </div>
                  <div className="rounded-xl border border-stroke bg-white/80 px-3 py-2">
                    Casa propria: {selectedCustomer.casaPropria ? 'Sim' : 'Nao'}
                  </div>
                  <div className="rounded-xl border border-stroke bg-white/80 px-3 py-2">
                    Financiamento veiculo: {selectedCustomer.financiamentoVeiculo ? 'Sim' : 'Nao'}
                  </div>
                </div>
              </section>

              <section className="surface-panel p-5">
                <div className="flex items-center justify-between">
                  <p className="text-xs uppercase tracking-[0.2em] text-ink/40">Timeline</p>
                  <span className="accent-pill">scroll infinito (mock)</span>
                </div>
                <div className="mt-4 space-y-4 text-sm text-ink/70">
                  {selectedCustomer.timeline.map((item) => (
                    <div key={item.id} className="border-l-2 border-stroke pl-3">
                      <span
                        className={`mb-2 inline-flex rounded-full border px-2 py-1 text-[10px] uppercase tracking-[0.2em] ${timelineTone[item.type]}`}
                      >
                        {item.type}
                      </span>
                      <p className="font-semibold text-ink">{item.title}</p>
                      <p className="text-xs text-ink/60">{item.description}</p>
                      <p className="text-[11px] uppercase tracking-[0.2em] text-ink/40">{item.timestamp}</p>
                    </div>
                  ))}
                </div>
              </section>
            </div>

            <div className="space-y-6">
              <section className="surface-panel p-5">
                <p className="text-xs uppercase tracking-[0.2em] text-ink/40">Documentos</p>
                <div className="mt-4 space-y-3">
                  {pendingFiles.length > 0 ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-[11px] uppercase tracking-[0.2em] text-purple-700">Documentos pendentes</p>
                        <span className="rounded-full border border-purple-200 bg-purple-50 px-2 py-0.5 text-[10px] uppercase tracking-[0.2em] text-purple-700">
                          {pendingFiles.length} analisar
                        </span>
                      </div>
                      {pendingFiles.map((file) => (
                        <div
                          key={file.id}
                          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-purple-200 bg-purple-50/70 px-3 py-2 text-xs"
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-semibold text-ink">{file.name}</p>
                              <span className="rounded-full border border-purple-300 bg-purple-100 px-2 py-0.5 text-[10px] uppercase tracking-[0.2em] text-purple-700">
                                analisar
                              </span>
                            </div>
                            <p className="text-ink/50">{file.type} · {file.timestamp}</p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <span className="rounded-full border border-stroke px-2 py-1 uppercase tracking-[0.2em] text-ink/50">
                              ver
                            </span>
                            <button
                              onClick={() => handleApproveFile(file.id)}
                              className="rounded-full bg-ink px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-white"
                            >
                              aprovar
                            </button>
                            <button
                              onClick={() => {
                                setRejectingFileId(file.id)
                                setRejectReason('')
                              }}
                              className="rounded-full border border-stroke bg-white px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-ink/70"
                            >
                              recusar
                            </button>
                          </div>
                          {rejectingFileId === file.id ? (
                            <div className="w-full space-y-2 rounded-xl border border-purple-200 bg-white/80 px-3 py-2">
                              <textarea
                                value={rejectReason}
                                onChange={(event) => setRejectReason(event.target.value)}
                                rows={2}
                                placeholder="Informe o motivo da recusa"
                                className="w-full rounded-lg border border-stroke bg-white px-3 py-2 text-xs shadow-soft outline-none focus:border-ink"
                              />
                              <div className="flex flex-wrap gap-2">
                                <button
                                  onClick={() => handleRejectFile(file.id)}
                                  className="rounded-full bg-ink px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-white"
                                >
                                  confirmar recusa
                                </button>
                                <button
                                  onClick={() => {
                                    setRejectingFileId(null)
                                    setRejectReason('')
                                  }}
                                  className="rounded-full border border-stroke bg-white px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-ink/70"
                                >
                                  cancelar
                                </button>
                              </div>
                            </div>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  ) : null}
                  <div className="space-y-2">
                    <p className="text-[11px] uppercase tracking-[0.2em] text-ink/40">Documentos aprovados</p>
                    {approvedFiles.map((file) => (
                      <div key={file.id} className="flex items-center justify-between rounded-xl border border-stroke bg-white/80 px-3 py-2 text-xs">
                        <div>
                          <p className="font-semibold text-ink">{file.name}</p>
                          <p className="text-ink/50">{file.type} · {file.timestamp}</p>
                        </div>
                        <span className="rounded-full border border-stroke px-2 py-1 uppercase tracking-[0.2em] text-ink/50">
                          ver
                        </span>
                      </div>
                    ))}
                    {approvedFiles.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-stroke bg-white/60 px-3 py-2 text-xs text-ink/50">
                        Nenhum documento aprovado.
                      </div>
                    ) : null}
                  </div>
                  <button
                    onClick={handleAttachFile}
                    className="w-full rounded-xl border border-stroke bg-white px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-ink/70"
                  >
                    Anexar arquivo (mock)
                  </button>
                </div>
              </section>

              <section className="surface-panel space-y-4 p-5">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-ink/40">Enviar ao juridico</p>
                  <p className="mt-2 text-sm text-ink/60">Simula envio de mensagem e atualiza timeline.</p>
                </div>
                {legalMessageOpen ? (
                  <div className="space-y-3">
                    <textarea
                      value={legalMessage}
                      onChange={(event) => setLegalMessage(event.target.value)}
                      rows={3}
                      placeholder="Escreva a mensagem para o juridico..."
                      className="w-full rounded-2xl border border-stroke bg-white/80 px-4 py-3 text-sm shadow-soft outline-none focus:border-ink"
                    />
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={handleSendToLegal}
                        className="rounded-full bg-ink px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white"
                      >
                        Enviar
                      </button>
                      <button
                        onClick={() => {
                          setLegalMessageOpen(false)
                          setLegalMessage('')
                        }}
                        className="rounded-full border border-stroke bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-ink/70"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setLegalMessageOpen(true)}
                    className="rounded-xl bg-ink px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white"
                  >
                    Enviar mensagem
                  </button>
                )}
              </section>


              <section className="surface-panel p-5">
                <p className="text-xs uppercase tracking-[0.2em] text-ink/40">Ajustes rapidos</p>
                {!editing ? (
                  <div className="mt-3 space-y-3 text-xs text-ink/60">
                    <p>Editar telefone, email e processos (mock).</p>
                    <p>Status do app: {selectedCustomer.appStatus}.</p>
                    <button
                      onClick={() => startEditing(selectedCustomer)}
                      className="rounded-full border border-stroke bg-white px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-ink/70"
                    >
                      Editar dados
                    </button>
                  </div>
                ) : (
                  <div className="mt-4 space-y-3 text-xs text-ink/60">
                    <input
                      value={draft.email}
                      onChange={(event) => setDraft((prev) => ({ ...prev, email: event.target.value }))}
                      className="w-full rounded-xl border border-stroke bg-white/80 px-3 py-2 text-sm shadow-soft outline-none focus:border-ink"
                      placeholder="Email"
                    />
                    <input
                      value={draft.telefone}
                      onChange={(event) => setDraft((prev) => ({ ...prev, telefone: event.target.value }))}
                      className="w-full rounded-xl border border-stroke bg-white/80 px-3 py-2 text-sm shadow-soft outline-none focus:border-ink"
                      placeholder="Telefone"
                    />
                    <input
                      value={draft.telefoneSecundario}
                      onChange={(event) => setDraft((prev) => ({ ...prev, telefoneSecundario: event.target.value }))}
                      className="w-full rounded-xl border border-stroke bg-white/80 px-3 py-2 text-sm shadow-soft outline-none focus:border-ink"
                      placeholder="Telefone secundario"
                    />
                    <input
                      value={draft.processoSuper}
                      onChange={(event) => setDraft((prev) => ({ ...prev, processoSuper: event.target.value }))}
                      className="w-full rounded-xl border border-stroke bg-white/80 px-3 py-2 text-sm shadow-soft outline-none focus:border-ink"
                      placeholder="Processo super-endividamento"
                    />
                    <input
                      value={draft.processoRmc}
                      onChange={(event) => setDraft((prev) => ({ ...prev, processoRmc: event.target.value }))}
                      className="w-full rounded-xl border border-stroke bg-white/80 px-3 py-2 text-sm shadow-soft outline-none focus:border-ink"
                      placeholder="Processo RMC"
                    />
                    <select
                      value={draft.appStatus}
                      onChange={(event) =>
                        setDraft((prev) => ({ ...prev, appStatus: event.target.value as CustomerMock['appStatus'] }))
                      }
                      className="w-full rounded-xl border border-stroke bg-white/80 px-3 py-2 text-sm shadow-soft outline-none focus:border-ink"
                    >
                      <option value="pendente">Acesso pendente</option>
                      <option value="liberado">Acesso liberado</option>
                      <option value="bloqueado">Acesso bloqueado</option>
                    </select>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={saveEditing}
                        className="rounded-full bg-ink px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white"
                      >
                        Salvar
                      </button>
                      <button
                        onClick={cancelEditing}
                        className="rounded-full border border-stroke bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-ink/70"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}
              </section>
            </div>
          </div>
        ) : null}
      </Modal>

      <Modal open={createOpen} title="Novo cliente" onClose={() => setCreateOpen(false)} size="md">
        <form className="space-y-4" onSubmit={handleCreateCustomer}>
          <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-ink/50">
            Nome completo *
            <input
              value={createForm.nome}
              onChange={(event) => setCreateForm((prev) => ({ ...prev, nome: event.target.value }))}
              className="mt-2 w-full rounded-xl border border-stroke bg-white px-4 py-3 text-sm text-ink shadow-soft outline-none focus:border-ink"
              placeholder="Nome do cliente"
              required
            />
          </label>
          <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-ink/50">
            Telefone *
            <input
              value={createForm.telefone}
              onChange={(event) => setCreateForm((prev) => ({ ...prev, telefone: event.target.value }))}
              className="mt-2 w-full rounded-xl border border-stroke bg-white px-4 py-3 text-sm text-ink shadow-soft outline-none focus:border-ink"
              placeholder="(00) 00000-0000"
              required
            />
          </label>
          <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-ink/50">
            Email *
            <input
              value={createForm.email}
              onChange={(event) => setCreateForm((prev) => ({ ...prev, email: event.target.value }))}
              className="mt-2 w-full rounded-xl border border-stroke bg-white px-4 py-3 text-sm text-ink shadow-soft outline-none focus:border-ink"
              placeholder="email@cliente.com"
              required
            />
          </label>
          <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-ink/50">
            CPF *
            <input
              value={createForm.cpf}
              onChange={(event) => setCreateForm((prev) => ({ ...prev, cpf: event.target.value }))}
              className="mt-2 w-full rounded-xl border border-stroke bg-white px-4 py-3 text-sm text-ink shadow-soft outline-none focus:border-ink"
              placeholder="000.000.000-00"
              required
            />
          </label>
          <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-ink/50">
            RG (opcional)
            <input
              value={createForm.rg}
              onChange={(event) => setCreateForm((prev) => ({ ...prev, rg: event.target.value }))}
              className="mt-2 w-full rounded-xl border border-stroke bg-white px-4 py-3 text-sm text-ink shadow-soft outline-none focus:border-ink"
              placeholder="00.000.000-0"
            />
          </label>
          <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-ink/50">
            Telefone secundario (opcional)
            <input
              value={createForm.telefoneSecundario}
              onChange={(event) =>
                setCreateForm((prev) => ({ ...prev, telefoneSecundario: event.target.value }))
              }
              className="mt-2 w-full rounded-xl border border-stroke bg-white px-4 py-3 text-sm text-ink shadow-soft outline-none focus:border-ink"
            />
          </label>
          <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-ink/50">
            Vendedor (opcional)
            <input
              value={createForm.vendedor}
              onChange={(event) => setCreateForm((prev) => ({ ...prev, vendedor: event.target.value }))}
              className="mt-2 w-full rounded-xl border border-stroke bg-white px-4 py-3 text-sm text-ink shadow-soft outline-none focus:border-ink"
              placeholder="Nome do vendedor"
            />
          </label>
          <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-ink/50">
            Endereco (opcional)
            <input
              value={createForm.endereco}
              onChange={(event) => setCreateForm((prev) => ({ ...prev, endereco: event.target.value }))}
              className="mt-2 w-full rounded-xl border border-stroke bg-white px-4 py-3 text-sm text-ink shadow-soft outline-none focus:border-ink"
              placeholder="Rua, avenida, etc."
            />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-ink/50">
              Numero (opcional)
              <input
                value={createForm.numero}
                onChange={(event) => setCreateForm((prev) => ({ ...prev, numero: event.target.value }))}
                className="mt-2 w-full rounded-xl border border-stroke bg-white px-4 py-3 text-sm text-ink shadow-soft outline-none focus:border-ink"
              />
            </label>
            <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-ink/50">
              Bairro (opcional)
              <input
                value={createForm.bairro}
                onChange={(event) => setCreateForm((prev) => ({ ...prev, bairro: event.target.value }))}
                className="mt-2 w-full rounded-xl border border-stroke bg-white px-4 py-3 text-sm text-ink shadow-soft outline-none focus:border-ink"
              />
            </label>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-ink/50">
              Cidade (opcional)
              <input
                value={createForm.cidade}
                onChange={(event) => setCreateForm((prev) => ({ ...prev, cidade: event.target.value }))}
                className="mt-2 w-full rounded-xl border border-stroke bg-white px-4 py-3 text-sm text-ink shadow-soft outline-none focus:border-ink"
              />
            </label>
            <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-ink/50">
              Estado (opcional)
              <input
                value={createForm.estado}
                onChange={(event) => setCreateForm((prev) => ({ ...prev, estado: event.target.value }))}
                className="mt-2 w-full rounded-xl border border-stroke bg-white px-4 py-3 text-sm text-ink shadow-soft outline-none focus:border-ink"
              />
            </label>
            <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-ink/50">
              CEP (opcional)
              <input
                value={createForm.cep}
                onChange={(event) => setCreateForm((prev) => ({ ...prev, cep: event.target.value }))}
                className="mt-2 w-full rounded-xl border border-stroke bg-white px-4 py-3 text-sm text-ink shadow-soft outline-none focus:border-ink"
              />
            </label>
          </div>
          <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-ink/50">
            Processo super-endividamento (opcional)
            <input
              value={createForm.processoSuper}
              onChange={(event) => setCreateForm((prev) => ({ ...prev, processoSuper: event.target.value }))}
              className="mt-2 w-full rounded-xl border border-stroke bg-white px-4 py-3 text-sm text-ink shadow-soft outline-none focus:border-ink"
              placeholder="0879645-70.2025.8.20.5001"
            />
          </label>
          <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-ink/50">
            Processo RMC (opcional)
            <input
              value={createForm.processoRmc}
              onChange={(event) => setCreateForm((prev) => ({ ...prev, processoRmc: event.target.value }))}
              className="mt-2 w-full rounded-xl border border-stroke bg-white px-4 py-3 text-sm text-ink shadow-soft outline-none focus:border-ink"
              placeholder="0879645-70.2025.8.20.5001"
            />
          </label>
          <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-ink/50">
            Servico contratado (opcional)
            <input
              value={createForm.servicoContratado}
              onChange={(event) => setCreateForm((prev) => ({ ...prev, servicoContratado: event.target.value }))}
              className="mt-2 w-full rounded-xl border border-stroke bg-white px-4 py-3 text-sm text-ink shadow-soft outline-none focus:border-ink"
            />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-ink/50">
              Valor do contrato (opcional)
              <input
                value={createForm.contratoValor}
                onChange={(event) => setCreateForm((prev) => ({ ...prev, contratoValor: event.target.value }))}
                className="mt-2 w-full rounded-xl border border-stroke bg-white px-4 py-3 text-sm text-ink shadow-soft outline-none focus:border-ink"
                placeholder="R$ 0,00"
              />
            </label>
            <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-ink/50">
              Parcelamento (opcional)
              <input
                value={createForm.parcelas}
                onChange={(event) => setCreateForm((prev) => ({ ...prev, parcelas: event.target.value }))}
                className="mt-2 w-full rounded-xl border border-stroke bg-white px-4 py-3 text-sm text-ink shadow-soft outline-none focus:border-ink"
                placeholder="12x"
              />
            </label>
          </div>
          <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-ink/50">
            Forma de pagamento (opcional)
            <input
              value={createForm.formaPagamento}
              onChange={(event) => setCreateForm((prev) => ({ ...prev, formaPagamento: event.target.value }))}
              className="mt-2 w-full rounded-xl border border-stroke bg-white px-4 py-3 text-sm text-ink shadow-soft outline-none focus:border-ink"
              placeholder="Boleto, Pix, Cartao"
            />
          </label>
          {createError ? (
            <div className="rounded-xl border border-accent/30 bg-accent/10 px-4 py-3 text-sm text-accent">
              {createError}
            </div>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              className="rounded-full bg-ink px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white"
            >
              Criar cliente
            </button>
            <button
              type="button"
              onClick={() => {
                setCreateOpen(false)
                resetCreateForm()
              }}
              className="rounded-full border border-stroke bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-ink/70"
            >
              Cancelar
            </button>
          </div>
          <p className="text-xs text-ink/50">Campos obrigatorios: nome, telefone, email e CPF.</p>
        </form>
      </Modal>
    </div>
  )
}
