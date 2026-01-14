import { useMemo, useState } from 'react'
import PageHeader from '../components/PageHeader'
import { logsMock } from '../lib/mockData'

export default function LogsPage() {
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    if (!normalized) return logsMock
    return logsMock.filter((log) =>
      [log.action, log.actor, log.description]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(normalized))
    )
  }, [query])

  return (
    <div className="space-y-8">
      <PageHeader
        title="Logs"
        subtitle="Auditoria experimental das acoes do sistema, filtrada por texto."
        actions={null}
      />

      <div className="surface-panel p-6">
        <div className="flex flex-wrap items-center gap-3">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar por acao, email ou descricao"
            className="w-full rounded-full border border-stroke bg-white/80 px-5 py-3 text-sm shadow-soft outline-none focus:border-ink sm:max-w-md"
          />
          <button className="rounded-full border border-stroke bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-ink/70">
            Ultimos 7 dias
          </button>
          <button className="rounded-full border border-stroke bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-ink/70">
            Todos os atores
          </button>
        </div>

        <div className="mt-6 overflow-hidden rounded-2xl border border-stroke bg-white/80">
          <div className="grid grid-cols-[1.2fr_1fr_2fr_1fr] gap-4 border-b border-stroke px-4 py-3 text-xs uppercase tracking-[0.2em] text-ink/50">
            <span>Acao</span>
            <span>Responsavel</span>
            <span>Descricao</span>
            <span>Timestamp</span>
          </div>
          {filtered.map((log) => (
            <div
              key={log.id}
              className="grid grid-cols-[1.2fr_1fr_2fr_1fr] gap-4 border-b border-stroke/60 px-4 py-3 text-sm text-ink/70"
            >
              <span className="font-semibold text-ink">{log.action}</span>
              <span>{log.actor}</span>
              <span>{log.description}</span>
              <span className="text-xs uppercase tracking-[0.2em] text-ink/50">{log.timestamp}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
