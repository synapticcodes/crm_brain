import { useEffect, useMemo, useState } from 'react'
import PageHeader from '../components/PageHeader'
import Modal from '../components/Modal'
import StatusBadge from '../components/StatusBadge'
import { teamMock, type TeamMemberMock } from '../lib/mockData'
import { normalizeAssistantText } from '../lib/assistantText'
import { supabase } from '../lib/supabaseClient'
import { bffFetch } from '../lib/apiBff'
import { useAuth } from '../hooks/useAuth'

export default function TeamPage() {
  const { session } = useAuth()
  const [team, setTeam] = useState<TeamMemberMock[]>(teamMock)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [selectedMember, setSelectedMember] = useState<TeamMemberMock | null>(null)
  const [profileOpen, setProfileOpen] = useState(false)
  const [assistantOpen, setAssistantOpen] = useState(false)
  const [assistantMode, setAssistantMode] = useState<'measure' | 'compare' | 'custom'>('measure')
  const [assistantLoading, setAssistantLoading] = useState(false)
  const [assistantResult, setAssistantResult] = useState('')
  const [assistantPrompt, setAssistantPrompt] = useState('')
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

  function seedFromId(value: string) {
    return value.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
  }

  function formatMinutes(totalMinutes: number) {
    if (totalMinutes < 60) return `${totalMinutes} min`
    const hours = Math.floor(totalMinutes / 60)
    const minutes = totalMinutes % 60
    return `${hours}h ${minutes}m`
  }

  function getMemberMetrics(member: TeamMemberMock) {
    const seed = seedFromId(member.id)
    const chatAssigned = 8 + (seed % 12)
    const chatActive = 2 + (seed % 5)
    const chatClosed = 20 + (seed % 18)
    const chatAvgResponse = formatMinutes(6 + (seed % 18))
    const chatAvgClose = formatMinutes(45 + (seed % 160))
    const ticketPending = seed % 4
    const ticketAnswered = 6 + (seed % 10)
    const ticketArchived = 2 + (seed % 6)
    const ticketAvgResponse = formatMinutes(30 + (seed % 90))
    const emailsSent = 10 + (seed % 30)
    const emailsFailed = seed % 3
    const emailsReplied = 6 + (seed % 14)
    const emailAvgResponse = formatMinutes(40 + (seed % 120))
    const clientesIniciados = 3 + (seed % 8)
    const clientesAtualizados = 8 + (seed % 20)
    const docsAprovados = 6 + (seed % 12)
    const docsRecusados = seed % 5
    const logsTotal = 30 + (seed % 120)
    const slaRate = 86 + (seed % 12)
    const rating = (4.1 + (seed % 7) * 0.1).toFixed(1)

    return {
      chatAssigned,
      chatActive,
      chatClosed,
      chatAvgResponse,
      chatAvgClose,
      ticketPending,
      ticketAnswered,
      ticketArchived,
      ticketAvgResponse,
      emailsSent,
      emailsFailed,
      emailsReplied,
      emailAvgResponse,
      clientesIniciados,
      clientesAtualizados,
      docsAprovados,
      docsRecusados,
      logsTotal,
      slaRate,
      rating,
    }
  }

  function getPercentile(value: number, values: number[]) {
    if (!values.length) return 0
    const sorted = [...values].sort((a, b) => a - b)
    const index = sorted.findIndex((item) => item >= value)
    const rank = index === -1 ? sorted.length : index + 1
    return Math.round((rank / sorted.length) * 100)
  }

  function buildMeasureSummary(member: TeamMemberMock) {
    const metrics = getMemberMetrics(member)
    const allMetrics = team.map((item) => getMemberMetrics(item))
    const chatClosedPct = getPercentile(metrics.chatClosed, allMetrics.map((m) => m.chatClosed))
    const emailReplyPct = getPercentile(metrics.emailsReplied, allMetrics.map((m) => m.emailsReplied))
    const slaPct = getPercentile(metrics.slaRate, allMetrics.map((m) => m.slaRate))
    const ratingPct = getPercentile(Number(metrics.rating), allMetrics.map((m) => Number(m.rating)))

    return [
      `Resultado geral de ${member.nome}:`,
      `• Encerrados no chat: top ${100 - chatClosedPct}%`,
      `• Emails respondidos: top ${100 - emailReplyPct}%`,
      `• SLA: top ${100 - slaPct}%`,
      `• Nota média: top ${100 - ratingPct}%`,
    ].join('\n')
  }

  function buildCompareSummary(member: TeamMemberMock) {
    const metrics = getMemberMetrics(member)
    const seed = seedFromId(member.id)
    const delta = (base: number, offset: number) => base - (seed % offset)

    return [
      `Comparativo do mês atual vs mês anterior:`,
      `• Chats encerrados: ${metrics.chatClosed} (antes ${Math.max(0, delta(metrics.chatClosed, 6))})`,
      `• Emails respondidos: ${metrics.emailsReplied} (antes ${Math.max(0, delta(metrics.emailsReplied, 4))})`,
      `• Tickets respondidos: ${metrics.ticketAnswered} (antes ${Math.max(0, delta(metrics.ticketAnswered, 3))})`,
      `• SLA: ${metrics.slaRate}% (antes ${Math.max(70, metrics.slaRate - (seed % 6))}%)`,
    ].join('\n')
  }

  async function runAssistant(member: TeamMemberMock, mode: 'measure' | 'compare' | 'custom') {
    if (mode === 'measure') {
      setAssistantResult(buildMeasureSummary(member))
      return
    }
    if (mode === 'compare') {
      setAssistantResult(buildCompareSummary(member))
      return
    }
    if (!session?.access_token) return
    if (!assistantPrompt.trim()) {
      setAssistantResult('Digite um pedido para o assistente.')
      return
    }
    setAssistantLoading(true)
    try {
      const payload = await bffFetch<{ response?: string }>('/team/assist', {
        method: 'POST',
        token: session.access_token,
        body: JSON.stringify({
          action: mode,
          query: assistantPrompt,
          member,
          metrics: getMemberMetrics(member),
          team: team.map((item) => ({
            ...item,
            metrics: getMemberMetrics(item),
          })),
        }),
      })
      setAssistantResult(normalizeAssistantText(payload.response ?? 'Sem resposta.'))
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Falha ao executar o assistente.'
      setAssistantResult(message)
    } finally {
      setAssistantLoading(false)
    }
  }

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
        subtitle="Convites, roles e status de presenca."
        actions={
          isAdmin ? (
            <button
              onClick={() => setInviteOpen(true)}
              className="btn-primary rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em]"
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
                onClick={() => {
                  setSelectedMember(member)
                  setProfileOpen(true)
                }}
                className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-stroke bg-white/80 px-4 py-3 transition hover:border-accent/40"
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
                  <StatusBadge variant={member.status} />
                  <span className="text-[11px] uppercase tracking-[0.2em] text-ink/40">
                    {member.lastActivity}
                  </span>
                  <button
                    onClick={(event) => {
                      event.stopPropagation()
                      setSelectedMember(member)
                      setProfileOpen(false)
                      setAssistantMode('measure')
                      setAssistantResult(buildMeasureSummary(member))
                      setAssistantOpen(true)
                    }}
                    className="rounded-full bg-ink px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-white"
                  >
                    Assistente
                  </button>
                  {member.status === 'demitido' ? (
                    <button
                      onClick={(event) => {
                        event.stopPropagation()
                        handleReactivate(member)
                      }}
                      className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs uppercase tracking-[0.2em] text-emerald-700"
                    >
                      Reativar
                    </button>
                  ) : (
                    <button
                      onClick={(event) => {
                        event.stopPropagation()
                        handleFire(member)
                      }}
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
            <p className="mt-2 text-sm text-ink/60">IPs e emails bloqueados.</p>
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
              className="input-base mt-2 py-3"
              placeholder="Nome do colaborador"
            />
          </label>
          <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-ink/50">
            Email
            <input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="input-base mt-2 py-3"
              placeholder="email@empresa.com"
            />
          </label>
          <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-ink/50">
            Telefone
            <input
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              className="input-base mt-2 py-3"
              placeholder="(11) 90000-0000"
            />
          </label>
          <button
            onClick={handleInvite}
            className="btn-primary w-full rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em]"
          >
            Enviar convite
          </button>
        </div>
      </Modal>

      <Modal
        open={assistantOpen}
        title="Assistente"
        onClose={() => setAssistantOpen(false)}
        size="lg"
      >
        {selectedMember ? (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => {
                  setAssistantMode('measure')
                  setAssistantResult(buildMeasureSummary(selectedMember))
                }}
                className={`rounded-full px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] ${
                  assistantMode === 'measure'
                    ? 'bg-accent text-white'
                    : 'border border-stroke bg-white text-ink/70'
                }`}
              >
                Medir resultados
              </button>
              <button
                onClick={() => {
                  setAssistantMode('compare')
                  setAssistantResult(buildCompareSummary(selectedMember))
                }}
                className={`rounded-full px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] ${
                  assistantMode === 'compare'
                    ? 'bg-accent text-white'
                    : 'border border-stroke bg-white text-ink/70'
                }`}
              >
                Comparar resultados
              </button>
              <button
                onClick={() => {
                  setAssistantMode('custom')
                  setAssistantResult('')
                }}
                className={`rounded-full px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] ${
                  assistantMode === 'custom'
                    ? 'bg-accent text-white'
                    : 'border border-stroke bg-white text-ink/70'
                }`}
              >
                Personalizado
              </button>
            </div>
            {assistantMode === 'custom' ? (
              <div className="rounded-2xl border border-stroke bg-white/80 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink/50">
                  Pergunta ou comando
                </p>
                <textarea
                  value={assistantPrompt}
                  onChange={(event) => setAssistantPrompt(event.target.value)}
                  rows={3}
                  placeholder="Ex: comparar desempenho com outros admins e sugerir foco."
                  className="mt-3 w-full rounded-xl border border-stroke bg-white px-4 py-3 text-sm text-ink outline-none focus:border-accent"
                />
                <div className="mt-3 flex justify-end">
                  <button
                    onClick={() => runAssistant(selectedMember, 'custom')}
                    disabled={assistantLoading}
                    className="rounded-full bg-accent px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white disabled:opacity-60"
                  >
                    {assistantLoading ? 'Gerando...' : 'Enviar'}
                  </button>
                </div>
              </div>
            ) : null}
            <div className="rounded-2xl border border-stroke bg-white/80 p-4 text-sm text-ink/80">
              <p className="whitespace-pre-wrap">{assistantResult || 'Sem resultado.'}</p>
            </div>
          </div>
        ) : null}
      </Modal>

      <Modal
        open={profileOpen && Boolean(selectedMember)}
        title={selectedMember ? selectedMember.nome : 'Colaborador'}
        onClose={() => setProfileOpen(false)}
        size="lg"
      >
        {selectedMember ? (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center gap-3">
              <div className="h-14 w-14 overflow-hidden rounded-full border border-stroke bg-white">
                <img
                  src={selectedMember.avatarUrl}
                  alt={selectedMember.nome}
                  className="h-full w-full object-cover"
                />
              </div>
              <div>
                <p className="text-lg font-semibold text-ink">{selectedMember.nome}</p>
                <p className="text-xs text-ink/60">{selectedMember.email}</p>
                <p className="text-xs text-ink/50">{selectedMember.telefone}</p>
              </div>
              <div className="ml-auto flex items-center gap-2">
                <StatusBadge variant={selectedMember.status} />
                <span className="text-[10px] uppercase tracking-[0.2em] text-ink/50">
                  {selectedMember.role}
                </span>
              </div>
            </div>

            {(() => {
              const metrics = getMemberMetrics(selectedMember)
              return (
                <>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="rounded-2xl border border-sky-200 bg-sky-50/80 p-4">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-sky-600">
                        Chats ativos
                      </p>
                      <p className="mt-2 text-3xl font-display text-ink">{metrics.chatActive}</p>
                      <p className="text-xs text-ink/60">Atribuídos {metrics.chatAssigned}</p>
                    </div>
                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-600">
                        SLA no prazo
                      </p>
                      <p className="mt-2 text-3xl font-display text-ink">{metrics.slaRate}%</p>
                      <p className="text-xs text-ink/60">Última atividade {selectedMember.lastActivity}</p>
                    </div>
                    <div className="rounded-2xl border border-violet-200 bg-violet-50/80 p-4">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-violet-600">
                        Emails respondidos
                      </p>
                      <p className="mt-2 text-3xl font-display text-ink">{metrics.emailsReplied}</p>
                      <p className="text-xs text-ink/60">Tempo médio {metrics.emailAvgResponse}</p>
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="rounded-3xl border border-sky-200 bg-white/95 p-5 shadow-soft">
                      <div className="flex items-center gap-3">
                        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-100 text-sky-600">
                          <svg
                            aria-hidden="true"
                            viewBox="0 0 24 24"
                            className="h-5 w-5"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.6"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z" />
                          </svg>
                        </span>
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink/60">
                            Atendimento (chat)
                          </p>
                          <p className="text-xs text-ink/40">Volume e velocidade</p>
                        </div>
                      </div>
                      <div className="mt-4 grid gap-3 text-xs text-ink/60 sm:grid-cols-2">
                        <div className="rounded-2xl border border-sky-100 bg-sky-50/70 p-3">
                          <p className="text-[10px] uppercase tracking-[0.2em] text-sky-600">Atribuídos</p>
                          <p className="mt-2 text-2xl font-display text-ink">{metrics.chatAssigned}</p>
                          <p className="text-[11px] text-ink/50">Ativos {metrics.chatActive}</p>
                        </div>
                        <div className="rounded-2xl border border-sky-100 bg-sky-50/70 p-3">
                          <p className="text-[10px] uppercase tracking-[0.2em] text-sky-600">Encerrados</p>
                          <p className="mt-2 text-2xl font-display text-ink">{metrics.chatClosed}</p>
                          <p className="text-[11px] text-ink/50">Fechamento {metrics.chatAvgClose}</p>
                        </div>
                        <div className="rounded-2xl border border-sky-100 bg-sky-50/70 p-3 sm:col-span-2">
                          <p className="text-[10px] uppercase tracking-[0.2em] text-sky-600">Tempo médio resposta</p>
                          <p className="mt-2 text-2xl font-display text-ink">{metrics.chatAvgResponse}</p>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-3xl border border-amber-200 bg-white/95 p-5 shadow-soft">
                      <div className="flex items-center gap-3">
                        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 text-amber-600">
                          <svg
                            aria-hidden="true"
                            viewBox="0 0 24 24"
                            className="h-5 w-5"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.6"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M4 4h16v12H5.17L4 17.17V4z" />
                            <path d="M8 8h8M8 12h4" />
                          </svg>
                        </span>
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink/60">
                            Jurídico (tickets)
                          </p>
                          <p className="text-xs text-ink/40">Controle de solicitações</p>
                        </div>
                      </div>
                      <div className="mt-4 grid gap-3 text-xs text-ink/60 sm:grid-cols-2">
                        <div className="rounded-2xl border border-amber-100 bg-amber-50/70 p-3">
                          <p className="text-[10px] uppercase tracking-[0.2em] text-amber-600">Pendentes</p>
                          <p className="mt-2 text-2xl font-display text-ink">{metrics.ticketPending}</p>
                        </div>
                        <div className="rounded-2xl border border-amber-100 bg-amber-50/70 p-3">
                          <p className="text-[10px] uppercase tracking-[0.2em] text-amber-600">Respondidos</p>
                          <p className="mt-2 text-2xl font-display text-ink">{metrics.ticketAnswered}</p>
                        </div>
                        <div className="rounded-2xl border border-amber-100 bg-amber-50/70 p-3">
                          <p className="text-[10px] uppercase tracking-[0.2em] text-amber-600">Arquivados</p>
                          <p className="mt-2 text-2xl font-display text-ink">{metrics.ticketArchived}</p>
                        </div>
                        <div className="rounded-2xl border border-amber-100 bg-amber-50/70 p-3">
                          <p className="text-[10px] uppercase tracking-[0.2em] text-amber-600">Tempo médio</p>
                          <p className="mt-2 text-2xl font-display text-ink">{metrics.ticketAvgResponse}</p>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-3xl border border-violet-200 bg-white/95 p-5 shadow-soft">
                      <div className="flex items-center gap-3">
                        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-100 text-violet-600">
                          <svg
                            aria-hidden="true"
                            viewBox="0 0 24 24"
                            className="h-5 w-5"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.6"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M4 4h16v12H4z" />
                            <path d="m22 6-10 7L2 6" />
                          </svg>
                        </span>
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink/60">
                            Emails
                          </p>
                          <p className="text-xs text-ink/40">Envios e resposta</p>
                        </div>
                      </div>
                      <div className="mt-4 grid gap-3 text-xs text-ink/60 sm:grid-cols-2">
                        <div className="rounded-2xl border border-violet-100 bg-violet-50/70 p-3">
                          <p className="text-[10px] uppercase tracking-[0.2em] text-violet-600">Enviados</p>
                          <p className="mt-2 text-2xl font-display text-ink">{metrics.emailsSent}</p>
                        </div>
                        <div className="rounded-2xl border border-violet-100 bg-violet-50/70 p-3">
                          <p className="text-[10px] uppercase tracking-[0.2em] text-violet-600">Com erro</p>
                          <p className="mt-2 text-2xl font-display text-ink">{metrics.emailsFailed}</p>
                        </div>
                        <div className="rounded-2xl border border-violet-100 bg-violet-50/70 p-3">
                          <p className="text-[10px] uppercase tracking-[0.2em] text-violet-600">Respondidos</p>
                          <p className="mt-2 text-2xl font-display text-ink">{metrics.emailsReplied}</p>
                        </div>
                        <div className="rounded-2xl border border-violet-100 bg-violet-50/70 p-3">
                          <p className="text-[10px] uppercase tracking-[0.2em] text-violet-600">Tempo médio</p>
                          <p className="mt-2 text-2xl font-display text-ink">{metrics.emailAvgResponse}</p>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-3xl border border-emerald-200 bg-white/95 p-5 shadow-soft">
                      <div className="flex items-center gap-3">
                        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                          <svg
                            aria-hidden="true"
                            viewBox="0 0 24 24"
                            className="h-5 w-5"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.6"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M4 21v-7a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4v7" />
                            <circle cx="12" cy="7" r="3" />
                          </svg>
                        </span>
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink/60">
                            Clientes e documentos
                          </p>
                          <p className="text-xs text-ink/40">Atualizações realizadas</p>
                        </div>
                      </div>
                      <div className="mt-4 grid gap-3 text-xs text-ink/60 sm:grid-cols-2">
                        <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-3">
                          <p className="text-[10px] uppercase tracking-[0.2em] text-emerald-600">Iniciados</p>
                          <p className="mt-2 text-2xl font-display text-ink">{metrics.clientesIniciados}</p>
                        </div>
                        <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-3">
                          <p className="text-[10px] uppercase tracking-[0.2em] text-emerald-600">Atualizados</p>
                          <p className="mt-2 text-2xl font-display text-ink">{metrics.clientesAtualizados}</p>
                        </div>
                        <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-3">
                          <p className="text-[10px] uppercase tracking-[0.2em] text-emerald-600">Docs aprovados</p>
                          <p className="mt-2 text-2xl font-display text-ink">{metrics.docsAprovados}</p>
                        </div>
                        <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-3">
                          <p className="text-[10px] uppercase tracking-[0.2em] text-emerald-600">Docs recusados</p>
                          <p className="mt-2 text-2xl font-display text-ink">{metrics.docsRecusados}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-3xl border border-slate-200 bg-white/95 p-5 shadow-soft">
                    <div className="flex items-center gap-3">
                      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-600">
                        <svg
                          aria-hidden="true"
                          viewBox="0 0 24 24"
                          className="h-5 w-5"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.6"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M3 12h18" />
                          <path d="M12 3v18" />
                          <path d="M7 7h10v10H7z" />
                        </svg>
                      </span>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink/60">
                          Qualidade e auditoria
                        </p>
                        <p className="text-xs text-ink/40">Impacto e confiabilidade</p>
                      </div>
                    </div>
                    <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-ink/60">
                      <span>Logs no período: <strong>{metrics.logsTotal}</strong></span>
                      <span>SLA: <strong>{metrics.slaRate}%</strong></span>
                      <span>Nota média: <strong>{metrics.rating}</strong></span>
                      <span>Última atividade: <strong>{selectedMember.lastActivity}</strong></span>
                    </div>
                  </div>
                </>
              )
            })()}
          </div>
        ) : null}
      </Modal>
    </div>
  )
}
