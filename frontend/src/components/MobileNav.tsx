import { NavLink } from 'react-router-dom'
import { getNavItems } from '../lib/navigation'
import { useAuth } from '../hooks/useAuth'

export default function MobileNav() {
  const { role } = useAuth()
  const navItems = getNavItems(role)

  return (
    <div className="lg:hidden px-6 pb-6">
      <div className="flex gap-2 overflow-x-auto rounded-2xl bg-white/70 p-2 shadow-soft">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              [
                'whitespace-nowrap rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] transition',
                isActive
                  ? 'border-accent bg-accent text-white'
                  : 'border-transparent bg-white text-ink/70',
              ].join(' ')
            }
          >
            {item.label}
          </NavLink>
        ))}
      </div>
    </div>
  )
}
