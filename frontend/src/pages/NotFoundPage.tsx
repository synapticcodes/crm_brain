import { Link } from 'react-router-dom'

export default function NotFoundPage() {
  return (
    <div className="flex min-h-[60vh] flex-col items-start justify-center gap-4">
      <h2 className="text-3xl font-display text-ink">Pagina nao encontrada</h2>
      <p className="text-sm text-ink/60">
        O caminho solicitado nao existe ou foi movido.
      </p>
      <Link
        to="/customers"
        className="rounded-full bg-ink px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white"
      >
        Voltar para clientes
      </Link>
    </div>
  )
}
