import { useEffect, useMemo, useState } from 'react'
import PageHeader from '../components/PageHeader'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabaseClient'

type StatusTone = 'success' | 'error' | 'info'
type StatusState = { message: string; tone: StatusTone }

export default function ProfilePage() {
  const { session } = useAuth()
  const email = session?.user?.email ?? 'usuario@local.test'
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [status, setStatus] = useState<StatusState | null>(null)

  const initials = useMemo(() => email.slice(0, 1).toUpperCase(), [email])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const stored = window.localStorage.getItem(`brain_profile_avatar_${email}`)
    if (stored) setAvatarPreview(stored)
  }, [email])

  function handleAvatarChange(file: File | null) {
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result !== 'string') return
      setAvatarPreview(reader.result)
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(`brain_profile_avatar_${email}`, reader.result)
      }
      setStatus({ message: 'Foto atualizada com sucesso (mock).', tone: 'success' })
      setTimeout(() => setStatus(null), 2000)
    }
    reader.readAsDataURL(file)
  }

  async function handlePasswordChange() {
    if (!password.trim() || !confirmPassword.trim()) {
      setStatus({ message: 'Preencha a nova senha e a confirmacao.', tone: 'error' })
      setTimeout(() => setStatus(null), 2000)
      return
    }
    if (password !== confirmPassword) {
      setStatus({ message: 'As senhas nao conferem.', tone: 'error' })
      setTimeout(() => setStatus(null), 2000)
      return
    }
    const { error } = await supabase.auth.updateUser({ password })
    if (error) {
      setStatus({ message: 'Falha ao alterar senha.', tone: 'error' })
      setTimeout(() => setStatus(null), 2000)
      return
    }
    setPassword('')
    setConfirmPassword('')
    setStatus({ message: 'Senha atualizada com sucesso.', tone: 'success' })
    setTimeout(() => setStatus(null), 2000)
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Meu perfil"
        subtitle="Atualize sua foto e altere sua senha de acesso."
        actions={null}
      />

      {status ? (
        <div
          className={`rounded-full border px-4 py-2 text-xs uppercase tracking-[0.2em] ${
            status.tone === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
              : status.tone === 'error'
              ? 'border-rose-200 bg-rose-50 text-rose-700'
              : 'border-stroke bg-white/80 text-ink/70'
          }`}
        >
          {status.message}
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="surface-panel p-6">
          <h3 className="text-xl font-display text-ink">Foto de perfil</h3>
          <div className="mt-6 flex flex-col items-center gap-4 rounded-3xl border border-stroke bg-white/80 p-6 text-center">
            <div className="h-28 w-28 overflow-hidden rounded-full border border-stroke bg-white text-4xl font-semibold text-ink/40">
              {avatarPreview ? (
                <img src={avatarPreview} alt="Foto do perfil" className="h-full w-full object-cover" />
              ) : (
                <span className="flex h-full items-center justify-center">{initials}</span>
              )}
            </div>
            <div>
              <p className="text-sm font-semibold text-ink">{email}</p>
              <p className="text-xs text-ink/50">Tamanho recomendado: 400x400</p>
            </div>
            <label className="rounded-full border border-stroke bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-ink/70">
              Trocar foto
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => handleAvatarChange(event.target.files?.[0] ?? null)}
              />
            </label>
          </div>
        </div>

        <div className="surface-panel p-6">
          <h3 className="text-xl font-display text-ink">Alterar senha</h3>
          <div className="mt-6 space-y-4">
            <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-ink/50">
              Nova senha
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="mt-2 w-full rounded-xl border border-stroke bg-white px-4 py-3 text-sm text-ink shadow-soft outline-none focus:border-ink"
                placeholder="Digite a nova senha"
              />
            </label>
            <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-ink/50">
              Confirmar senha
              <input
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                className="mt-2 w-full rounded-xl border border-stroke bg-white px-4 py-3 text-sm text-ink shadow-soft outline-none focus:border-ink"
                placeholder="Repita a nova senha"
              />
            </label>
            <button
              onClick={handlePasswordChange}
              className="w-full rounded-full bg-ink px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white"
            >
              Atualizar senha
            </button>
            <p className="text-xs text-ink/50">
              Alteracao de senha usa o fluxo do Supabase Auth nesta versao local.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
