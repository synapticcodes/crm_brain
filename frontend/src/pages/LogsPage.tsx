import { useEffect, useMemo, useState } from 'react'
import PageHeader from '../components/PageHeader'
import { type LogMock, logsMock } from '../lib/mockData'
import { formatTimestamp } from '../lib/formatTimestamp'
import Modal from '../components/Modal'
import { getLogs } from '../lib/logsStore'

export default function LogsPage() {
  const [query, setQuery] = useState('')
  const [clientQuery, setClientQuery] = useState('')
  const [dateFilter, setDateFilter] = useState<'7d' | '30d' | 'all'>('7d')
  const [actionFilter, setActionFilter] = useState('all')
  const [actorFilter, setActorFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [selectedLog, setSelectedLog] = useState<LogMock | null>(null)
  const [logs, setLogs] = useState<LogMock[]>(() => getLogs())

  useEffect(() => {
    function syncLogs() {
      setLogs(getLogs())
    }
    window.addEventListener('brain:logsUpdated', syncLogs)
    window.addEventListener('storage', syncLogs)
    return () => {
      window.removeEventListener('brain:logsUpdated', syncLogs)
      window.removeEventListener('storage', syncLogs)
    }
  }, [])

  const actions = useMemo(() => {
    return Array.from(new Set(logs.map((log) => log.action))).sort()
  }, [logs])

  const actors = useMemo(() => {
    return Array.from(new Set(logs.map((log) => log.actorEmail))).sort()
  }, [logs])

  const maxTimestamp = useMemo(() => {
    const times = logs
      .map((log) => new Date(log.timestamp.replace(' ', 'T')).getTime())
      .filter((value) => Number.isFinite(value))
    return times.length ? Math.max(...times) : Date.now()
  }, [logs])

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    const normalizedClient = clientQuery.trim().toLowerCase()
    const filterSince = dateFilter === 'all'
      ? null
      : maxTimestamp - (dateFilter === '7d' ? 7 : 30) * 24 * 60 * 60 * 1000

    return logs.filter((log) => {
      const timestampMs = new Date(log.timestamp.replace(' ', 'T')).getTime()
      if (filterSince && timestampMs < filterSince) return false
      if (actionFilter !== 'all' && log.action !== actionFilter) return false
      if (actorFilter !== 'all' && log.actorEmail !== actorFilter) return false
      if (statusFilter !== 'all' && log.stage !== statusFilter) return false
      if (normalizedClient) {
        const haystack = `${log.clienteNome ?? ''} ${log.clienteId ?? ''}`.toLowerCase()
        if (!haystack.includes(normalizedClient)) return false
      }
      if (!normalized) return true
      return [
        log.action,
        log.label,
        log.actorName,
        log.actorEmail,
        log.description,
        log.clienteNome ?? '',
        log.clienteId ?? '',
      ]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(normalized))
    })
  }, [query, clientQuery, dateFilter, actionFilter, actorFilter, statusFilter, maxTimestamp])

  const pageSize = 10
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const currentPage = Math.min(page, totalPages)
  const startIndex = (currentPage - 1) * pageSize
  const pageItems = filtered.slice(startIndex, startIndex + pageSize)

  const stageBadge = (stage: string) => {
    if (stage === 'sucesso') return 'bg-emerald-100 text-emerald-700 border-emerald-200'
    if (stage === 'erro') return 'bg-rose-100 text-rose-700 border-rose-200'
    return 'bg-amber-100 text-amber-700 border-amber-200'
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Logs"
        subtitle="Auditoria completa de todas as ações do sistema com filtros avançados e visualização detalhada."
        actions={null}
      />

      <div className="surface-panel p-6">
        <div className="flex flex-wrap items-center gap-3">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar por acao, email ou descricao"
            className="w-full rounded-full border border-stroke bg-white/80 px-5 py-3 text-sm shadow-soft outline-none focus:border-accent sm:max-w-md"
          />
          <input
            value={clientQuery}
            onChange={(event) => setClientQuery(event.target.value)}
            placeholder="Filtrar por cliente"
            className="w-full rounded-full border border-stroke bg-white/80 px-5 py-3 text-sm shadow-soft outline-none focus:border-accent sm:max-w-xs"
          />
          <select
            value={dateFilter}
            onChange={(event) => {
              setDateFilter(event.target.value as '7d' | '30d' | 'all')
              setPage(1)
            }}
            className="rounded-full border border-stroke bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-ink/70"
          >
            <option value="7d">Ultimos 7 dias</option>
            <option value="30d">Ultimos 30 dias</option>
            <option value="all">Todo periodo</option>
          </select>
          <select
            value={actionFilter}
            onChange={(event) => {
              setActionFilter(event.target.value)
              setPage(1)
            }}
            className="rounded-full border border-stroke bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-ink/70"
          >
            <option value="all">Todas as acoes</option>
            {actions.map((action) => (
              <option key={action} value={action}>
                {action}
              </option>
            ))}
          </select>
          <select
            value={actorFilter}
            onChange={(event) => {
              setActorFilter(event.target.value)
              setPage(1)
            }}
            className="rounded-full border border-stroke bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-ink/70"
          >
            <option value="all">Todos os atores</option>
            {actors.map((actor) => (
              <option key={actor} value={actor}>
                {actor}
              </option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(event) => {
              setStatusFilter(event.target.value)
              setPage(1)
            }}
            className="rounded-full border border-stroke bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-ink/70"
          >
            <option value="all">Todos os status</option>
            <option value="sucesso">Sucesso</option>
            <option value="pendente">Pendente</option>
            <option value="erro">Erro</option>
          </select>
        </div>

        <div className="mt-6 overflow-hidden rounded-2xl border border-stroke bg-white/80">
          <div className="grid grid-cols-[1.4fr_1.2fr_1.2fr_0.7fr_0.9fr] gap-4 border-b border-stroke px-4 py-3 text-xs uppercase tracking-[0.2em] text-ink/50">
            <span>Acao</span>
            <span>Cliente</span>
            <span>Responsavel</span>
            <span>Status</span>
            <span>Timestamp</span>
          </div>
          {pageItems.length === 0 ? (
            <div className="px-4 py-8 text-sm text-ink/60">Nenhum log encontrado.</div>
          ) : (
            pageItems.map((log) => (
              <button
                key={log.id}
                onClick={() => setSelectedLog(log)}
                className="grid w-full grid-cols-[1.4fr_1.2fr_1.2fr_0.7fr_0.9fr] gap-4 border-b border-stroke/60 px-4 py-3 text-left text-sm text-ink/70 hover:bg-white"
              >
                <div>
                  <p className="font-semibold text-ink">{log.label}</p>
                  <p className="text-[10px] uppercase tracking-[0.2em] text-ink/40">
                    {log.action}
                  </p>
                </div>
                <div>
                  <p className="font-semibold text-ink">{log.clienteNome ?? '—'}</p>
                  <p className="text-[10px] uppercase tracking-[0.2em] text-ink/40">
                    {log.clienteId ?? 'Sem CPF'}
                  </p>
                </div>
                <div>
                  <p className="font-semibold text-ink">{log.actorName}</p>
                  <p className="text-xs text-ink/50">{log.actorEmail}</p>
                </div>
                <span
                  className={`inline-flex h-7 items-center justify-center rounded-full border px-3 text-[10px] font-semibold uppercase tracking-[0.2em] ${stageBadge(
                    log.stage
                  )}`}
                >
                  {log.stage}
                </span>
                <span className="text-xs uppercase tracking-[0.2em] text-ink/50">
                  {formatTimestamp(log.timestamp)}
                </span>
              </button>
            ))
          )}
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-ink/60">
          <span>
            Mostrando {pageItems.length} de {filtered.length}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              className="rounded-full border border-stroke bg-white px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-ink/70"
              disabled={currentPage === 1}
            >
              Anterior
            </button>
            <span className="text-[10px] uppercase tracking-[0.2em] text-ink/50">
              Pagina {currentPage} de {totalPages}
            </span>
            <button
              onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
              className="rounded-full border border-stroke bg-white px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-ink/70"
              disabled={currentPage === totalPages}
            >
              Proxima
            </button>
          </div>
        </div>
      </div>

      <Modal
        open={Boolean(selectedLog)}
        title={selectedLog ? `${selectedLog.label}` : 'Detalhes'}
        onClose={() => setSelectedLog(null)}
        size="md"
      >
        {selectedLog ? (
          <div className="space-y-4 text-sm text-ink/70">
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-2xl border border-stroke bg-white/80 p-4">
                <p className="text-[10px] uppercase tracking-[0.2em] text-ink/50">Acao</p>
                <p className="mt-2 font-semibold text-ink">{selectedLog.action}</p>
                <p className="mt-1 text-xs text-ink/50">{selectedLog.description}</p>
              </div>
              <div className="rounded-2xl border border-stroke bg-white/80 p-4">
                <p className="text-[10px] uppercase tracking-[0.2em] text-ink/50">Responsavel</p>
                <p className="mt-2 font-semibold text-ink">{selectedLog.actorName}</p>
                <p className="mt-1 text-xs text-ink/50">{selectedLog.actorEmail}</p>
              </div>
              <div className="rounded-2xl border border-stroke bg-white/80 p-4">
                <p className="text-[10px] uppercase tracking-[0.2em] text-ink/50">Cliente</p>
                <p className="mt-2 font-semibold text-ink">
                  {selectedLog.clienteNome ?? 'Sem cliente'}
                </p>
                <p className="mt-1 text-xs text-ink/50">
                  {selectedLog.clienteId ?? 'Sem CPF'}
                </p>
              </div>
              <div className="rounded-2xl border border-stroke bg-white/80 p-4">
                <p className="text-[10px] uppercase tracking-[0.2em] text-ink/50">Status</p>
                <span
                  className={`mt-2 inline-flex rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] ${stageBadge(
                    selectedLog.stage
                  )}`}
                >
                  {selectedLog.stage}
                </span>
                <p className="mt-2 text-xs text-ink/50">
                  {formatTimestamp(selectedLog.timestamp)}
                </p>
              </div>
            </div>
            <div className="rounded-2xl border border-stroke bg-white/80 p-4">
              <p className="text-[10px] uppercase tracking-[0.2em] text-ink/50">Detalhes</p>
              <pre className="mt-3 whitespace-pre-wrap break-words text-xs text-ink/70">
                {selectedLog.details
                  ? JSON.stringify(selectedLog.details, null, 2)
                  : 'Sem detalhes adicionais.'}
              </pre>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  )
}
