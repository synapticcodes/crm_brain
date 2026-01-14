import { useMemo, useState } from 'react'
import PageHeader from '../components/PageHeader'
import Modal from '../components/Modal'
import { customersMock, type CustomerMock } from '../lib/mockData'

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
        subtitle="Controle experimental do acesso mobile com bloqueio e liberacao manual."
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
          className="w-full rounded-full border border-stroke bg-white/80 px-5 py-3 text-sm shadow-soft outline-none focus:border-ink sm:max-w-md"
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
        <span className="accent-pill">filtros experimentais</span>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        {STATUS_CONFIG.map((status) => (
          <div key={status.key} className={`surface-panel flex min-h-[320px] flex-col border-l-4 ${status.tone}`}>
            <div className="flex items-center justify-between border-b border-stroke/70 px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-ink">{status.title}</p>
                <p className="text-xs text-ink/50">{grouped[status.key]?.length ?? 0} clientes</p>
              </div>
              <span className={`text-xs font-semibold uppercase tracking-[0.2em] ${status.badge}`}>
                {grouped[status.key]?.length ?? 0}
              </span>
            </div>
            <div className="flex flex-1 flex-col gap-3 p-4">
              {(grouped[status.key] ?? []).map((customer) => (
                <button
                  key={customer.id}
                  onClick={() => setSelectedId(customer.id)}
                  className="rounded-2xl border border-stroke bg-white/90 p-4 text-left shadow-soft transition hover:shadow-card"
                >
                  <p className="text-sm font-semibold text-ink">{customer.nome}</p>
                  <p className="text-xs text-ink/50">{customer.cpf}</p>
                  <div className="mt-2 text-xs text-ink/60">
                    <p>{customer.email}</p>
                    <p>{customer.telefone}</p>
                    {customer.telefoneSecundario ? <p>{customer.telefoneSecundario}</p> : null}
                    <p>Super: {customer.processoSuper}</p>
                    <p>RMC: {customer.processoRmc}</p>
                  </div>
                  <div className="mt-2 text-xs text-ink/60">{customer.statusPagamento}</div>
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
              <div className="rounded-2xl border border-stroke bg-white/80 p-4 text-sm text-ink/70">
                <p className="text-xs uppercase tracking-[0.2em] text-ink/40">CPF</p>
                <p className="mt-2 font-semibold text-ink">{selectedCustomer.cpf}</p>
              </div>
              <div className="rounded-2xl border border-stroke bg-white/80 p-4 text-sm text-ink/70">
                <p className="text-xs uppercase tracking-[0.2em] text-ink/40">Email</p>
                <p className="mt-2 font-semibold text-ink">{selectedCustomer.email}</p>
              </div>
              <div className="rounded-2xl border border-stroke bg-white/80 p-4 text-sm text-ink/70">
                <p className="text-xs uppercase tracking-[0.2em] text-ink/40">Telefone</p>
                <p className="mt-2 font-semibold text-ink">{selectedCustomer.telefone}</p>
                {selectedCustomer.telefoneSecundario ? (
                  <p className="text-xs text-ink/50">{selectedCustomer.telefoneSecundario}</p>
                ) : null}
              </div>
              <div className="rounded-2xl border border-stroke bg-white/80 p-4 text-sm text-ink/70 md:col-span-3">
                <p className="text-xs uppercase tracking-[0.2em] text-ink/40">Processos</p>
                <div className="mt-2 grid gap-2 text-xs text-ink/60 md:grid-cols-2">
                  <span className="rounded-lg border border-stroke bg-white/80 px-3 py-2">
                    Super: {selectedCustomer.processoSuper}
                  </span>
                  <span className="rounded-lg border border-stroke bg-white/80 px-3 py-2">
                    RMC: {selectedCustomer.processoRmc}
                  </span>
                </div>
              </div>
              <div className="rounded-2xl border border-stroke bg-white/80 p-4 text-sm text-ink/70">
                <p className="text-xs uppercase tracking-[0.2em] text-ink/40">Status pagamento</p>
                <p className="mt-2 font-semibold text-ink">{selectedCustomer.statusPagamento}</p>
              </div>
              <div className="rounded-2xl border border-stroke bg-white/80 p-4 text-sm text-ink/70">
                <p className="text-xs uppercase tracking-[0.2em] text-ink/40">Status app</p>
                <p className="mt-2 font-semibold text-ink">{selectedCustomer.appStatus}</p>
              </div>
            </div>

            <div className="surface-panel p-5">
              <p className="text-xs uppercase tracking-[0.2em] text-ink/40">Andamento do processo</p>
              <p className="mt-2 text-sm text-ink/60">
                Etapa simulada: aguardando documentacao final para liberar acesso definitivo.
              </p>
            </div>

            <div className="surface-panel p-5">
              <p className="text-xs uppercase tracking-[0.2em] text-ink/40">Financeiro</p>
              <div className="mt-3 grid gap-3 text-sm text-ink/70 sm:grid-cols-2">
                <div className="rounded-xl border border-stroke bg-white/80 px-3 py-2">
                  Valor: {selectedCustomer.contratoValor}
                </div>
                <div className="rounded-xl border border-stroke bg-white/80 px-3 py-2">
                  Parcelamento: {selectedCustomer.parcelas}
                </div>
                <div className="rounded-xl border border-stroke bg-white/80 px-3 py-2">
                  Servico: {selectedCustomer.servicoContratado}
                </div>
                <div className="rounded-xl border border-stroke bg-white/80 px-3 py-2">
                  Forma de pagamento: {selectedCustomer.formaPagamento}
                </div>
              </div>
              <div className="mt-4">
                <p className="text-[11px] uppercase tracking-[0.2em] text-ink/40">Timeline de parcelas</p>
                <div className="mt-3 space-y-2 text-sm text-ink/70">
                  {selectedCustomer.parcelasPagas.map((parcela) => (
                    <div key={parcela.label} className="rounded-xl border border-stroke bg-white/80 px-3 py-2">
                      {parcela.label} - {parcela.vencimento} {parcela.status}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="surface-panel p-5">
              <div className="flex items-center justify-between">
                <p className="text-xs uppercase tracking-[0.2em] text-ink/40">Timeline do processo</p>
                <span className="accent-pill">mock</span>
              </div>
              <div className="mt-4 space-y-4 text-sm text-ink/70">
                {selectedCustomer.appTimeline.map((item) => (
                  <div key={item.id} className="border-l-2 border-stroke pl-3">
                    <p className="font-semibold text-ink">{item.title}</p>
                    <p className="text-xs text-ink/60">{item.description}</p>
                    <p className="text-[11px] uppercase tracking-[0.2em] text-ink/40">{item.timestamp}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => updateStatus('liberado')}
                className="rounded-full bg-ink px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white"
              >
                Liberar acesso
              </button>
              <button
                onClick={() => updateStatus('bloqueado')}
                className="rounded-full border border-stroke bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-ink/70"
              >
                Bloquear acesso
              </button>
              <button
                onClick={() => updateStatus('pendente')}
                className="rounded-full border border-stroke bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-ink/70"
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
