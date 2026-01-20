import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import GridPattern from '../components/GridPattern'
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
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#F7F9FC] px-6 py-12">
      <GridPattern className="text-ink/5" />
      <form
        onSubmit={handleSubmit}
        className="surface-panel relative w-full max-w-md space-y-6 border border-accent/10 bg-white/90 p-8 shadow-[0_24px_70px_-50px_rgba(79,70,229,0.6)]"
      >
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-accent/20 bg-accent/10">
            <img src="/logo.png" alt="Meu Nome Ok" className="h-9 w-9 object-contain" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-ink/45">Meu Nome Ok ADM</p>
            <h2 className="mt-2 text-2xl font-display text-ink">Entrar no painel</h2>
          </div>
        </div>

        <div className="space-y-4">
          <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-ink/50">
            Email
            <input
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="input-base mt-2 py-3"
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
              className="input-base mt-2 py-3"
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
          className="btn-primary w-full rounded-xl px-4 py-3 text-xs font-semibold uppercase tracking-[0.25em]"
        >
          {loading ? 'Entrando...' : 'Entrar'}
        </button>
        <button
          type="button"
          className="btn-outline w-full rounded-xl px-4 py-3 text-xs font-semibold uppercase tracking-[0.25em]"
        >
          Redefinir senha
        </button>
      </form>
    </div>
  )
}
