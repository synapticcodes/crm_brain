import { NavLink } from 'react-router-dom'
import { getNavItems } from '../lib/navigation'
import { roleLabel } from '../lib/roles'
import { useAuth } from '../hooks/useAuth'

export default function Sidebar() {
  const { signOut, session, role, roleLoading } = useAuth()
  const email = session?.user?.email ?? 'usuario@local.test'
  const navItems = getNavItems(role)
  const displayRole = roleLoading ? 'Carregando' : roleLabel(role)

  return (
    <aside className="h-screen w-72 border-r border-stroke/80 bg-white/90 backdrop-blur-xl">
      <div className="flex h-full flex-col px-6 py-8">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-xl border border-accent/20 bg-accent/10 text-accent">
            <img src="/logo.png" alt="Meu Nome Ok" className="h-7 w-7 object-contain" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-ink/50">Meu Nome Ok</p>
            <p className="text-lg font-display">{displayRole}</p>
          </div>
        </div>

        <nav className="mt-10 flex-1 space-y-2">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                [
                  'group flex items-center justify-between rounded-xl border px-4 py-3 transition-all',
                  isActive
                    ? 'border-accent/30 bg-accent/10 text-ink shadow-soft'
                    : 'border-transparent bg-white/80 text-ink/70 hover:border-stroke hover:bg-white',
                ].join(' ')
              }
            >
              <div className="flex items-center gap-3">
                <span className={`h-2 w-2 rounded-full ${item.dotClass}`} />
                <div>
                  <p className="text-sm font-semibold">{item.label}</p>
                  <p className="text-[11px] uppercase tracking-[0.2em] text-ink/40">{item.hint}</p>
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
            className="btn-primary mt-3 w-full rounded-xl px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em]"
          >
            Sair
          </button>
        </div>
      </div>
    </aside>
  )
}
