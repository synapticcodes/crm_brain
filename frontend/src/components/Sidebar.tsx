import { NavLink } from 'react-router-dom'
import { navItems } from '../lib/navigation'
import { useAuth } from '../hooks/useAuth'

export default function Sidebar() {
  const { signOut, session } = useAuth()
  const email = session?.user?.email ?? 'usuario@local.test'

  return (
    <aside className="h-screen w-72 border-r border-stroke/80 bg-white/70 backdrop-blur-xl">
      <div className="flex h-full flex-col px-6 py-8">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-2xl bg-ink text-white shadow-card">
            <span className="text-lg font-display">B</span>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-ink/50">BRAIN</p>
            <p className="text-lg font-display">Controle Local</p>
          </div>
        </div>

        <nav className="mt-10 flex-1 space-y-2">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                [
                  'group flex items-center justify-between rounded-2xl border px-4 py-3 transition-all',
                  isActive
                    ? 'border-ink/70 bg-ink text-white shadow-card'
                    : 'border-transparent bg-white/60 text-ink/70 hover:border-stroke hover:bg-white',
                ].join(' ')
              }
            >
              <div className="flex items-center gap-3">
                <span className={`h-2 w-2 rounded-full ${item.dotClass}`} />
                <div>
                  <p className="text-sm font-semibold">{item.label}</p>
                  <p className="text-[11px] uppercase tracking-[0.2em] opacity-70">{item.hint}</p>
                </div>
              </div>
              <span className={`text-xs font-semibold ${item.accentClass}`}>›</span>
            </NavLink>
          ))}
        </nav>

        <div className="mt-6 rounded-2xl border border-stroke bg-white/80 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-ink/50">Sessao</p>
          <p className="mt-1 text-sm font-semibold text-ink">{email}</p>
          <button
            onClick={signOut}
            className="mt-3 w-full rounded-xl border border-ink/20 bg-ink px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white transition hover:opacity-90"
          >
            Sair
          </button>
        </div>
      </div>
    </aside>
  )
}
