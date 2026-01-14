import { useEffect, useMemo, useState } from 'react'
import PageHeader from '../components/PageHeader'
import Modal from '../components/Modal'
import { teamMock, type TeamMemberMock } from '../lib/mockData'
import { supabase } from '../lib/supabaseClient'

export default function TeamPage() {
  const [team, setTeam] = useState<TeamMemberMock[]>(teamMock)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [blacklist, setBlacklist] = useState<string[]>([])
  const [onlineEmails, setOnlineEmails] = useState<string[]>([])
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null)

  const teamWithPresence = useMemo(() => {
    return team.map((member) => {
      if (member.status === 'pendente' || member.status === 'demitido') {
        return { ...member, status: member.status }
      }
      const isOnline = onlineEmails.includes(member.email)
      return { ...member, status: isOnline ? 'online' : 'offline' }
    })
  }, [team, onlineEmails])

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null
    let isMounted = true

    async function setupPresence() {
      const { data } = await supabase.auth.getUser()
      const fallbackAdmin = team.find((member) => member.role === 'admin')?.email ?? null
      const currentEmail = data.user?.email ?? fallbackAdmin
      setCurrentUserEmail(currentEmail)
      if (!currentEmail) return
      channel = supabase.channel('team-presence', {
        config: { presence: { key: currentEmail } },
      })
      channel.on('presence', { event: 'sync' }, () => {
        if (!channel || !isMounted) return
        const state = channel.presenceState()
        setOnlineEmails(Object.keys(state))
      })
      channel.subscribe((status) => {
        if (status !== 'SUBSCRIBED') return
        channel?.track({ email: currentEmail, onlineAt: new Date().toISOString() })
      })
    }

    setupPresence()

    return () => {
      isMounted = false
      if (channel) supabase.removeChannel(channel)
    }
  }, [])

  const isAdmin = useMemo(() => {
    if (!currentUserEmail) return false
    return team.some((member) => member.email === currentUserEmail && member.role === 'admin')
  }, [currentUserEmail, team])

  function handleInvite() {
    if (!isAdmin) return
    if (!name.trim() || !email.trim()) return
    const now = new Date().toISOString().slice(0, 16).replace('T', ' ')
    const mockIp = `200.10.${Math.floor(10 + Math.random() * 90)}.${Math.floor(10 + Math.random() * 90)}`
    setTeam((prev) => [
      {
        id: `U-${Date.now()}`,
        nome: name.trim(),
        email: email.trim(),
        telefone: phone.trim() || 'Nao informado',
        avatarUrl: `https://i.pravatar.cc/120?u=${encodeURIComponent(email.trim())}`,
        role: 'administrativo',
        status: 'pendente',
        lastActivity: `Convite ${now}`,
        ipAddress: mockIp,
      },
      ...prev,
    ])
    setInviteOpen(false)
    setName('')
    setEmail('')
    setPhone('')
  }

  function handleFire(member: TeamMemberMock) {
    setTeam((prev) =>
      prev.map((item) =>
        item.id === member.id ? { ...item, status: 'demitido', lastActivity: 'Demitido' } : item
      )
    )
    setBlacklist((prev) => [...prev, `${member.email} · ${member.ipAddress}`])
  }

  function handleReactivate(member: TeamMemberMock) {
    setTeam((prev) =>
      prev.map((item) =>
        item.id === member.id ? { ...item, status: 'offline', lastActivity: 'Reativado' } : item
      )
    )
    setBlacklist((prev) => prev.filter((entry) => !entry.startsWith(member.email)))
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Equipe"
        subtitle="Convites, roles e status de presenca (mock)."
        actions={
          isAdmin ? (
            <button
              onClick={() => setInviteOpen(true)}
              className="rounded-full bg-ink px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white"
            >
              Convidar membro
            </button>
          ) : null
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_0.6fr]">
        <div className="surface-panel p-6">
          <h3 className="text-xl font-display text-ink">Membros ativos</h3>
          <div className="mt-6 space-y-3">
            {teamWithPresence.map((member) => (
              <div
                key={member.id}
                className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-stroke bg-white/80 px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 overflow-hidden rounded-full border border-stroke bg-white">
                    <img src={member.avatarUrl} alt={member.nome} className="h-full w-full object-cover" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-ink">{member.nome}</p>
                    <p className="text-xs text-ink/50">{member.email}</p>
                    <p className="text-xs text-ink/50">{member.telefone}</p>
                    <p className="text-[11px] uppercase tracking-[0.2em] text-ink/40">{member.role}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-ink/60">
                    <span
                      className={`h-2 w-2 rounded-full ${
                        member.status === 'online'
                          ? 'bg-emerald-500'
                          : member.status === 'pendente'
                          ? 'bg-orange-500'
                          : member.status === 'demitido'
                          ? 'bg-stone-400'
                          : 'bg-rose-500'
                      }`}
                    />
                    {member.status}
                  </span>
                  <span className="text-[11px] uppercase tracking-[0.2em] text-ink/40">
                    {member.lastActivity}
                  </span>
                  {member.status === 'demitido' ? (
                    <button
                      onClick={() => handleReactivate(member)}
                      className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs uppercase tracking-[0.2em] text-emerald-700"
                    >
                      Reativar
                    </button>
                  ) : (
                    <button
                      onClick={() => handleFire(member)}
                      className="rounded-full border border-stroke bg-white px-3 py-1 text-xs uppercase tracking-[0.2em] text-ink/60"
                    >
                      Demitir
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <div className="surface-panel p-6">
            <p className="text-xs uppercase tracking-[0.2em] text-ink/40">Roles</p>
            <p className="mt-4 text-3xl font-display text-ink">2</p>
            <p className="mt-2 text-sm text-ink/60">Admin, administrativo.</p>
          </div>
          <div className="surface-panel p-6">
            <p className="text-xs uppercase tracking-[0.2em] text-ink/40">Blacklist</p>
            <p className="mt-4 text-3xl font-display text-ink">{blacklist.length}</p>
            <p className="mt-2 text-sm text-ink/60">IPs e emails bloqueados (mock).</p>
            {blacklist.length > 0 ? (
              <ul className="mt-4 space-y-2 text-xs text-ink/60">
                {blacklist.map((item) => (
                  <li key={item} className="rounded-xl border border-stroke bg-white/80 px-3 py-2">
                    {item}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </div>
      </div>

      <Modal open={inviteOpen} title="Convidar membro" onClose={() => setInviteOpen(false)} size="md">
        <div className="space-y-4">
          <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-ink/50">
            Nome completo
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="mt-2 w-full rounded-xl border border-stroke bg-white px-4 py-3 text-sm text-ink shadow-soft outline-none focus:border-ink"
              placeholder="Nome do colaborador"
            />
          </label>
          <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-ink/50">
            Email
            <input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-2 w-full rounded-xl border border-stroke bg-white px-4 py-3 text-sm text-ink shadow-soft outline-none focus:border-ink"
              placeholder="email@empresa.com"
            />
          </label>
          <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-ink/50">
            Telefone
            <input
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              className="mt-2 w-full rounded-xl border border-stroke bg-white px-4 py-3 text-sm text-ink shadow-soft outline-none focus:border-ink"
              placeholder="(11) 90000-0000"
            />
          </label>
          <button
            onClick={handleInvite}
            className="w-full rounded-full bg-ink px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white"
          >
            Enviar convite (mock)
          </button>
          <p className="text-xs text-ink/50">Convite sera enviado via BFF no MVP real.</p>
        </div>
      </Modal>
    </div>
  )
}
