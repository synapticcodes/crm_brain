import { useMemo, useState } from 'react'
import PageHeader from '../components/PageHeader'
import Modal from '../components/Modal'
import { customersMock, type CustomerMock } from '../lib/mockData'
import { formatTimestamp } from '../lib/formatTimestamp'

const STATUS_CONFIG = [
  {
    key: 'pendente',
    title: 'Pendente',
    tone: 'border-amber-300 bg-amber-50/70',
    badge: 'text-amber-700',
  },
  {
    key: 'liberado',
    title: 'Liberado',
    tone: 'border-emerald-300 bg-emerald-50/70',
    badge: 'text-emerald-700',
  },
  {
    key: 'bloqueado',
    title: 'Bloqueado',
    tone: 'border-rose-300 bg-rose-50/70',
    badge: 'text-rose-700',
  },
] as const

export default function AppAccessPage() {
  const [customers, setCustomers] = useState<CustomerMock[]>(customersMock)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [dateFilter, setDateFilter] = useState('all')
  const [selectedYear, setSelectedYear] = useState(String(new Date().getFullYear()))
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')

  const selectedCustomer = customers.find((customer) => customer.id === selectedId) ?? null

  const timelineLabelFor = (title: string) => {
    const normalized = title.toLowerCase()
    if (normalized.includes('documento')) return 'Documento'
    if (normalized.includes('cadastro') || normalized.includes('app')) return 'App'
    if (normalized.includes('validacao') || normalized.includes('processo')) return 'Processo'
    if (normalized.includes('acesso')) return 'App'
    return 'Atualizacao'
  }

  const timelineToneFor = (label: string) => {
    if (label === 'Documento') return 'border-amber-300 text-amber-700'
    if (label === 'App') return 'border-rose-300 text-rose-700'
    if (label === 'Processo') return 'border-stone-400 text-stone-700'
    return 'border-stroke text-ink/70'
  }

  const filteredCustomers = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    const now = Date.now()
    const rangeDays =
      dateFilter === 'all' || dateFilter === 'year' || dateFilter === 'custom'
        ? null
        : Number(dateFilter)

    return customers.filter((customer) => {
      const matchesQuery =
        !normalized ||
        [
          customer.nome,
          customer.telefone,
          customer.telefoneSecundario,
          customer.cpf,
          customer.processoSuper,
          customer.processoRmc,
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(normalized))

      const createdAt = new Date(customer.createdAt)
      const matchesDate = rangeDays
        ? now - createdAt.getTime() <= rangeDays * 24 * 60 * 60 * 1000
        : dateFilter === 'year'
        ? createdAt.getFullYear() === Number(selectedYear)
        : dateFilter === 'custom'
        ? (!customStart || createdAt >= new Date(customStart)) &&
          (!customEnd || createdAt <= new Date(customEnd))
        : true

      return matchesQuery && matchesDate
    })
  }, [customers, query, dateFilter, selectedYear, customStart, customEnd])

  const grouped = useMemo(() => {
    return filteredCustomers.reduce((acc, customer) => {
      if (!acc[customer.appStatus]) acc[customer.appStatus] = []
      acc[customer.appStatus].push(customer)
      return acc
    }, {} as Record<string, CustomerMock[]>)
  }, [filteredCustomers])

  function updateStatus(status: CustomerMock['appStatus']) {
    if (!selectedCustomer) return
    setCustomers((prev) =>
      prev.map((customer) =>
        customer.id === selectedCustomer.id
          ? { ...customer, appStatus: status }
          : customer
      )
    )
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Aplicativo"
        subtitle="Gerencie o acesso ao aplicativo mobile com bloqueio e liberação manual de usuários."
      />

      <div className="grid gap-4 md:grid-cols-3">
        {STATUS_CONFIG.map((item) => (
          <div key={item.key} className={`surface-panel border-l-4 p-5 ${item.tone}`}>
            <p className="text-xs uppercase tracking-[0.2em]">{item.title}</p>
            <p className="mt-3 text-3xl font-display text-ink">{grouped[item.key]?.length ?? 0}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Buscar por nome, telefone, CPF ou processo"
          className="w-full rounded-full border border-stroke bg-white/80 px-5 py-3 text-sm shadow-soft outline-none focus:border-accent sm:max-w-md"
        />
        <select
          value={dateFilter}
          onChange={(event) => setDateFilter(event.target.value)}
          className="rounded-full border border-stroke bg-white/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-ink/70"
        >
          <option value="all">Todo periodo</option>
          <option value="1">Diario</option>
          <option value="7">Semanal</option>
          <option value="30">Mensal</option>
          <option value="year">Anual</option>
          <option value="custom">Personalizado</option>
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
      </div>

      <div className="grid gap-4 pb-2 md:grid-cols-2 xl:grid-cols-3">
        {STATUS_CONFIG.map((status) => (
          <div key={status.key} className={`surface-panel flex h-[620px] flex-col overflow-hidden border-t-4 ${status.tone}`}>
            <div className="flex items-center justify-between border-b border-stroke/70 bg-white/60 px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-ink">{status.title}</p>
                <p className="text-xs text-slate-500">{grouped[status.key]?.length ?? 0} clientes</p>
              </div>
            </div>
            <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-4">
              {(grouped[status.key] ?? []).map((customer) => (
                <button
                  key={customer.id}
                  onClick={() => setSelectedId(customer.id)}
                  className={`rounded-xl border border-stroke bg-white p-4 text-left shadow-soft transition hover:shadow-card ${
                    customer.appStatus === 'bloqueado'
                      ? 'border-l-4 border-l-rose-400'
                      : customer.appStatus === 'pendente'
                      ? 'border-l-4 border-l-amber-400'
                      : 'border-l-4 border-l-emerald-400'
                  }`}
                >
                  <p className="text-sm font-semibold text-ink">{customer.nome}</p>
                  <p className="text-xs text-ink/50">{customer.cpf}</p>
                  <div className="mt-2 text-xs text-ink/60">
                    <p className="truncate">✉ {customer.email}</p>
                    <p>☎ {customer.telefone}</p>
                    {customer.telefoneSecundario ? <p>{customer.telefoneSecundario}</p> : null}
                    <p className="truncate">🧾 Super: {customer.processoSuper}</p>
                    <p className="truncate">🧾 RMC: {customer.processoRmc}</p>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[11px]">
                    <span
                      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] ${
                        customer.statusPagamento.toLowerCase().includes('inadimplente')
                          ? 'border-rose-300 bg-rose-50 text-rose-700'
                          : customer.statusPagamento.toLowerCase().includes('atraso')
                          ? 'border-amber-300 bg-amber-50 text-amber-700'
                          : customer.statusPagamento.toLowerCase().includes('em dia')
                          ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                          : 'border-slate-200 bg-slate-50 text-slate-500'
                      }`}
                    >
                      {customer.statusPagamento}
                    </span>
                    <span
                      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] ${
                        customer.appStatus === 'bloqueado'
                          ? 'border-rose-300 bg-rose-50 text-rose-700'
                          : customer.appStatus === 'pendente'
                          ? 'border-amber-300 bg-amber-50 text-amber-700'
                          : 'border-emerald-300 bg-emerald-50 text-emerald-700'
                      }`}
                    >
                      {customer.appStatus}
                    </span>
                  </div>
                </button>
              ))}
              {(grouped[status.key] ?? []).length === 0 ? (
                <div className="rounded-2xl border border-dashed border-stroke bg-white/50 p-4 text-xs text-ink/50">
                  Sem clientes nesta etapa.
                </div>
              ) : null}
            </div>
          </div>
        ))}
      </div>

      <Modal
        open={Boolean(selectedCustomer)}
        title={selectedCustomer ? `${selectedCustomer.nome} · ${selectedCustomer.id}` : 'Cliente'}
        onClose={() => setSelectedId(null)}
      >
        {selectedCustomer ? (
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-stroke bg-white/90 p-4 text-sm text-slate-600">
                <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                  <span className="h-2 w-2 rounded-full bg-accent/60" />
                  CPF
                </div>
                <p className="mt-2 font-semibold text-ink">{selectedCustomer.cpf}</p>
              </div>
              <div className="rounded-2xl border border-stroke bg-white/90 p-4 text-sm text-slate-600">
                <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                  <span className="h-2 w-2 rounded-full bg-accent/60" />
                  Email
                </div>
                <p className="mt-2 font-semibold text-ink">{selectedCustomer.email}</p>
              </div>
              <div className="rounded-2xl border border-stroke bg-white/90 p-4 text-sm text-slate-600">
                <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                  <span className="h-2 w-2 rounded-full bg-accent/60" />
                  Telefone
                </div>
                <p className="mt-2 font-semibold text-ink">{selectedCustomer.telefone}</p>
                {selectedCustomer.telefoneSecundario ? (
                  <p className="text-xs text-slate-500">{selectedCustomer.telefoneSecundario}</p>
                ) : null}
              </div>
              <div className="rounded-2xl border border-stroke bg-white/90 p-4 text-sm text-slate-600 md:col-span-3">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                  <span className="h-2 w-2 rounded-full bg-accent/60" />
                  Processos
                </div>
                <div className="mt-3 grid gap-2 text-xs text-slate-600 md:grid-cols-2">
                  <span className="rounded-lg bg-slate-50/80 px-3 py-2">
                    Super: {selectedCustomer.processoSuper}
                  </span>
                  <span className="rounded-lg bg-slate-50/80 px-3 py-2">
                    RMC: {selectedCustomer.processoRmc}
                  </span>
                </div>
              </div>
              <div className="rounded-2xl border border-stroke bg-white/90 p-4 text-sm text-slate-600">
                <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                  <span className="h-2 w-2 rounded-full bg-accent/60" />
                  Status pagamento
                </div>
                <span
                  className={`mt-2 inline-flex rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] ${
                    selectedCustomer.statusPagamento.toLowerCase().includes('inadimplente')
                      ? 'border-rose-300 bg-rose-50 text-rose-700'
                      : selectedCustomer.statusPagamento.toLowerCase().includes('atraso')
                      ? 'border-amber-300 bg-amber-50 text-amber-700'
                      : selectedCustomer.statusPagamento.toLowerCase().includes('em dia')
                      ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                      : selectedCustomer.statusPagamento.toLowerCase().includes('aguardando')
                      ? 'border-amber-300 bg-amber-50 text-amber-700'
                      : 'border-slate-200 bg-slate-50 text-slate-500'
                  }`}
                >
                  {selectedCustomer.statusPagamento}
                </span>
              </div>
              <div className="rounded-2xl border border-stroke bg-white/90 p-4 text-sm text-slate-600">
                <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                  <span className="h-2 w-2 rounded-full bg-accent/60" />
                  Status app
                </div>
                <span
                  className={`mt-2 inline-flex rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] ${
                    selectedCustomer.appStatus === 'bloqueado'
                      ? 'border-rose-300 bg-rose-50 text-rose-700'
                      : selectedCustomer.appStatus === 'pendente'
                      ? 'border-amber-300 bg-amber-50 text-amber-700'
                      : 'border-emerald-300 bg-emerald-50 text-emerald-700'
                  }`}
                >
                  {selectedCustomer.appStatus}
                </span>
              </div>
            </div>

            <div className="surface-panel p-5">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                <span className="h-2 w-2 rounded-full bg-accent/60" />
                Andamento do processo
              </div>
              <p className="mt-3 text-sm text-slate-600">
                Etapa simulada: aguardando documentacao final para liberar acesso definitivo.
              </p>
            </div>

            <div className="surface-panel p-5">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                <span className="h-2 w-2 rounded-full bg-accent/60" />
                Financeiro
              </div>
              <div className="mt-4 grid gap-3 text-sm text-slate-600 sm:grid-cols-2">
                <div className="rounded-lg bg-slate-50/80 px-3 py-2">
                  Valor: {selectedCustomer.contratoValor}
                </div>
                <div className="rounded-lg bg-slate-50/80 px-3 py-2">
                  Parcelamento: {selectedCustomer.parcelas}
                </div>
                <div className="rounded-lg bg-slate-50/80 px-3 py-2">
                  Servico: {selectedCustomer.servicoContratado}
                </div>
                <div className="rounded-lg bg-slate-50/80 px-3 py-2">
                  Forma de pagamento: {selectedCustomer.formaPagamento}
                </div>
              </div>
              <div className="mt-4">
                <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                  <span className="h-2 w-2 rounded-full bg-accent/60" />
                  Timeline de parcelas
                </div>
                <div className="mt-3 space-y-2 text-sm text-slate-600">
                  {selectedCustomer.parcelasPagas.map((parcela) => (
                    <div key={parcela.label} className="rounded-lg bg-slate-50/80 px-3 py-2">
                      {parcela.label} - {parcela.vencimento} {parcela.status}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="surface-panel p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                  <span className="h-2 w-2 rounded-full bg-accent/60" />
                  Timeline do processo
                </div>
              </div>
              <div className="mt-4 space-y-4 text-sm text-slate-600">
                {selectedCustomer.appTimeline.map((item) => (
                  <div key={item.id} className="rounded-lg border border-stroke/60 bg-white/80 p-3">
                    <span
                      className={`mb-2 inline-flex rounded-full border px-2 py-1 text-[10px] uppercase tracking-[0.2em] ${timelineToneFor(
                        timelineLabelFor(item.title)
                      )}`}
                    >
                      {timelineLabelFor(item.title)}
                    </span>
                    <p className="font-semibold text-ink">{item.title}</p>
                    <p className="text-xs text-slate-500">{item.description}</p>
                    <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">
                      {formatTimestamp(item.timestamp)}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => updateStatus('liberado')}
                className="rounded-full border border-emerald-300 bg-emerald-500 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white shadow-soft hover:bg-emerald-600"
              >
                Liberar acesso
              </button>
              <button
                onClick={() => updateStatus('bloqueado')}
                className="rounded-full border border-rose-300 bg-rose-500 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white shadow-soft hover:bg-rose-600"
              >
                Bloquear acesso
              </button>
              <button
                onClick={() => updateStatus('pendente')}
                className="rounded-full border border-amber-300 bg-amber-400 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white shadow-soft hover:bg-amber-500"
              >
                Voltar para pendente
              </button>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  )
}
