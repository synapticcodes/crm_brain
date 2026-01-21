import type { UserRole } from './roles'

type NavItem = {
  path: string
  label: string
  hint: string
  accentClass: string
  dotClass: string
  roles?: UserRole[]
}

const navItems: NavItem[] = [
  {
    path: '/customers',
    label: 'Clientes',
    hint: 'Kanban e documentos',
    accentClass: 'text-accent',
    dotClass: 'bg-accent',
  },
  {
    path: '/app-access',
    label: 'Aplicativo',
    hint: 'Status mobile',
    accentClass: 'text-teal',
    dotClass: 'bg-teal',
  },
  {
    path: '/legal',
    label: 'Jurídico',
    hint: 'Tickets e prazos',
    accentClass: 'text-moss',
    dotClass: 'bg-moss',
  },
  {
    path: '/support',
    label: 'Atendimentos',
    hint: 'Chat e e-mail',
    accentClass: 'text-amber-700',
    dotClass: 'bg-amber-500',
  },
  {
    path: '/prompts',
    label: 'Prompts',
    hint: 'Assistentes',
    accentClass: 'text-slate-700',
    dotClass: 'bg-slate-500',
    roles: ['admin'],
  },
  {
    path: '/logs',
    label: 'Logs',
    hint: 'Auditoria',
    accentClass: 'text-slate-600',
    dotClass: 'bg-slate-500',
  },
  {
    path: '/team',
    label: 'Equipe',
    hint: 'Perfis e convites',
    accentClass: 'text-stone-700',
    dotClass: 'bg-stone-500',
    roles: ['admin'],
  },
]

export function getNavItems(role: UserRole | null): NavItem[] {
  const effectiveRole: UserRole = role ?? 'administrativo'
  return navItems.filter((item) => !item.roles || item.roles.includes(effectiveRole))
}
