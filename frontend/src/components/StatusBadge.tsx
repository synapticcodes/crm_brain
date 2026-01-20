const statusStyles = {
  online: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  offline: 'border-rose-200 bg-rose-50 text-rose-700',
  pendente: 'border-orange-200 bg-orange-50 text-orange-700',
  demitido: 'border-stone-200 bg-stone-50 text-stone-600',
  sucesso: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  erro: 'border-rose-200 bg-rose-50 text-rose-700',
} as const

type StatusVariant = keyof typeof statusStyles

const statusLabels: Record<StatusVariant, string> = {
  online: 'Online',
  offline: 'Offline',
  pendente: 'Pendente',
  demitido: 'Demitido',
  sucesso: 'Sucesso',
  erro: 'Erro',
}

interface StatusBadgeProps {
  variant: StatusVariant
  label?: string
}

export default function StatusBadge({ variant, label }: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] ${statusStyles[variant]}`}
    >
      {label ?? statusLabels[variant]}
    </span>
  )
}
