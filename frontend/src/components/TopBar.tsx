import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { formatTimestamp } from '../lib/formatTimestamp'
import {
  addNotification,
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type NotificationItem,
} from '../lib/notificationsStore'

export default function TopBar() {
  const { session, signOut } = useAuth()
  const email = session?.user?.email ?? 'usuario@local.test'
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const notificationsRef = useRef<HTMLDivElement | null>(null)
  const today = useMemo(
    () =>
      new Intl.DateTimeFormat('pt-BR', {
        weekday: 'long',
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      }).format(new Date()),
    []
  )

  const refreshNotifications = useCallback(() => {
    setNotifications(getNotifications())
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const stored = window.localStorage.getItem(`brain_profile_avatar_${email}`)
    setAvatarUrl(stored)
  }, [email])

  useEffect(() => {
    refreshNotifications()
    const handleUpdate = () => refreshNotifications()
    const handleChatIncoming = (event: Event) => {
      const detail = (event as CustomEvent<{ clienteNome: string; message: string }>).detail
      addNotification({
        type: 'chat',
        title: `Novo chat · ${detail?.clienteNome ?? 'Cliente'}`,
        message: detail?.message ?? 'Nova mensagem recebida.',
        timestamp: new Date().toISOString().slice(0, 16).replace('T', ' '),
        dedupeKey: `chat:${detail?.clienteNome ?? ''}:${detail?.message ?? ''}`,
      })
    }
    const handleJuridicoReply = (
      event: Event
    ) => {
      const detail = (event as CustomEvent<{ clienteNome: string; message: string; timestamp?: string }>).detail
      addNotification({
        type: 'juridico',
        title: `Resposta juridico · ${detail?.clienteNome ?? 'Cliente'}`,
        message: detail?.message ?? 'Resposta recebida do juridico.',
        timestamp: detail?.timestamp ?? new Date().toISOString().slice(0, 16).replace('T', ' '),
        dedupeKey: `juridico:${detail?.clienteNome ?? ''}:${detail?.message ?? ''}`,
      })
    }
    const handleEmailReceived = (
      event: Event
    ) => {
      const detail = (event as CustomEvent<{ clienteNome: string; subject: string; emailId: string }>).detail
      addNotification({
        type: 'email',
        title: `Novo email · ${detail?.clienteNome ?? 'Cliente'}`,
        message: detail?.subject ?? 'Email recebido.',
        timestamp: new Date().toISOString().slice(0, 16).replace('T', ' '),
        dedupeKey: detail?.emailId ? `email:${detail.emailId}` : undefined,
      })
    }
    window.addEventListener('brain:notificationsUpdated', handleUpdate)
    window.addEventListener('brain:chatIncoming', handleChatIncoming)
    window.addEventListener('brain:juridicoReply', handleJuridicoReply)
    window.addEventListener('brain:emailReceived', handleEmailReceived)
    return () => {
      window.removeEventListener('brain:notificationsUpdated', handleUpdate)
      window.removeEventListener('brain:chatIncoming', handleChatIncoming)
      window.removeEventListener('brain:juridicoReply', handleJuridicoReply)
      window.removeEventListener('brain:emailReceived', handleEmailReceived)
    }
  }, [refreshNotifications])

  useEffect(() => {
    if (!notificationsOpen) return
    const handleClick = (event: MouseEvent) => {
      if (!notificationsRef.current) return
      if (!notificationsRef.current.contains(event.target as Node)) {
        setNotificationsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [notificationsOpen])

  const unreadCount = notifications.filter((item) => !item.read).length

  return (
    <div
      className="sticky top-0 z-40 flex flex-wrap items-center justify-between gap-4 border-b border-stroke/80 bg-white/80 px-6 py-4 shadow-soft backdrop-blur-xl"
      data-tour="topbar"
    >
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-ink/50">Meu Nome Ok ADM</p>
        <h1 className="text-2xl font-display text-ink">{today}</h1>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => window.dispatchEvent(new Event('brain:startTour'))}
          className="flex items-center gap-2 rounded-full border border-stroke bg-white/80 px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-ink/70"
          data-tour="tour-trigger"
        >
          Tour
        </button>
        <div className="relative" ref={notificationsRef}>
          <button
            type="button"
            onClick={() => setNotificationsOpen((prev) => !prev)}
            className={`relative flex h-10 w-10 items-center justify-center rounded-full border ${
              notificationsOpen ? 'border-accent/40 bg-accent/10' : 'border-stroke bg-white/80'
            }`}
            data-tour="notifications"
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              className="h-5 w-5 text-ink/70"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 0 0-5-5.9V4a1 1 0 0 0-2 0v1.1A6 6 0 0 0 6 11v3.2a2 2 0 0 1-.6 1.4L4 17h5" />
              <path d="M9 17a3 3 0 0 0 6 0" />
            </svg>
            {unreadCount > 0 ? (
              <span className="absolute -right-1 -top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-accent px-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-white">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            ) : null}
          </button>

          {notificationsOpen ? (
            <div className="absolute right-0 mt-3 w-[340px] rounded-2xl border border-stroke bg-white shadow-soft">
              <div className="flex items-center justify-between border-b border-stroke/70 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink/60">
                  Notificacoes
                </p>
                <button
                  type="button"
                  onClick={() => {
                    markAllNotificationsRead()
                    refreshNotifications()
                  }}
                  className="text-[10px] font-semibold uppercase tracking-[0.2em] text-accent"
                >
                  Marcar lidas
                </button>
              </div>
              <div className="max-h-72 overflow-y-auto">
                {notifications.length === 0 ? (
                  <p className="px-4 py-6 text-sm text-ink/60">Nenhuma notificacao.</p>
                ) : (
                  notifications.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        markNotificationRead(item.id)
                        refreshNotifications()
                      }}
                      className={`flex w-full items-start gap-3 border-b border-stroke/60 px-4 py-3 text-left transition ${
                        item.read ? 'bg-white' : 'bg-accent/5'
                      }`}
                    >
                      <span
                        className={`mt-1 h-2 w-2 rounded-full ${
                          item.type === 'email'
                            ? 'bg-emerald-400'
                            : item.type === 'juridico'
                            ? 'bg-amber-400'
                            : 'bg-sky-400'
                        }`}
                      />
                      <div className="space-y-1">
                        <p className="text-sm font-semibold text-ink">{item.title}</p>
                        <p className="text-xs text-ink/60">{item.message}</p>
                        <p className="text-[10px] uppercase tracking-[0.2em] text-ink/40">
                          {formatTimestamp(item.timestamp)}
                        </p>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          ) : null}
        </div>
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
