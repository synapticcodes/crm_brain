import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../hooks/useAuth'

export default function LoginPage() {
  const { session } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (session) {
    return <Navigate to="/customers" replace />
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setLoading(true)

    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    setLoading(false)

    if (authError) {
      setError(authError.message)
      return
    }

    navigate('/customers')
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.1fr_0.9fr]">
      <section className="relative flex flex-col justify-between border-b border-stroke bg-white/70 px-8 py-12 lg:border-b-0 lg:border-r">
        <div className="space-y-6">
          <span className="accent-pill">BRAIN CRM</span>
          <h1 className="text-4xl font-display text-ink sm:text-5xl">
            Operacao local focada em clientes, contratos e atendimento.
          </h1>
          <p className="text-base text-ink/70">
            Um painel administrativo preparado para o MVP. Dados isolados por tenant,
            com auditoria e fluxos alinhados ao schema brain.
          </p>
        </div>

        <div className="mt-10 grid gap-4 text-sm text-ink/60 sm:grid-cols-2">
          <div className="surface-panel p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-ink/40">Seguranca</p>
            <p className="mt-2 font-semibold text-ink">RLS e isolamento total</p>
          </div>
          <div className="surface-panel p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-ink/40">BFF</p>
            <p className="mt-2 font-semibold text-ink">Operacoes admin centralizadas</p>
          </div>
          <div className="surface-panel p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-ink/40">Chat & Email</p>
            <p className="mt-2 font-semibold text-ink">Realtime + Inbucket local</p>
          </div>
          <div className="surface-panel p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-ink/40">Auditoria</p>
            <p className="mt-2 font-semibold text-ink">Logs completos de acao</p>
          </div>
        </div>
      </section>

      <section className="flex items-center justify-center px-6 py-12">
        <form
          onSubmit={handleSubmit}
          className="surface-panel w-full max-w-md space-y-6 p-8"
        >
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-ink/40">Acesso</p>
            <h2 className="text-2xl font-display text-ink">Entrar no painel</h2>
          </div>

          <div className="space-y-4">
            <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-ink/50">
              Email
              <input
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="mt-2 w-full rounded-xl border border-stroke bg-white px-4 py-3 text-sm text-ink shadow-soft outline-none transition focus:border-ink"
                placeholder="voce@empresa.com"
              />
            </label>
            <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-ink/50">
              Senha
              <input
                type="password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="mt-2 w-full rounded-xl border border-stroke bg-white px-4 py-3 text-sm text-ink shadow-soft outline-none transition focus:border-ink"
                placeholder="••••••••"
              />
            </label>
          </div>

          {error ? (
            <div className="rounded-xl border border-accent/30 bg-accent/10 px-4 py-3 text-sm text-accent">
              {error}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-ink px-4 py-3 text-xs font-semibold uppercase tracking-[0.25em] text-white transition hover:opacity-90"
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
          <button
            type="button"
            className="w-full rounded-xl border border-stroke bg-white px-4 py-3 text-xs font-semibold uppercase tracking-[0.25em] text-ink/70"
          >
            Redefinir senha (mock)
          </button>

          <p className="text-xs text-ink/50">
            Use um usuario criado pelo admin local. As credenciais padrao do seed
            estao em supabase/seed.sql.
          </p>
        </form>
      </section>
    </div>
  )
}
