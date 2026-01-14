import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export default function TopBar() {
  const { session, signOut } = useAuth()
  const email = session?.user?.email ?? 'usuario@local.test'
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const today = useMemo(
    () =>
      new Intl.DateTimeFormat('pt-BR', {
        weekday: 'short',
        day: '2-digit',
        month: 'long',
      }).format(new Date()),
    []
  )

  useEffect(() => {
    if (typeof window === 'undefined') return
    const stored = window.localStorage.getItem(`brain_profile_avatar_${email}`)
    setAvatarUrl(stored)
  }, [email])

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 border-b border-stroke/80 bg-white/70 px-6 py-4 backdrop-blur-xl">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-ink/50">BRAIN CRM</p>
        <h1 className="text-2xl font-display text-ink">{today}</h1>
      </div>

      <div className="flex items-center gap-3">
        <span className="accent-pill">sandbox ativo</span>
        <div className="flex items-center gap-3 rounded-full border border-stroke bg-white/80 px-4 py-2 text-xs">
          <span className="h-2 w-2 rounded-full bg-teal" />
          <span className="font-semibold text-ink">{email}</span>
        </div>
        <Link
          to="/meu-perfil"
          className="flex items-center gap-2 rounded-full border border-stroke bg-white/80 px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-ink/70"
        >
          <span className="flex h-6 w-6 items-center justify-center overflow-hidden rounded-full border border-stroke bg-white text-[10px] text-ink/60">
            {avatarUrl ? (
              <img src={avatarUrl} alt="Foto do perfil" className="h-full w-full object-cover" />
            ) : (
              email.slice(0, 1).toUpperCase()
            )}
          </span>
          Meu perfil
        </Link>
        <button
          onClick={signOut}
          className="rounded-full border border-stroke bg-white/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-ink/70 lg:hidden"
        >
          sair
        </button>
      </div>
    </div>
  )
}
