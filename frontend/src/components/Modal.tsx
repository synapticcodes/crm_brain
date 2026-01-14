import { useEffect } from 'react'

interface ModalProps {
  open: boolean
  title: string
  onClose: () => void
  children: React.ReactNode
  size?: 'md' | 'lg' | 'xl'
}

const sizeClasses = {
  md: 'max-w-2xl',
  lg: 'max-w-4xl',
  xl: 'max-w-6xl',
}

export default function Modal({ open, title, onClose, children, size = 'lg' }: ModalProps) {
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }

    if (open) {
      document.addEventListener('keydown', handleEscape)
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-10">
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
        role="presentation"
        onClick={onClose}
      />
      <div className={`relative w-full ${sizeClasses[size]} surface-panel max-h-[90vh] overflow-y-auto p-6 shadow-card`}>
        <div className="flex items-center justify-between border-b border-stroke pb-4">
          <h3 className="text-xl font-display text-ink">{title}</h3>
          <button
            onClick={onClose}
            className="rounded-full border border-stroke px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-ink/70"
          >
            fechar
          </button>
        </div>
        <div className="pt-6">{children}</div>
      </div>
    </div>
  )
}
