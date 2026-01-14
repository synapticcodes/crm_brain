import { useEffect, useMemo, useRef, useState } from 'react'
import PageHeader from '../components/PageHeader'
import { emailsMock, type ChatThreadMock, type EmailMock } from '../lib/mockData'
import { getChatThreads, saveChatThreads, updateChatThread, generateProtocol } from '../lib/chatsStore'
import { getCustomers } from '../lib/customersStore'

type EmailTemplate = {
  id: string
  label: string
  subject: string
  body: string
  variables: string[]
}

type ToastTone = 'success' | 'error' | 'info'
type ToastState = { message: string; tone: ToastTone }

const initialEmailTemplates: EmailTemplate[] = [
  {
    id: 'tmpl-contrato',
    label: 'Atualizacao de contrato',
    subject: 'Atualizacao do contrato e proximos passos',
    body:
      'Oi {nome},\n\nEstamos atualizando seu contrato para incluir as informacoes mais recentes. Por favor, revise os dados anexados e confirme se esta tudo correto.\n\nSe precisar de ajuste, responda este email.\n\nObrigado,\nEquipe BRAIN',
    variables: ['nome'],
  },
  {
    id: 'tmpl-docs',
    label: 'Pendencia de documentos',
    subject: 'Pendencia de documentos para continuidade',
    body:
      'Oi {nome},\n\nAinda faltam alguns documentos para seguirmos com o seu atendimento:\n- Documento de identidade (frente e verso)\n- Comprovante de residencia atualizado\n- Comprovante de renda\n\nAssim que enviar, damos continuidade.\n\nAtenciosamente,\nEquipe BRAIN',
    variables: ['nome'],
  },
  {
    id: 'tmpl-agendamento',
    label: 'Confirmacao de agendamento',
    subject: 'Confirmacao de agendamento',
    body:
      'Oi {nome},\n\nSeu atendimento foi agendado com sucesso.\nData: 24/02/2025\nHorario: 14:30\nCanal: Videoconferencia\n\nQualquer ajuste, nos avise por aqui.\n\nAbraços,\nEquipe BRAIN',
    variables: ['nome'],
  },
]

