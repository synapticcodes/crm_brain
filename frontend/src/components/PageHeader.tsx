interface PageHeaderProps {
  title: string
  subtitle: string
  actions?: React.ReactNode
}

export default function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div>
        <h2 className="text-3xl font-semibold text-ink">{title}</h2>
        <p className="mt-3 max-w-2xl text-sm text-slate-500">{subtitle}</p>
      </div>
      {actions ? <div className="flex items-center gap-3">{actions}</div> : null}
    </div>
  )
}