export default function SupportPage() {
  const [activeTab, setActiveTab] = useState<'chat' | 'email'>('chat')
  const [threads, setThreads] = useState<ChatThreadMock[]>(() => getChatThreads())
  const [emails, setEmails] = useState<EmailMock[]>(emailsMock)
  const [selectedThreadId, setSelectedThreadId] = useState(threads[0]?.id ?? null)
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState<'texto' | 'imagem' | 'arquivo' | 'audio'>('texto')
  const [emailBody, setEmailBody] = useState('')
  const [emailSubject, setEmailSubject] = useState('')
  const [emailTemplates, setEmailTemplates] = useState<EmailTemplate[]>(initialEmailTemplates)
  const [showTemplateForm, setShowTemplateForm] = useState(false)
  const [templateLabel, setTemplateLabel] = useState('')
  const [templateSubject, setTemplateSubject] = useState('')
  const [templateBody, setTemplateBody] = useState('')
  const [templateVariables, setTemplateVariables] = useState('nome')
  const [toast, setToast] = useState<ToastState | null>(null)
  const [chatError, setChatError] = useState('')
  const [chatQuery, setChatQuery] = useState('')
  const [dateFilter, setDateFilter] = useState('all')
  const [selectedYear, setSelectedYear] = useState(String(new Date().getFullYear()))
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')
  const [newChatQuery, setNewChatQuery] = useState('')
  const [selectedCustomerId, setSelectedCustomerId] = useState('')
  const [emailCustomerQuery, setEmailCustomerQuery] = useState('')
  const [selectedEmailCustomerId, setSelectedEmailCustomerId] = useState('')
  const [emailRecipient, setEmailRecipient] = useState('')
  const [selectedSentEmailId, setSelectedSentEmailId] = useState<string | null>(null)
  const [selectedReceivedEmailId, setSelectedReceivedEmailId] = useState<string | null>(
    () => emailsMock.find((email) => email.status === 'recebido')?.id ?? null
  )
  const isSyncingThreadsRef = useRef(false)

  useEffect(() => {
    if (isSyncingThreadsRef.current) {
      isSyncingThreadsRef.current = false
      return
    }
    saveChatThreads(threads)
  }, [threads])

  useEffect(() => {
    function syncThreads() {
      isSyncingThreadsRef.current = true
      setThreads(getChatThreads())
    }
    window.addEventListener('brain:chatsUpdated', syncThreads)
    window.addEventListener('storage', syncThreads)
    return () => {
      window.removeEventListener('brain:chatsUpdated', syncThreads)
      window.removeEventListener('storage', syncThreads)
    }
  }, [])

  const filteredThreads = useMemo(() => {
    const normalized = chatQuery.trim().toLowerCase()
    const now = Date.now()
    const rangeDays =
      dateFilter === 'all' || dateFilter === 'year' || dateFilter === 'custom'
        ? null
        : Number(dateFilter)

    return threads
      .filter((thread) => {
        const matchesQuery =
          !normalized ||
          [
            thread.clienteNome,
            thread.uidid,
            thread.cpf,
            thread.telefone,
            thread.email,
            thread.protocolo,
          ]
            .filter(Boolean)
            .some((value) => String(value).toLowerCase().includes(normalized))

        const last = new Date(thread.lastInteraction)
        const matchesDate = rangeDays
          ? now - last.getTime() <= rangeDays * 24 * 60 * 60 * 1000
          : dateFilter === 'year'
          ? last.getFullYear() === Number(selectedYear)
          : dateFilter === 'custom'
          ? (!customStart || last >= new Date(customStart)) &&
            (!customEnd || last <= new Date(customEnd))
          : true

        return matchesQuery && matchesDate
      })
      .sort((a, b) => new Date(b.lastInteraction).getTime() - new Date(a.lastInteraction).getTime())
  }, [threads, chatQuery, dateFilter, selectedYear, customStart, customEnd])

  const selectedThread =
    filteredThreads.find((thread) => thread.id === selectedThreadId) ??
    threads.find((thread) => thread.id === selectedThreadId) ??
    filteredThreads[0]

  const sentEmails = useMemo(() => emails.filter((email) => email.status === 'enviado'), [emails])
  const receivedEmails = useMemo(() => emails.filter((email) => email.status === 'recebido'), [emails])
  const failedEmails = useMemo(() => emails.filter((email) => email.status === 'erro'), [emails])
  const selectedReceivedEmail = useMemo(
    () => receivedEmails.find((email) => email.id === selectedReceivedEmailId) ?? null,
    [receivedEmails, selectedReceivedEmailId]
  )
  const selectedSentEmail = useMemo(
    () => sentEmails.find((email) => email.id === selectedSentEmailId) ?? null,
    [sentEmails, selectedSentEmailId]
  )

  function applyTemplate(template: EmailTemplate) {
    const customer = getCustomers().find((item) => item.id === selectedEmailCustomerId)
    const variables = {
      nome: customer?.nome ?? 'cliente',
      cpf: customer?.cpf ?? '',
      email: customer?.email ?? '',
    }
    setEmailSubject(
      Object.entries(variables).reduce(
        (subject, [key, value]) => subject.replaceAll(`{${key}}`, value),
        template.subject
      )
    )
    setEmailBody(
      Object.entries(variables).reduce(
        (body, [key, value]) => body.replaceAll(`{${key}}`, value),
        template.body
      )
    )
  }

  function handleAddTemplate() {
    const label = templateLabel.trim()
    const subject = templateSubject.trim()
    const body = templateBody.trim()
    if (!label || !subject || !body) {
      setToast({ message: 'Preencha nome, assunto e corpo do template.', tone: 'error' })
      setTimeout(() => setToast(null), 2000)
      return
    }
    const variables = templateVariables
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
    setEmailTemplates((prev) => [
      {
        id: `tmpl-${Date.now()}`,
        label,
        subject,
        body,
        variables,
      },
      ...prev,
    ])
    setTemplateLabel('')
    setTemplateSubject('')
    setTemplateBody('')
    setTemplateVariables('nome')
    setShowTemplateForm(false)
  }

  useEffect(() => {
    if (receivedEmails.length === 0) {
      if (selectedReceivedEmailId !== null) setSelectedReceivedEmailId(null)
      return
    }
    if (!receivedEmails.some((email) => email.id === selectedReceivedEmailId)) {
      setSelectedReceivedEmailId(receivedEmails[0].id)
    }
  }, [receivedEmails, selectedReceivedEmailId])

  function handleSendMessage() {
    if (!selectedThread || !message.trim()) return
    const now = new Date().toISOString().slice(0, 16).replace('T', ' ')
    updateChatThread(selectedThread.id, (thread) => ({
      ...thread,
      activeProtocol: true,
      protocolo: thread.protocolo || generateProtocol(),
      messages: [
        ...thread.messages,
        {
          id: `C-${Date.now()}`,
          author: 'equipe',
          body: message.trim(),
          timestamp: now,
          type: messageType,
          delivered: true,
          read: false,
        },
      ],
      lastInteraction: now,
    }))
    setThreads(getChatThreads())
    setMessage('')
    setToast({ message: 'Mensagem enviada (mock)', tone: 'success' })
    setTimeout(() => setToast(null), 2000)
  }

  async function handleUpload(kind: 'imagem' | 'arquivo' | 'audio', file: File | null) {
    if (!selectedThread || !file) return
    const now = new Date().toISOString().slice(0, 16).replace('T', ' ')
    const readFile = (inputFile: File) =>
      new Promise<string | undefined>((resolve) => {
        if (kind === 'arquivo') return resolve(undefined)
        const reader = new FileReader()
        reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : undefined)
        reader.readAsDataURL(inputFile)
      })
    const fileUrl = await readFile(file)
    updateChatThread(selectedThread.id, (thread) => ({
      ...thread,
      activeProtocol: true,
      protocolo: thread.protocolo || generateProtocol(),
      messages: [
        ...thread.messages,
        {
          id: `C-${Date.now()}`,
          author: 'equipe',
          body: file.name,
          timestamp: now,
          type: kind,
          delivered: true,
          read: false,
          fileName: file.name,
          fileUrl,
        },
      ],
      lastInteraction: now,
    }))
    setThreads(getChatThreads())
  }

  function handleSendEmail() {
    if (!emailSubject.trim() || !selectedEmailCustomerId || !emailRecipient.trim()) {
      setToast({ message: 'Selecione um cliente e preencha o assunto.', tone: 'error' })
      setTimeout(() => setToast(null), 2000)
      return
    }
    const customer = getCustomers().find((item) => item.id === selectedEmailCustomerId)
    if (!customer) return
    const shouldFail =
      emailRecipient.toLowerCase().includes('erro') || emailSubject.toLowerCase().includes('falha')
    const now = new Date().toISOString().slice(0, 16).replace('T', ' ')
    setEmails((prev) => [
      {
        id: `E-${Date.now()}`,
        clienteNome: customer.nome,
        email: emailRecipient.trim(),
        subject: emailSubject.trim(),
        body: emailBody.trim() || 'Sem corpo informado.',
        status: shouldFail ? 'erro' : 'enviado',
        timestamp: now,
      },
      ...prev,
    ])
    setEmailSubject('')
    setEmailBody('')
    setEmailCustomerQuery('')
    setSelectedEmailCustomerId('')
    setEmailRecipient('')
    setToast({
      message: shouldFail ? 'Falha ao enviar email (mock).' : 'Email enviado com sucesso (mock).',
      tone: shouldFail ? 'error' : 'success',
    })
    setTimeout(() => setToast(null), 2000)
  }

  function handleInitiateChat(thread: ChatThreadMock) {
    const customers = getCustomers()
    const customer = customers.find((item) => item.id === thread.clienteId)
    if (customer && customer.appStatus !== 'liberado') {
      setChatError('Cliente ainda nao se cadastrou no app.')
      setTimeout(() => setChatError(''), 2500)
      return
    }
    const now = new Date().toISOString().slice(0, 16).replace('T', ' ')
    updateChatThread(thread.id, (item) => ({
      ...item,
      activeProtocol: true,
      protocolo: generateProtocol(),
      lastInteraction: now,
    }))
    setThreads(getChatThreads())
  }

  function handleCloseChat(thread: ChatThreadMock) {
    const now = new Date().toISOString().slice(0, 16).replace('T', ' ')
    updateChatThread(thread.id, (item) => ({
      ...item,
      activeProtocol: false,
      protocolo: '',
      lastInteraction: now,
    }))
    setThreads(getChatThreads())
  }

  function handleSimulateIncoming(thread: ChatThreadMock) {
    const now = new Date().toISOString().slice(0, 16).replace('T', ' ')
    updateChatThread(thread.id, (item) => ({
      ...item,
      activeProtocol: true,
      protocolo: item.protocolo || generateProtocol(),
      clienteOnline: true,
      lastInteraction: now,
      messages: [
        ...item.messages,
        {
          id: `C-${Date.now()}`,
          author: 'cliente',
          body: 'Mensagem recebida do cliente.',
          timestamp: now,
          type: 'texto',
        },
      ],
    }))
    setThreads(getChatThreads())
    window.dispatchEvent(
      new CustomEvent('brain:chatIncoming', {
        detail: {
          clienteNome: thread.clienteNome,
          message: 'Mensagem recebida do cliente.',
        },
      })
    )
  }

  function handleStartChatFromCustomer() {
    const customers = getCustomers()
    const customer = customers.find((item) => item.id === selectedCustomerId)
    if (!customer) return
    if (customer.appStatus !== 'liberado') {
      setChatError('Cliente ainda nao se cadastrou no app.')
      setTimeout(() => setChatError(''), 2500)
      return
    }
    const existing = threads.find((thread) => thread.clienteId === customer.id)
    const now = new Date().toISOString().slice(0, 16).replace('T', ' ')
    if (existing) {
      setSelectedThreadId(existing.id)
      handleInitiateChat(existing)
      setNewChatQuery('')
      setSelectedCustomerId('')
      return
    }
    const newThread: ChatThreadMock = {
      id: `CHAT-${Math.floor(100 + Math.random() * 900)}`,
      clienteId: customer.id,
      uidid: customer.id,
      clienteNome: customer.nome,
      cpf: customer.cpf,
      telefone: customer.telefone,
      email: customer.email,
      protocolo: generateProtocol(),
      statusPagamento: customer.statusPagamento,
      lastInteraction: now,
      clienteOnline: false,
      atendenteNome: 'Atendente',
      atendenteOnline: true,
      activeProtocol: true,
      messages: [
        {
          id: `C-${Date.now()}`,
          author: 'equipe',
          body: 'Chat iniciado pelo atendente.',
          timestamp: now,
          type: 'texto',
          delivered: true,
          read: false,
        },
      ],
    }
    setThreads((prev) => [newThread, ...prev])
    setSelectedThreadId(newThread.id)
    setNewChatQuery('')
    setSelectedCustomerId('')
  }

  function exportThread(thread: ChatThreadMock) {
    const content = thread.messages
      .map((msg) => `[${msg.timestamp}] ${msg.author.toUpperCase()}: ${msg.body}`)
      .join('\n')
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${thread.protocolo || thread.id}.txt`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Atendimentos"
        subtitle="Chat com protocolo e emails experimentais para validacao do fluxo."
        actions={
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('chat')}
              className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] ${
                activeTab === 'chat'
                  ? 'bg-ink text-white'
                  : 'border border-stroke bg-white text-ink/70'
              }`}
            >
              Chat
            </button>
            <button
              onClick={() => setActiveTab('email')}
              className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] ${
                activeTab === 'email'
                  ? 'bg-ink text-white'
                  : 'border border-stroke bg-white text-ink/70'
              }`}
            >
              Emails
            </button>
          </div>
        }
      />

      {toast ? (
        <div
          className={`rounded-full border px-4 py-2 text-xs uppercase tracking-[0.2em] ${
            toast.tone === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
              : toast.tone === 'error'
              ? 'border-rose-200 bg-rose-50 text-rose-700'
              : 'border-stroke bg-white/80 text-ink/70'
          }`}
        >
          {toast.message}
        </div>
      ) : null}

      {activeTab === 'chat' ? (
        <div className="grid gap-6 lg:grid-cols-[0.9fr_1.4fr_0.7fr]">
          <div className="surface-panel p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-ink/40">Chats ativos</p>
            <div className="mt-4 space-y-2">
              <input
                value={newChatQuery}
                onChange={(event) => {
                  setNewChatQuery(event.target.value)
                  setSelectedCustomerId('')
                }}
                placeholder="Iniciar chat por cliente..."
                className="w-full rounded-xl border border-stroke bg-white/80 px-3 py-2 text-xs shadow-soft outline-none focus:border-ink"
              />
              {newChatQuery.trim().length > 0 ? (
                <div className="max-h-36 overflow-auto rounded-xl border border-stroke bg-white/90 text-xs text-ink">
                  {getCustomers()
                    .filter((customer) =>
                      `${customer.nome} ${customer.cpf}`.toLowerCase().includes(newChatQuery.toLowerCase())
                    )
                    .map((customer) => (
                      <button
                        key={customer.id}
                        onClick={() => {
                          setSelectedCustomerId(customer.id)
                          setNewChatQuery(`${customer.nome} · ${customer.cpf}`)
                        }}
                        className="flex w-full items-center justify-between px-3 py-2 text-left hover:bg-white"
                      >
                        <span>{customer.nome}</span>
                        <span className="text-[10px] text-ink/50">{customer.cpf}</span>
                      </button>
                    ))}
                </div>
              ) : null}
              <button
                onClick={handleStartChatFromCustomer}
                className="w-full rounded-full bg-ink px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-white"
              >
                Iniciar chat
              </button>
            </div>
            <input
              value={chatQuery}
              onChange={(event) => setChatQuery(event.target.value)}
              placeholder="Buscar cliente, protocolo, CPF..."
              className="mt-4 w-full rounded-xl border border-stroke bg-white/80 px-3 py-2 text-xs shadow-soft outline-none focus:border-ink"
            />
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <select
                value={dateFilter}
                onChange={(event) => setDateFilter(event.target.value)}
                className="rounded-full border border-stroke bg-white/80 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-ink/70"
              >
                <option value="all">Todo periodo</option>
                <option value="1">Diario</option>
                <option value="7">Semanal</option>
                <option value="30">Mensal</option>
                <option value="year">Anual</option>
                <option value="custom">Personalizado</option>
              </select>
              {dateFilter === 'year' ? (
                <select
                  value={selectedYear}
                  onChange={(event) => setSelectedYear(event.target.value)}
                  className="rounded-full border border-stroke bg-white/80 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-ink/70"
                >
                  {Array.from({ length: 6 }, (_, index) => {
                    const year = new Date().getFullYear() - 2 + index
                    return (
                      <option key={year} value={String(year)}>
                        {year}
                      </option>
                    )
                  })}
                </select>
              ) : null}
              {dateFilter === 'custom' ? (
                <div className="flex flex-wrap items-center gap-1">
                  <input
                    type="date"
                    value={customStart}
                    onChange={(event) => setCustomStart(event.target.value)}
                    className="rounded-full border border-stroke bg-white/80 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-ink/70"
                  />
                  <span className="text-[10px] uppercase tracking-[0.2em] text-ink/50">ate</span>
                  <input
                    type="date"
                    value={customEnd}
                    onChange={(event) => setCustomEnd(event.target.value)}
                    className="rounded-full border border-stroke bg-white/80 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-ink/70"
                  />
                </div>
              ) : null}
            </div>
            <div className="mt-4 space-y-3">
              {filteredThreads.map((thread) => (
                <button
                  key={thread.id}
                  onClick={() => setSelectedThreadId(thread.id)}
                  className={`w-full rounded-2xl border px-4 py-3 text-left ${
                    selectedThreadId === thread.id
                      ? 'border-ink bg-ink text-white'
                      : 'border-stroke bg-white/80 text-ink'
                  }`}
                >
                  <div className="flex items-center justify-between text-sm font-semibold">
                    <span className="flex items-center gap-2">
                      <span className={`h-2 w-2 rounded-full ${thread.clienteOnline ? 'bg-teal' : 'bg-stone-400'}`} />
                      {thread.clienteNome}
                    </span>
                    <span className="text-xs uppercase tracking-[0.2em]">
                      {thread.statusPagamento}
                    </span>
                  </div>
                  <p className="mt-2 text-xs opacity-70">
                    {thread.uidid} · {thread.cpf}
                  </p>
                  <p className="mt-1 text-[11px] uppercase tracking-[0.2em] opacity-60">
                    {thread.telefone} · {thread.email}
                  </p>
                  <p className="mt-1 text-[11px] uppercase tracking-[0.2em] opacity-60">
                    Protocolo: {thread.protocolo || 'sem protocolo'}
                  </p>
                  <p className="mt-1 text-[11px] uppercase tracking-[0.2em] opacity-60">
                    Atendente: {thread.atendenteNome} {thread.atendenteOnline ? 'online' : 'offline'}
                  </p>
                </button>
              ))}
            </div>
          </div>

          <div className="surface-panel flex h-[1040px] max-h-[92vh] flex-col p-6">
            {selectedThread ? (
              <>
                <div className="flex items-center justify-between border-b border-stroke pb-4">
                  <div>
                    <h3 className="text-xl font-display text-ink">{selectedThread.clienteNome}</h3>
                    <p className="text-xs uppercase tracking-[0.2em] text-ink/50">
                      {selectedThread.protocolo || 'sem protocolo'} · {selectedThread.cpf}
                    </p>
                    <p className="text-[11px] uppercase tracking-[0.2em] text-ink/40">
                      Atendente: {selectedThread.atendenteNome} · {selectedThread.clienteOnline ? 'cliente online' : 'cliente offline'}
                    </p>
                  </div>
                  <span className="rounded-full border border-stroke bg-white px-3 py-1 text-xs uppercase tracking-[0.2em] text-ink/70">
                    {selectedThread.activeProtocol ? 'protocolo ativo' : 'protocolo encerrado'}
                  </span>
                </div>

                <div className="mt-6 flex-1 space-y-3 overflow-y-auto pr-2">
                  {selectedThread.messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`rounded-2xl px-4 py-3 text-sm ${
                        msg.author === 'equipe' ? 'bg-ink text-white' : 'bg-white/80 text-ink'
                      }`}
                    >
                      <p>
                        {msg.type !== 'texto' ? `[${msg.type.toUpperCase()}] ` : ''}
                        {msg.body}
                      </p>
                      {msg.type === 'imagem' && msg.fileUrl ? (
                        <img src={msg.fileUrl} alt={msg.fileName} className="mt-2 w-full rounded-xl" />
                      ) : null}
                      {msg.type === 'audio' && msg.fileUrl ? (
                        <audio className="mt-2 w-full" controls src={msg.fileUrl} />
                      ) : null}
                      {msg.type === 'arquivo' && msg.fileName ? (
                        <div className="mt-2 text-xs text-white/70">Arquivo: {msg.fileName}</div>
                      ) : null}
                      {msg.author === 'equipe' ? (
                        <p className="mt-1 text-[10px] uppercase tracking-[0.2em] opacity-60">
                          {msg.read ? 'visualizada' : msg.delivered ? 'entregue' : 'enviada'}
                        </p>
                      ) : null}
                      <p className="mt-2 text-[11px] uppercase tracking-[0.2em] opacity-60">{msg.timestamp}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-6 flex flex-col gap-3">
                  {chatError ? (
                    <div className="rounded-xl border border-accent/30 bg-accent/10 px-4 py-2 text-xs text-accent">
                      {chatError}
                    </div>
                  ) : null}
                  <textarea
                    value={message}
                    onChange={(event) => setMessage(event.target.value)}
                    rows={3}
                    placeholder="Enviar mensagem..."
                    className="w-full rounded-2xl border border-stroke bg-white/80 px-4 py-3 text-sm shadow-soft outline-none focus:border-ink"
                  />
                  <div className="flex flex-wrap gap-3">
                    <select
                      value={messageType}
                      onChange={(event) => setMessageType(event.target.value as typeof messageType)}
                      className="rounded-full border border-stroke bg-white px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-ink/70"
                    >
                      <option value="texto">Texto</option>
                      <option value="imagem">Imagem</option>
                      <option value="arquivo">Arquivo</option>
                      <option value="audio">Audio</option>
                    </select>
                    <button
                      onClick={handleSendMessage}
                      className="rounded-full bg-ink px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white"
                    >
                      Enviar mensagem
                    </button>
                    <button
                      onClick={() => exportThread(selectedThread)}
                      className="rounded-full border border-stroke bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-ink/70"
                    >
                      Exportar TXT
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs">
                    <label className="rounded-full border border-stroke bg-white px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-ink/70">
                      Upload imagem
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(event) => handleUpload('imagem', event.target.files?.[0] ?? null)}
                      />
                    </label>
                    <label className="rounded-full border border-stroke bg-white px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-ink/70">
                      Upload arquivo
                      <input
                        type="file"
                        className="hidden"
                        onChange={(event) => handleUpload('arquivo', event.target.files?.[0] ?? null)}
                      />
                    </label>
                    <label className="rounded-full border border-stroke bg-white px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-ink/70">
                      Upload audio
                      <input
                        type="file"
                        accept="audio/mpeg,audio/ogg"
                        className="hidden"
                        onChange={(event) => handleUpload('audio', event.target.files?.[0] ?? null)}
                      />
                    </label>
                  </div>
                  <p className="text-xs text-ink/50">
                    Audio, anexos e delivery status sao simulados neste MVP.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => handleSimulateIncoming(selectedThread)}
                      className="rounded-full border border-stroke bg-white px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-ink/70"
                    >
                      Simular mensagem do cliente
                    </button>
                    {selectedThread.activeProtocol ? (
                      <button
                        onClick={() => handleCloseChat(selectedThread)}
                        className="rounded-full border border-stroke bg-white px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-ink/70"
                      >
                        Encerrar chat
                      </button>
                    ) : (
                      <button
                        onClick={() => handleInitiateChat(selectedThread)}
                        className="rounded-full bg-ink px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-white"
                      >
                        Iniciar chat
                      </button>
                    )}
                  </div>
                </div>
              </>
            ) : null}
          </div>

          <div className="space-y-4">
            <div className="surface-panel p-5">
              <p className="text-xs uppercase tracking-[0.2em] text-ink/40">SLA</p>
              <p className="mt-4 text-3xl font-display text-ink">92%</p>
              <p className="mt-2 text-sm text-ink/60">Atendimentos dentro do prazo hoje.</p>
            </div>
            <div className="surface-panel p-5">
              <p className="text-xs uppercase tracking-[0.2em] text-ink/40">Notas</p>
              <p className="mt-4 text-3xl font-display text-ink">4.6</p>
              <p className="mt-2 text-sm text-ink/60">Media das avaliacoes recentes.</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
          <div className="surface-panel p-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-display text-ink">Emails recebidos</h3>
              <span className="accent-pill">{receivedEmails.length} itens</span>
            </div>
            <div className="mt-6 space-y-3">
              {receivedEmails.map((email) => (
                <button
                  key={email.id}
                  onClick={() => setSelectedReceivedEmailId(email.id)}
                  className={`w-full rounded-2xl border px-4 py-3 text-left text-sm transition ${
                    selectedReceivedEmailId === email.id
                      ? 'border-ink bg-ink text-white'
                      : 'border-stroke bg-white/80 text-ink'
                  }`}
                >
                  <p className="font-semibold">{email.clienteNome}</p>
                  <p className="text-xs opacity-70">{email.subject}</p>
                  <p className="mt-2 text-[11px] uppercase tracking-[0.2em] opacity-60">{email.timestamp}</p>
                </button>
              ))}
            </div>
            <div className="mt-6 rounded-2xl border border-stroke bg-white/80 p-5 text-sm">
              {selectedReceivedEmail ? (
                <>
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-ink/50">Remetente</p>
                      <p className="mt-1 font-semibold text-ink">{selectedReceivedEmail.clienteNome}</p>
                      <p className="text-xs text-ink/60">{selectedReceivedEmail.email}</p>
                    </div>
                    <span className="text-[11px] uppercase tracking-[0.2em] text-ink/50">
                      {selectedReceivedEmail.timestamp}
                    </span>
                  </div>
                  <p className="mt-4 text-xs uppercase tracking-[0.2em] text-ink/50">Assunto</p>
                  <p className="mt-1 font-semibold text-ink">{selectedReceivedEmail.subject}</p>
                  <p className="mt-4 whitespace-pre-wrap text-sm text-ink/80">
                    {selectedReceivedEmail.body}
                  </p>
                </>
              ) : (
                <p className="text-ink/50">Selecione um email para visualizar.</p>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div className="surface-panel p-6">
              <h3 className="text-xl font-display text-ink">Enviar email</h3>
              <div className="mt-4 space-y-3">
                <div>
                  <input
                    value={emailCustomerQuery}
                    onChange={(event) => {
                      setEmailCustomerQuery(event.target.value)
                      setSelectedEmailCustomerId('')
                      setEmailRecipient('')
                    }}
                    placeholder="Buscar cliente por nome ou CPF..."
                    className="w-full rounded-xl border border-stroke bg-white/80 px-4 py-2 text-sm shadow-soft outline-none focus:border-ink"
                  />
                  {emailCustomerQuery.trim().length > 0 ? (
                    <div className="mt-2 max-h-40 overflow-auto rounded-xl border border-stroke bg-white/90 text-xs text-ink">
                      {getCustomers()
                        .filter((customer) =>
                          `${customer.nome} ${customer.cpf}`.toLowerCase().includes(emailCustomerQuery.toLowerCase())
                        )
                        .map((customer) => (
                          <button
                            key={customer.id}
                            onClick={() => {
                              setSelectedEmailCustomerId(customer.id)
                              setEmailCustomerQuery(`${customer.nome} · ${customer.cpf}`)
                              setEmailRecipient(customer.email)
                            }}
                            className="flex w-full items-center justify-between px-3 py-2 text-left hover:bg-white"
                          >
                            <span>{customer.nome}</span>
                            <span className="text-[10px] text-ink/50">{customer.cpf}</span>
                          </button>
                        ))}
                    </div>
                  ) : null}
                </div>
                <input
                  value={emailRecipient}
                  onChange={(event) => setEmailRecipient(event.target.value)}
                  placeholder="Destinatario"
                  className="w-full rounded-xl border border-stroke bg-white/80 px-4 py-2 text-sm shadow-soft outline-none focus:border-ink"
                />
                <input
                  value={emailSubject}
                  onChange={(event) => setEmailSubject(event.target.value)}
                  placeholder="Assunto"
                  className="w-full rounded-xl border border-stroke bg-white/80 px-4 py-2 text-sm shadow-soft outline-none focus:border-ink"
                />
                <textarea
                  value={emailBody}
                  onChange={(event) => setEmailBody(event.target.value)}
                  rows={4}
                  placeholder="Corpo do email"
                  className="w-full rounded-xl border border-stroke bg-white/80 px-4 py-2 text-sm shadow-soft outline-none focus:border-ink"
                />
                <div className="flex flex-wrap gap-2">
                  {emailTemplates.map((template) => (
                    <button
                      key={template.id}
                      onClick={() => {
                        applyTemplate(template)
                      }}
                      className="rounded-full border border-stroke bg-white px-3 py-1 text-xs uppercase tracking-[0.2em] text-ink/60"
                    >
                      {template.label}
                    </button>
                  ))}
                  <button
                    onClick={() => setShowTemplateForm((prev) => !prev)}
                    className="rounded-full border border-dashed border-stroke bg-white px-3 py-1 text-xs uppercase tracking-[0.2em] text-ink/60"
                  >
                    Adicionar template
                  </button>
                </div>
                {showTemplateForm ? (
                  <div className="rounded-2xl border border-stroke bg-white/80 p-4 text-sm">
                    <p className="text-xs uppercase tracking-[0.2em] text-ink/50">Novo template</p>
                    <div className="mt-3 space-y-2">
                      <input
                        value={templateLabel}
                        onChange={(event) => setTemplateLabel(event.target.value)}
                        placeholder="Nome do template"
                        className="w-full rounded-xl border border-stroke bg-white/90 px-3 py-2 text-sm outline-none focus:border-ink"
                      />
                      <input
                        value={templateSubject}
                        onChange={(event) => setTemplateSubject(event.target.value)}
                        placeholder="Assunto (use {nome}, {cpf}, {email})"
                        className="w-full rounded-xl border border-stroke bg-white/90 px-3 py-2 text-sm outline-none focus:border-ink"
                      />
                      <textarea
                        value={templateBody}
                        onChange={(event) => setTemplateBody(event.target.value)}
                        rows={4}
                        placeholder="Corpo do template (use {nome}, {cpf}, {email})"
                        className="w-full rounded-xl border border-stroke bg-white/90 px-3 py-2 text-sm outline-none focus:border-ink"
                      />
                      <input
                        value={templateVariables}
                        onChange={(event) => setTemplateVariables(event.target.value)}
                        placeholder="Variaveis (ex: nome, cpf, email)"
                        className="w-full rounded-xl border border-stroke bg-white/90 px-3 py-2 text-sm outline-none focus:border-ink"
                      />
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        onClick={handleAddTemplate}
                        className="rounded-full bg-ink px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-white"
                      >
                        Salvar template
                      </button>
                      <button
                        onClick={() => setShowTemplateForm(false)}
                        className="rounded-full border border-stroke bg-white px-3 py-1 text-xs uppercase tracking-[0.2em] text-ink/60"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : null}
                <button
                  onClick={handleSendEmail}
                  className="w-full rounded-full bg-ink px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white"
                >
                  Enviar email
                </button>
                <p className="text-xs text-ink/50">BCC e emails banco sao simulados neste MVP.</p>
              </div>
            </div>

            <div className="surface-panel p-6">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-display text-ink">Envios recentes</h3>
                <span className="accent-pill">{sentEmails.length} enviados</span>
              </div>
              <div className="mt-4 space-y-3">
                {sentEmails.map((email) => (
                  <button
                    key={email.id}
                    onClick={() => setSelectedSentEmailId(email.id)}
                    className="w-full rounded-2xl border border-stroke bg-white/80 px-4 py-3 text-left text-sm transition hover:border-ink/50"
                  >
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-ink">{email.clienteNome}</p>
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] uppercase tracking-[0.2em] text-emerald-700">
                        Sucesso
                      </span>
                    </div>
                    <p className="text-xs text-ink/50">{email.subject}</p>
                    <p className="text-[11px] uppercase tracking-[0.2em] text-ink/40">{email.timestamp}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="surface-panel p-6">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-display text-ink">Falhas</h3>
                <span className="accent-pill">{failedEmails.length} erros</span>
              </div>
              <div className="mt-4 space-y-3 text-sm text-ink/60">
                {failedEmails.map((email) => (
                  <div key={email.id} className="rounded-2xl border border-rose-300 bg-rose-50 px-4 py-3">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-rose-900">{email.clienteNome}</p>
                      <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] uppercase tracking-[0.2em] text-rose-700">
                        Erro
                      </span>
                    </div>
                    <p className="text-xs text-rose-700/80">{email.subject}</p>
                    <p className="mt-1 text-[11px] uppercase tracking-[0.2em] text-rose-700/70">
                      {email.timestamp}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
      {selectedSentEmail ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 px-4">
          <div className="w-full max-w-2xl rounded-3xl border border-stroke bg-white p-6 shadow-soft">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-ink/50">Destinatario</p>
                <p className="mt-1 text-lg font-semibold text-ink">{selectedSentEmail.clienteNome}</p>
                <p className="text-xs text-ink/60">{selectedSentEmail.email}</p>
              </div>
              <button
                onClick={() => setSelectedSentEmailId(null)}
                className="rounded-full border border-stroke px-3 py-1 text-xs uppercase tracking-[0.2em] text-ink/60"
              >
                Fechar
              </button>
            </div>
            <p className="mt-4 text-xs uppercase tracking-[0.2em] text-ink/50">Assunto</p>
            <p className="mt-1 font-semibold text-ink">{selectedSentEmail.subject}</p>
            <p className="mt-4 text-xs uppercase tracking-[0.2em] text-ink/50">Mensagem</p>
            <p className="mt-2 whitespace-pre-wrap text-sm text-ink/80">{selectedSentEmail.body}</p>
            <p className="mt-6 text-[11px] uppercase tracking-[0.2em] text-ink/40">
              {selectedSentEmail.timestamp}
            </p>
          </div>
        </div>
      ) : null}
    </div>
  )
}
