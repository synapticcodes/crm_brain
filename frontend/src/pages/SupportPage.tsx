import { useEffect, useMemo, useRef, useState } from 'react'
import PageHeader from '../components/PageHeader'
import Modal from '../components/Modal'
import StatusBadge from '../components/StatusBadge'
import { emailsMock, teamMock, type ChatThreadMock, type EmailMock } from '../lib/mockData'
import { normalizeAssistantText } from '../lib/assistantText'
import { getChatThreads, saveChatThreads, updateChatThread, generateProtocol } from '../lib/chatsStore'
import { getCustomers, saveCustomers } from '../lib/customersStore'
import { formatTimestamp } from '../lib/formatTimestamp'
import { supabase } from '../lib/supabaseClient'
import { bffFetch } from '../lib/apiBff'
import { useAuth } from '../hooks/useAuth'
import { playSound } from '../lib/soundEffects'

type EmailTemplate = {
  id: string
  label: string
  subject: string
  body: string
  variables: string[]
}

type ToastTone = 'success' | 'error' | 'info'
type ToastState = { message: string; tone: ToastTone }

const CHAT_TEMPLATES = [
  { id: 'saudacao', label: 'Saudacao', body: 'Oi {nome}, tudo bem? Como posso ajudar?' },
  { id: 'analise', label: 'Analise', body: 'Recebemos sua solicitacao e ja estamos analisando.' },
  { id: 'documentos', label: 'Documentos', body: 'Pode nos enviar o comprovante atualizado?' },
  { id: 'status', label: 'Status', body: 'Seu processo segue em analise. Retorno em ate 48h.' },
]

const CHAT_EMOJIS = ['😀', '😊', '😉', '😍', '😅', '😂', '😮', '😢', '😡', '👍', '🙏', '❤️']
const CHAT_TEMPLATE_STORAGE_KEY = 'brain_chat_templates'

const initialEmailTemplates: EmailTemplate[] = [
  {
    id: 'tmpl-contrato',
    label: 'Atualizacao de contrato',
    subject: 'Atualizacao do contrato e proximos passos',
    body:
      'Oi {nome},\n\nEstamos atualizando seu contrato para incluir as informacoes mais recentes. Por favor, revise os dados anexados e confirme se esta tudo correto.\n\nSe precisar de ajuste, responda este email.\n\nObrigado,\nEquipe Meu Nome Ok',
    variables: ['nome'],
  },
  {
    id: 'tmpl-docs',
    label: 'Pendencia de documentos',
    subject: 'Pendencia de documentos para continuidade',
    body:
      'Oi {nome},\n\nAinda faltam alguns documentos para seguirmos com o seu atendimento:\n- Documento de identidade (frente e verso)\n- Comprovante de residencia atualizado\n- Comprovante de renda\n\nAssim que enviar, damos continuidade.\n\nAtenciosamente,\nEquipe Meu Nome Ok',
    variables: ['nome'],
  },
  {
    id: 'tmpl-agendamento',
    label: 'Confirmacao de agendamento',
    subject: 'Confirmacao de agendamento',
    body:
      'Oi {nome},\n\nSeu atendimento foi agendado com sucesso.\nData: 24/02/2025\nHorario: 14:30\nCanal: Videoconferencia\n\nQualquer ajuste, nos avise por aqui.\n\nAbraços,\nEquipe Meu Nome Ok',
    variables: ['nome'],
  },
]

export default function SupportPage() {
  const { session } = useAuth()
  const [activeTab, setActiveTab] = useState<'chat' | 'email'>('chat')
  const [threads, setThreads] = useState<ChatThreadMock[]>(() => getChatThreads())
  const [emails, setEmails] = useState<EmailMock[]>(emailsMock)
  const [selectedThreadId, setSelectedThreadId] = useState(threads[0]?.id ?? null)
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null)
  const [assigneeFilter, setAssigneeFilter] = useState('all')
  const [message, setMessage] = useState('')
  const [emailBody, setEmailBody] = useState('')
  const [emailSubject, setEmailSubject] = useState('')
  const [emailTemplates, setEmailTemplates] = useState<EmailTemplate[]>(initialEmailTemplates)
  const [showTemplateForm, setShowTemplateForm] = useState(false)
  const [templateLabel, setTemplateLabel] = useState('')
  const [templateSubject, setTemplateSubject] = useState('')
  const [templateBody, setTemplateBody] = useState('')
  const [showEmailTemplateSelect, setShowEmailTemplateSelect] = useState(false)
  const [emailTemplateSearch, setEmailTemplateSearch] = useState('')
  const [showEmailTemplateManager, setShowEmailTemplateManager] = useState(false)
  const [emailAttachments, setEmailAttachments] = useState<
    { id: string; name: string; size: number; type: string; url: string }[]
  >([])
  const [emailTemplateEditOpen, setEmailTemplateEditOpen] = useState(false)
  const [emailTemplateEditing, setEmailTemplateEditing] = useState<EmailTemplate | null>(null)
  const [emailTemplateEditLabel, setEmailTemplateEditLabel] = useState('')
  const [emailTemplateEditSubject, setEmailTemplateEditSubject] = useState('')
  const [emailTemplateEditBody, setEmailTemplateEditBody] = useState('')
  const [emailTemplatePreviewOpen, setEmailTemplatePreviewOpen] = useState(false)
  const [emailTemplatePreview, setEmailTemplatePreview] = useState<EmailTemplate | null>(null)
  const [emailAssistantOpen, setEmailAssistantOpen] = useState(false)
  const [emailAssistantMode, setEmailAssistantMode] = useState<'improve' | 'create'>('improve')
  const [emailAssistantGoal, setEmailAssistantGoal] = useState('')
  const [emailAssistantTone, setEmailAssistantTone] = useState('Profissional')
  const [emailAssistantToneChoice, setEmailAssistantToneChoice] = useState('Profissional')
  const [emailAssistantCustomTone, setEmailAssistantCustomTone] = useState('')
  const [emailAssistantLoading, setEmailAssistantLoading] = useState(false)
  const [emailAssistantResult, setEmailAssistantResult] = useState('')
  const [emailReplyContextId, setEmailReplyContextId] = useState<string | null>(null)
  const [receivedVisibleCount, setReceivedVisibleCount] = useState(6)
  const [sentVisibleCount, setSentVisibleCount] = useState(6)
  const [failedVisibleCount, setFailedVisibleCount] = useState(6)
  const [showReceivedSearch, setShowReceivedSearch] = useState(false)
  const [showSentSearch, setShowSentSearch] = useState(false)
  const [showFailedSearch, setShowFailedSearch] = useState(false)
  const [receivedSearch, setReceivedSearch] = useState('')
  const [sentSearch, setSentSearch] = useState('')
  const [failedSearch, setFailedSearch] = useState('')
  const [toast, setToast] = useState<ToastState | null>(null)
  const [chatError, setChatError] = useState('')
  const [chatQuery, setChatQuery] = useState('')
  const [dateFilter, setDateFilter] = useState('all')
  const [chatStatusFilter, setChatStatusFilter] = useState<'all' | 'active' | 'closed'>('all')
  const [selectedYear, setSelectedYear] = useState(String(new Date().getFullYear()))
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')
  const [selectedChatTemplateId, setSelectedChatTemplateId] = useState('')
  const [showTemplateMenu, setShowTemplateMenu] = useState(false)
  const [showTemplateSelect, setShowTemplateSelect] = useState(false)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const emojiPickerRef = useRef<HTMLDivElement | null>(null)
  const [isRecording, setIsRecording] = useState(false)
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null)
  const [waveformMap, setWaveformMap] = useState<Record<string, number[]>>({})
  const recorderRef = useRef<MediaRecorder | null>(null)
  const recordChunksRef = useRef<Blob[]>([])
  const audioRefs = useRef(new Map<string, HTMLAudioElement>())
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserMapRef = useRef(new Map<string, AnalyserNode>())
  const sourceMapRef = useRef(new Map<string, MediaElementAudioSourceNode>())
  const rafRef = useRef<number | null>(null)
  const durationMapRef = useRef(new Map<string, number>())
  const [durationMap, setDurationMap] = useState<Record<string, string>>({})
  const [messageSearch, setMessageSearch] = useState('')
  const [matchIndex, setMatchIndex] = useState(0)
  const [showSearchBar, setShowSearchBar] = useState(false)
  const messageRefs = useRef(new Map<string, HTMLDivElement>())
  const [newChatQuery, setNewChatQuery] = useState('')
  const [selectedCustomerId, setSelectedCustomerId] = useState('')
  const [emailCustomerQuery, setEmailCustomerQuery] = useState('')
  const [selectedEmailCustomerId, setSelectedEmailCustomerId] = useState('')
  const [emailRecipient, setEmailRecipient] = useState('')
  const [selectedSentEmailId, setSelectedSentEmailId] = useState<string | null>(null)
  const [selectedReceivedEmailId, setSelectedReceivedEmailId] = useState<string | null>(
    () => emailsMock.find((email) => email.status === 'recebido')?.id ?? null
  )
  const [profileCustomerId, setProfileCustomerId] = useState<string | null>(null)
  const [profileCustomerVersion, setProfileCustomerVersion] = useState(0)
  const [assistantOpen, setAssistantOpen] = useState(false)
  const [assistantLoading, setAssistantLoading] = useState(false)
  const [assistantSummary, setAssistantSummary] = useState('')
  const [assistantSuggestion, setAssistantSuggestion] = useState('')
  const [assistantQuery, setAssistantQuery] = useState('')
  const [assistantResults, setAssistantResults] = useState<
    { message_id: string; content: string; created_at: string; similarity: number }[]
  >([])
  const [assistantPromptOpen, setAssistantPromptOpen] = useState(false)
  const [assistantPromptInput, setAssistantPromptInput] = useState('')
  const [assistantPromptMessages, setAssistantPromptMessages] = useState<
    { role: 'user' | 'assistant'; content: string }[]
  >([])
  const [assistantPromptLoading, setAssistantPromptLoading] = useState(false)
  const [assistantPromptTone, setAssistantPromptTone] = useState('Profissional')
  const [assistantPromptToneChoice, setAssistantPromptToneChoice] = useState('Profissional')
  const [assistantPromptCustomTone, setAssistantPromptCustomTone] = useState('')
  const [chatTemplates, setChatTemplates] = useState(() => {
    if (typeof window === 'undefined') return CHAT_TEMPLATES
    const raw = window.localStorage.getItem(CHAT_TEMPLATE_STORAGE_KEY)
    if (!raw) return CHAT_TEMPLATES
    try {
      const stored = JSON.parse(raw) as { id: string; label: string; body: string }[]
      return stored.length ? stored : CHAT_TEMPLATES
    } catch {
      return CHAT_TEMPLATES
    }
  })
  const [templateModalOpen, setTemplateModalOpen] = useState(false)
  const [chatTemplateTitle, setChatTemplateTitle] = useState('')
  const [chatTemplateBody, setChatTemplateBody] = useState('')
  const isSyncingThreadsRef = useRef(false)

  useEffect(() => {
    let mounted = true
    supabase.auth.getUser().then(({ data }) => {
      if (!mounted) return
      const fallbackAdmin = teamMock.find((member) => member.role === 'admin')?.email ?? null
      setCurrentUserEmail(data.user?.email ?? fallbackAdmin)
    })
    return () => {
      mounted = false
    }
  }, [])

  const currentUserName = useMemo(() => {
    if (!currentUserEmail) return 'Atendente'
    const matched = teamMock.find((member) => member.email === currentUserEmail)
    return matched?.nome ?? 'Atendente'
  }, [currentUserEmail])

  const isAdmin = useMemo(() => {
    if (!currentUserEmail) return false
    const matched = teamMock.find((member) => member.email === currentUserEmail)
    if (!matched) return true
    return matched.role === 'admin'
  }, [currentUserEmail])

  useEffect(() => {
    if (!currentUserEmail || isAdmin) return
    setAssigneeFilter(currentUserEmail)
  }, [currentUserEmail, isAdmin])

  useEffect(() => {
    if (!showEmojiPicker) return
    function handleOutsideClick(event: MouseEvent) {
      const target = event.target as Node
      if (!emojiPickerRef.current) return
      if (emojiPickerRef.current.contains(target)) return
      setShowEmojiPicker(false)
    }
    window.addEventListener('mousedown', handleOutsideClick)
    return () => window.removeEventListener('mousedown', handleOutsideClick)
  }, [showEmojiPicker])

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

        const matchesStatus =
          chatStatusFilter === 'all'
            ? true
            : chatStatusFilter === 'active'
            ? thread.activeProtocol
            : !thread.activeProtocol

        const matchesAssignee = isAdmin
          ? assigneeFilter === 'all'
            ? true
            : assigneeFilter === 'unassigned'
            ? !thread.ownerEmail
            : thread.ownerEmail === assigneeFilter
          : thread.ownerEmail === currentUserEmail

        return matchesQuery && matchesDate && matchesStatus && matchesAssignee
      })
      .sort((a, b) => new Date(b.lastInteraction).getTime() - new Date(a.lastInteraction).getTime())
  }, [
    threads,
    chatQuery,
    dateFilter,
    selectedYear,
    customStart,
    customEnd,
    chatStatusFilter,
    isAdmin,
    assigneeFilter,
    currentUserEmail,
  ])

  const selectedThread =
    filteredThreads.find((thread) => thread.id === selectedThreadId) ??
    threads.find((thread) => thread.id === selectedThreadId) ??
    filteredThreads[0]
  const selectedAppStatus = useMemo(() => {
    if (!selectedThread) return 'pendente'
    return getCustomers().find((customer) => customer.id === selectedThread.clienteId)?.appStatus ?? 'pendente'
  }, [selectedThread, profileCustomerVersion])

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
  const profileCustomer = useMemo(
    () => getCustomers().find((customer) => customer.id === profileCustomerId) ?? null,
    [profileCustomerId, profileCustomerVersion]
  )
  const searchTokens = useMemo(() => {
    return messageSearch
      .trim()
      .toLowerCase()
      .split(/[,\s]+/)
      .filter(Boolean)
  }, [messageSearch])

  const messageMatches = useMemo(() => {
    if (!selectedThread || searchTokens.length === 0) return []
    return selectedThread.messages.filter((msg) => {
      if (!msg.body) return false
      const content = msg.body.toLowerCase()
      return searchTokens.some((token) => content.includes(token))
    })
  }, [selectedThread, searchTokens])

  useEffect(() => {
    if (!selectedThread) return
    const hasUnread = selectedThread.messages.some(
      (msg) => msg.author === 'cliente' && !msg.read
    )
    if (!hasUnread) return
    updateChatThread(selectedThread.id, (thread) => ({
      ...thread,
      messages: thread.messages.map((msg) =>
        msg.author === 'cliente' ? { ...msg, read: true } : msg
      ),
    }))
    setThreads(getChatThreads())
  }, [selectedThreadId])

  function getMessageDateLabel(timestamp: string) {
    const [datePart] = timestamp.split(' ')
    const messageDate = new Date(datePart)
    const today = new Date()
    const yesterday = new Date()
    yesterday.setDate(today.getDate() - 1)
    const sameDay = (a: Date, b: Date) =>
      a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate()
    if (sameDay(messageDate, today)) return 'Hoje'
    if (sameDay(messageDate, yesterday)) return 'Ontem'
    return messageDate.toLocaleDateString('pt-BR')
  }

  function getMessagePreview(thread: ChatThreadMock) {
    const last = thread.messages[thread.messages.length - 1]
    if (!last) return 'Sem mensagens.'
    if (last.type !== 'texto') return `[${last.type.toUpperCase()}] ${last.body}`
    const preview = last.body.trim()
    return preview.length > 80 ? `${preview.slice(0, 80)}...` : preview
  }

  function getPaymentTone(status: string) {
    const normalized = status.toLowerCase()
    if (normalized.includes('inadimplente')) return 'border-rose-200 bg-rose-50 text-rose-700'
    if (normalized.includes('atraso')) return 'border-orange-200 bg-orange-50 text-orange-700'
    if (normalized.includes('dia')) return 'border-emerald-200 bg-emerald-50 text-emerald-700'
    if (normalized.includes('aguardando') || normalized.includes('pendente')) {
      return 'border-amber-200 bg-amber-50 text-amber-700'
    }
    return 'border-stroke bg-white text-ink/70'
  }

  function getPaymentDot(status: string) {
    const normalized = status.toLowerCase()
    if (normalized.includes('inadimplente')) return 'bg-rose-500'
    if (normalized.includes('atraso')) return 'bg-orange-400'
    if (normalized.includes('dia')) return 'bg-emerald-500'
    if (normalized.includes('aguardando') || normalized.includes('pendente')) return 'bg-amber-400'
    return 'bg-slate-300'
  }

  function getAppTone(status: string) {
    const normalized = status.toLowerCase()
    if (normalized.includes('liberado')) return 'border-emerald-200 bg-emerald-50 text-emerald-700'
    if (normalized.includes('bloqueado')) return 'border-rose-200 bg-rose-50 text-rose-700'
    return 'border-amber-200 bg-amber-50 text-amber-700'
  }

  function getUnreadCount(thread: ChatThreadMock) {
    return thread.messages.filter((msg) => msg.author === 'cliente' && !msg.read).length
  }

  function getWaveHeights(id: string) {
    return waveformMap[id] ?? Array.from({ length: 16 }, () => 4)
  }

  function stopWaveform() {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
  }

  function ensureAudioNodes(messageId: string) {
    const audio = audioRefs.current.get(messageId)
    if (!audio) return null
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext()
    }
    const context = audioContextRef.current
    if (!context) return null
    let analyser = analyserMapRef.current.get(messageId)
    if (!analyser) {
      analyser = context.createAnalyser()
      analyser.fftSize = 64
      analyserMapRef.current.set(messageId, analyser)
      let source = sourceMapRef.current.get(messageId)
      if (!source) {
        source = context.createMediaElementSource(audio)
        sourceMapRef.current.set(messageId, source)
      }
      source.connect(analyser)
      analyser.connect(context.destination)
    }
    return analyser
  }

  function startWaveform(messageId: string) {
    const analyser = ensureAudioNodes(messageId)
    if (!analyser) return
    const bufferLength = analyser.frequencyBinCount
    const dataArray = new Uint8Array(bufferLength)
    const barCount = 16
    const tick = () => {
      analyser.getByteTimeDomainData(dataArray)
      const bars = Array.from({ length: barCount }, (_, index) => {
        const dataIndex = Math.floor((index / barCount) * bufferLength)
        const value = dataArray[dataIndex] / 128 - 1
        const amplitude = Math.min(1, Math.abs(value))
        return Math.max(3, Math.round(amplitude * 22) + 3)
      })
      setWaveformMap((prev) => ({ ...prev, [messageId]: bars }))
      rafRef.current = requestAnimationFrame(tick)
    }
    tick()
  }

  function formatAudioDuration(seconds: number) {
    if (!Number.isFinite(seconds)) return '0:00'
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${String(secs).padStart(2, '0')}`
  }

  function toggleAudio(messageId: string) {
    const current = audioRefs.current.get(messageId)
    if (!current) return
    if (playingAudioId === messageId) {
      current.pause()
      current.currentTime = 0
      setPlayingAudioId(null)
      stopWaveform()
      setWaveformMap((prev) => ({ ...prev, [messageId]: Array.from({ length: 16 }, () => 4) }))
      return
    }
    if (playingAudioId) {
      const previous = audioRefs.current.get(playingAudioId)
      if (previous) {
        previous.pause()
        previous.currentTime = 0
      }
    }
    current.play()
    setPlayingAudioId(messageId)
    stopWaveform()
    startWaveform(messageId)
  }

  const templateFilter = useMemo(() => {
    if (!message.trim().startsWith('/')) return ''
    return message.trim().slice(1).toLowerCase()
  }, [message])

  const filteredTemplates = useMemo(() => {
    if (!templateFilter) return chatTemplates
    return chatTemplates.filter((template) =>
      `${template.label} ${template.body}`.toLowerCase().includes(templateFilter)
    )
  }, [templateFilter, chatTemplates])

  const filteredEmailTemplates = useMemo(() => {
    const normalized = emailTemplateSearch.trim().toLowerCase()
    if (!normalized) return emailTemplates
    return emailTemplates.filter((template) =>
      `${template.label} ${template.subject}`.toLowerCase().includes(normalized)
    )
  }, [emailTemplates, emailTemplateSearch])

  const filteredReceivedEmails = useMemo(() => {
    const normalized = receivedSearch.trim().toLowerCase()
    if (!normalized) return receivedEmails
    return receivedEmails.filter((email) =>
      `${email.clienteNome} ${email.subject}`.toLowerCase().includes(normalized)
    )
  }, [receivedEmails, receivedSearch])

  const filteredSentEmails = useMemo(() => {
    const normalized = sentSearch.trim().toLowerCase()
    if (!normalized) return sentEmails
    return sentEmails.filter((email) =>
      `${email.clienteNome} ${email.subject}`.toLowerCase().includes(normalized)
    )
  }, [sentEmails, sentSearch])

  const filteredFailedEmails = useMemo(() => {
    const normalized = failedSearch.trim().toLowerCase()
    if (!normalized) return failedEmails
    return failedEmails.filter((email) =>
      `${email.clienteNome} ${email.subject}`.toLowerCase().includes(normalized)
    )
  }, [failedEmails, failedSearch])

  const lastAssistantIndex = useMemo(() => {
    return assistantPromptMessages.map((msg) => msg.role).lastIndexOf('assistant')
  }, [assistantPromptMessages])

  const lastAssistantMessage =
    lastAssistantIndex >= 0 ? assistantPromptMessages[lastAssistantIndex] : null

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(CHAT_TEMPLATE_STORAGE_KEY, JSON.stringify(chatTemplates))
  }, [chatTemplates])

  useEffect(() => {
    if (!message.trim().startsWith('/')) {
      setShowTemplateMenu(false)
    }
  }, [message])

  useEffect(() => {
    setMatchIndex(0)
  }, [messageSearch, selectedThread?.id])

  useEffect(() => {
    if (!assistantPromptOpen) return
    setAssistantPromptInput('')
    setAssistantPromptMessages([])
  }, [assistantPromptOpen, selectedThread?.id])

  function highlightText(text: string, tokens: string[]) {
    if (!tokens.length) return text
    const escaped = tokens.map((token) => token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    const regex = new RegExp(`(${escaped.join('|')})`, 'gi')
    return text.split(regex).map((part, index) => {
      const match = tokens.some((token) => part.toLowerCase() === token.toLowerCase())
      return match ? (
        <span key={`${part}-${index}`} className="rounded bg-amber-200/60 px-1 text-ink">
          {part}
        </span>
      ) : (
        part
      )
    })
  }

  function jumpToMatch(nextIndex: number) {
    if (messageMatches.length === 0) return
    const clamped = (nextIndex + messageMatches.length) % messageMatches.length
    setMatchIndex(clamped)
    const target = messageMatches[clamped]
    const element = messageRefs.current.get(target.id)
    element?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  useEffect(() => {
    return () => {
      stopWaveform()
      if (audioContextRef.current) {
        audioContextRef.current.close()
        audioContextRef.current = null
      }
    }
  }, [])

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

  useEffect(() => {
    if (typeof window === 'undefined') return
    receivedEmails.forEach((email) => {
      window.dispatchEvent(
        new CustomEvent('brain:emailReceived', {
          detail: {
            emailId: email.id,
            clienteNome: email.clienteNome,
            subject: email.subject,
          },
        })
      )
    })
  }, [receivedEmails])

  function handleSendMessage() {
    if (!selectedThread || !message.trim()) return
    const now = new Date().toISOString().slice(0, 16).replace('T', ' ')
    updateChatThread(selectedThread.id, (thread) => ({
      ...thread,
      activeProtocol: true,
      protocolo: thread.protocolo || generateProtocol(),
      ownerEmail: thread.ownerEmail ?? currentUserEmail,
      messages: [
        ...thread.messages,
        {
          id: `C-${Date.now()}`,
          author: 'equipe',
          body: message.trim(),
          timestamp: now,
          type: 'texto',
          delivered: true,
          read: false,
        },
      ],
      lastInteraction: now,
    }))
    setThreads(getChatThreads())
    setMessage('')
    setToast({ message: 'Mensagem enviada (mock)', tone: 'success' })
    playSound('success')
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
      ownerEmail: thread.ownerEmail ?? currentUserEmail,
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

  async function toggleRecording() {
    if (!selectedThread) return
    if (isRecording && recorderRef.current) {
      recorderRef.current.stop()
      return
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setToast({ message: 'Gravacao de audio nao suportada neste navegador.', tone: 'error' })
      setTimeout(() => setToast(null), 2000)
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      recorderRef.current = recorder
      recordChunksRef.current = []
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) recordChunksRef.current.push(event.data)
      }
      recorder.onstop = async () => {
        const blob = new Blob(recordChunksRef.current, { type: 'audio/webm' })
        const url = URL.createObjectURL(blob)
        const now = new Date().toISOString().slice(0, 16).replace('T', ' ')
        updateChatThread(selectedThread.id, (thread) => ({
          ...thread,
          activeProtocol: true,
          protocolo: thread.protocolo || generateProtocol(),
          ownerEmail: thread.ownerEmail ?? currentUserEmail,
          messages: [
            ...thread.messages,
            {
              id: `C-${Date.now()}`,
              author: 'equipe',
              body: '',
              timestamp: now,
              type: 'audio',
              delivered: true,
              read: false,
              fileName: 'audio.webm',
              fileUrl: url,
            },
          ],
          lastInteraction: now,
        }))
        setThreads(getChatThreads())
        stream.getTracks().forEach((track) => track.stop())
        setIsRecording(false)
      }
      recorder.start()
      setIsRecording(true)
    } catch {
      setToast({ message: 'Nao foi possivel acessar o microfone.', tone: 'error' })
      setTimeout(() => setToast(null), 2000)
    }
  }

  async function runAssistant(action: 'summary_short' | 'summary_long' | 'suggest_reply' | 'search') {
    if (!selectedThread || !session?.access_token) return
    setAssistantLoading(true)
    setAssistantSummary('')
    setAssistantSuggestion('')
    if (action !== 'search') setAssistantResults([])
    try {
      const payload = await bffFetch<{
        summary?: string
        suggestion?: string
        results?: { message_id: string; content: string; created_at: string; similarity: number }[]
      }>('/chat/assist', {
        method: 'POST',
        token: session.access_token,
        body: JSON.stringify({
          thread_id: selectedThread.id,
          action,
          query: assistantQuery || undefined
        })
      })
      if (payload.summary) setAssistantSummary(normalizeAssistantText(payload.summary))
      if (payload.suggestion) setAssistantSuggestion(normalizeAssistantText(payload.suggestion))
      if (payload.results) {
        setAssistantResults(
          payload.results.map((item) => ({
            ...item,
            content: normalizeAssistantText(item.content)
          }))
        )
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Falha ao executar o assistente.'
      setToast({ message, tone: 'error' })
      setTimeout(() => setToast(null), 2000)
    } finally {
      setAssistantLoading(false)
    }
  }

  async function runAssistantPrompt() {
    if (!selectedThread || !session?.access_token) return
    const prompt = assistantPromptInput.trim()
    if (!prompt) {
      setToast({ message: 'Digite uma pergunta para o assistente.', tone: 'error' })
      setTimeout(() => setToast(null), 2000)
      return
    }
    setAssistantPromptLoading(true)
    setAssistantPromptInput('')
    setAssistantPromptMessages((prev) => [...prev, { role: 'user', content: prompt }])
    try {
      const payload = await bffFetch<{ suggestion?: string }>('/chat/assist', {
        method: 'POST',
        token: session.access_token,
        body: JSON.stringify({
          thread_id: selectedThread.id,
          action: 'suggest_reply',
          query: prompt,
          tone:
            assistantPromptToneChoice === 'Outro'
              ? assistantPromptCustomTone
              : assistantPromptToneChoice,
        })
      })
      const reply = payload.suggestion ? normalizeAssistantText(payload.suggestion) : ''
      if (!reply) {
        throw new Error('Resposta vazia do assistente.')
      }
      setAssistantPromptMessages((prev) => [...prev, { role: 'assistant', content: reply }])
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Falha ao executar o assistente.'
      setToast({ message, tone: 'error' })
      setAssistantPromptMessages((prev) => [
        ...prev,
        { role: 'assistant', content: `Falha ao gerar resposta: ${message}` },
      ])
      setTimeout(() => setToast(null), 2000)
    } finally {
      setAssistantPromptLoading(false)
    }
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
    const actor = teamMock.find((member) => member.email === currentUserEmail)
    const actorName = actor?.nome ?? 'Equipe'
    const actorEmail = currentUserEmail ?? 'equipe@local.test'
    setEmails((prev) => [
      {
        id: `E-${Date.now()}`,
        clienteNome: customer.nome,
        email: emailRecipient.trim(),
        subject: emailSubject.trim(),
        body: emailBody.trim() || 'Sem corpo informado.',
        attachments: emailAttachments,
        status: shouldFail ? 'erro' : 'enviado',
        timestamp: now,
        actorName,
        actorEmail,
      },
      ...prev,
    ])
    setEmailSubject('')
    setEmailBody('')
    setEmailAttachments([])
    setEmailCustomerQuery('')
    setSelectedEmailCustomerId('')
    setEmailRecipient('')
    setToast({
      message: shouldFail ? 'Falha ao enviar email (mock).' : 'Email enviado com sucesso (mock).',
      tone: shouldFail ? 'error' : 'success',
    })
    playSound(shouldFail ? 'error' : 'success')
    setTimeout(() => setToast(null), 2000)
  }

  function handleReplyReceivedEmail(email: EmailMock) {
    const customer = getCustomers().find(
      (item) => item.email.toLowerCase() === email.email.toLowerCase()
    )
    setSelectedEmailCustomerId(customer?.id ?? '')
    setEmailCustomerQuery(
      customer ? `${customer.nome} · ${customer.cpf}` : `${email.clienteNome}`
    )
    setEmailRecipient(email.email)
    const subject = email.subject.trim()
    setEmailSubject(subject.toLowerCase().startsWith('re:') ? subject : `Re: ${subject}`)
    setEmailBody(`\n\n---\n${email.body}`)
    setEmailAttachments([])
    setEmailReplyContextId(email.id)
    setEmailAssistantGoal('')
    setEmailAssistantResult('')
  }

  async function runEmailAssistant(mode: 'improve' | 'create') {
    if (!session?.access_token) {
      setToast({ message: 'Sessao expirada. Faça login novamente.', tone: 'error' })
      setTimeout(() => setToast(null), 2000)
      return
    }
    if (mode === 'improve' && !emailBody.trim() && !emailSubject.trim()) {
      setToast({ message: 'Preencha assunto ou corpo para melhorar.', tone: 'error' })
      setTimeout(() => setToast(null), 2000)
      return
    }
    if (mode === 'create' && !emailAssistantGoal.trim()) {
      setToast({ message: 'Informe o objetivo do email.', tone: 'error' })
      setTimeout(() => setToast(null), 2000)
      return
    }
    setEmailAssistantLoading(true)
    try {
      const selectedCustomer = getCustomers().find(
        (item) => item.id === selectedEmailCustomerId
      )
      const useReceivedContext =
        Boolean(emailReplyContextId) && selectedReceivedEmail?.id === emailReplyContextId
      const receivedContext = useReceivedContext
        ? {
            received_subject: selectedReceivedEmail.subject,
            received_body: selectedReceivedEmail.body,
            received_from: selectedReceivedEmail.email,
          }
        : {}
      const enforceClientContext = Boolean(selectedEmailCustomerId) && !useReceivedContext
      const payload = await bffFetch<{ subject?: string; body?: string }>('/email/assist', {
        method: 'POST',
        token: session.access_token,
        body: JSON.stringify({
          action: mode,
          subject: emailSubject,
          body: emailBody,
          goal: mode === 'create' ? emailAssistantGoal : '',
          tone:
            emailAssistantToneChoice === 'Outro'
              ? emailAssistantCustomTone
              : emailAssistantToneChoice,
          client_name: enforceClientContext ? selectedCustomer?.nome ?? '' : '',
          sender_name: currentUserName,
          company_name: 'Meu Nome Ok',
          ...receivedContext,
        }),
      })
      const replacementName = selectedCustomer?.nome ?? ''
      const replacementCompany = 'Meu Nome Ok'
      const replacementSender = currentUserName
      const replaceClientName = (value: string) =>
        value
          .replaceAll('{client_name}', replacementName)
          .replaceAll('{{client_name}}', replacementName)
          .replaceAll('{nome}', replacementName)
          .replaceAll(`{${replacementName}}`, replacementName)
      const replaceFooterTokens = (value: string) =>
        value
          .replaceAll('[Seu nome]', replacementSender)
          .replaceAll('[Seu Nome]', replacementSender)
          .replaceAll('{{sender_name}}', replacementSender)
          .replaceAll('{sender_name}', replacementSender)
          .replaceAll('[Meu Nome Ok]', replacementCompany)
          .replaceAll('[Meu nome ok]', replacementCompany)
          .replaceAll('{{company_name}}', replacementCompany)
          .replaceAll('{company_name}', replacementCompany)
          .replaceAll('[Nome da empresa]', replacementCompany)
      const normalizeEmailText = (value: string) => replaceFooterTokens(replaceClientName(value))
      const nextSubject = normalizeEmailText(payload.subject?.trim() ?? '')
      const nextBody = normalizeEmailText(payload.body?.trim() ?? '')
      setEmailAssistantResult(
        [nextSubject ? `Assunto: ${nextSubject}` : null, nextBody].filter(Boolean).join('\n\n')
      )
      if (nextSubject) setEmailSubject(nextSubject)
      if (nextBody) setEmailBody(nextBody)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Falha ao executar o assistente.'
      setToast({ message, tone: 'error' })
      setTimeout(() => setToast(null), 2000)
    } finally {
      setEmailAssistantLoading(false)
    }
  }

  function handleEmailAttachment(file: File | null) {
    if (!file) return
    const url = URL.createObjectURL(file)
    setEmailAttachments((prev) => [
      ...prev,
      {
        id: `email-file-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        name: file.name,
        size: file.size,
        type: file.type || 'arquivo',
        url,
      },
    ])
  }

  function removeEmailAttachment(attachmentId: string) {
    setEmailAttachments((prev) => {
      const removed = prev.find((item) => item.id === attachmentId)
      if (removed) {
        URL.revokeObjectURL(removed.url)
      }
      return prev.filter((item) => item.id !== attachmentId)
    })
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
          read: false,
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
    playSound('incoming')
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
      ownerEmail: currentUserEmail ?? null,
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
      .map((msg) => `[${formatTimestamp(msg.timestamp)}] ${msg.author.toUpperCase()}: ${msg.body}`)
      .join('\n')
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${thread.protocolo || thread.id}.txt`
    link.click()
    URL.revokeObjectURL(url)
  }

  function updateProfileStatus(status: 'pendente' | 'liberado' | 'bloqueado') {
    if (!profileCustomer) return
    const customers = getCustomers()
    const updated = customers.map((customer) =>
      customer.id === profileCustomer.id ? { ...customer, appStatus: status } : customer
    )
    saveCustomers(updated)
    setProfileCustomerVersion((prev) => prev + 1)
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Atendimentos"
        subtitle="Centralize atendimentos com chat protocolado e notificações por email"
        actions={
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('chat')}
              className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] ${
                activeTab === 'chat'
                  ? 'bg-accent text-white'
                  : 'border border-stroke bg-white text-ink/70'
              }`}
            >
              Chat
            </button>
            <button
              onClick={() => setActiveTab('email')}
              className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] ${
                activeTab === 'email'
                  ? 'bg-accent text-white'
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
        <div className="grid gap-6 lg:grid-cols-[0.82fr_2.18fr] xl:grid-cols-[0.78fr_2.22fr]">
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
                className="w-full rounded-xl border border-stroke bg-white/80 px-3 py-2 text-xs shadow-soft outline-none focus:border-accent"
              />
              {newChatQuery.trim().length > 0 ? (
                <div className="max-h-36 overflow-auto rounded-xl border border-stroke bg-white/90 text-xs text-ink">
                  {getCustomers()
                    .filter((customer) => customer.appStatus === 'liberado')
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
                className="w-full rounded-full bg-accent px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-white"
              >
                Iniciar chat
              </button>
            </div>
            <input
              value={chatQuery}
              onChange={(event) => setChatQuery(event.target.value)}
              placeholder="Buscar cliente, protocolo, CPF..."
              className="mt-4 w-full rounded-xl border border-stroke bg-white/80 px-3 py-2 text-xs shadow-soft outline-none focus:border-accent"
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
            <div className="mt-3 flex items-center rounded-full border border-stroke bg-white/80 p-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-ink/70">
              {(['all', 'active', 'closed'] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setChatStatusFilter(filter)}
                  className={`rounded-full px-3 py-1 ${
                    chatStatusFilter === filter ? 'bg-accent text-white' : 'text-ink/70'
                  }`}
                >
                  {filter === 'all' ? 'Todos' : filter === 'active' ? 'Abertos' : 'Finalizados'}
                </button>
              ))}
            </div>
            {isAdmin ? (
              <select
                value={assigneeFilter}
                onChange={(event) => setAssigneeFilter(event.target.value)}
                className="mt-3 w-full rounded-full border border-stroke bg-white/80 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-ink/70"
              >
                <option value="all">Todos atendentes</option>
                <option value="unassigned">Sem dono</option>
                {teamMock.map((member) => (
                  <option key={member.id} value={member.email}>
                    {member.nome}
                  </option>
                ))}
              </select>
            ) : null}
            <div className="mt-4 space-y-3">
              {filteredThreads.map((thread) => (
                <button
                  key={thread.id}
                  onClick={() => setSelectedThreadId(thread.id)}
                  className={`w-full rounded-2xl border px-4 py-3 text-left ${
                    selectedThreadId === thread.id
                      ? 'border-accent bg-accent text-white'
                      : 'border-stroke bg-white/80 text-ink'
                  }`}
                >
                  {(() => {
                    const lastMsg = thread.messages[thread.messages.length - 1]
                    const isCustomer = lastMsg?.author === 'cliente'
                    return (
                      <>
                  <div className="flex items-center justify-between text-sm font-semibold">
                    <span className="flex items-center gap-2">
                      <span
                        className={`h-2 w-2 rounded-full ${
                          thread.clienteOnline ? 'bg-emerald-500' : 'bg-stone-400'
                        }`}
                      />
                      {thread.clienteNome}
                    </span>
                    <div className="flex items-center gap-2">
                      {getUnreadCount(thread) > 0 ? (
                        <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] uppercase tracking-[0.2em] text-white">
                          {getUnreadCount(thread)}
                        </span>
                      ) : null}
                      <span
                        className={`rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-[0.2em] ${getPaymentTone(
                          thread.statusPagamento
                        )}`}
                      >
                        {thread.statusPagamento}
                      </span>
                    </div>
                  </div>
                  <p className="mt-2 text-xs opacity-70">{thread.cpf}</p>
                  <p className={`mt-2 text-xs ${isCustomer ? 'font-semibold text-ink' : 'text-ink/60'}`}>
                    {getMessagePreview(thread)}
                  </p>
                      </>
                    )
                  })()}
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
                    <p className="text-xs font-semibold text-ink/70">
                      {selectedThread.protocolo || 'Sem protocolo'} · {selectedThread.cpf}
                    </p>
                    <p className="mt-1 text-xs font-semibold text-ink/60">
                      Atendente: {selectedThread.atendenteNome} ·{' '}
                      {selectedThread.clienteOnline ? 'cliente online' : 'cliente offline'}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span className="rounded-full border border-stroke bg-white px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-ink/70">
                        Canal: App
                      </span>
                      <span className="rounded-full border border-stroke bg-white px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-ink/70">
                        Status ticket: {selectedThread.activeProtocol ? 'Ativo' : 'Encerrado'}
                      </span>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <span
                        className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[10px] uppercase tracking-[0.2em] ${getPaymentTone(
                          selectedThread.statusPagamento
                        )}`}
                      >
                        <span className={`h-2 w-2 rounded-full ${getPaymentDot(selectedThread.statusPagamento)}`} />
                        Pagamento: {selectedThread.statusPagamento}
                      </span>
                      <span
                        className={`rounded-full border px-3 py-1 text-[10px] uppercase tracking-[0.2em] ${getAppTone(
                          selectedAppStatus
                        )}`}
                      >
                        App: {selectedAppStatus}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex shrink-0 items-center gap-2 rounded-full border px-3 py-1 text-xs uppercase tracking-[0.2em] ${
                        selectedThread.clienteOnline
                          ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                          : 'border-slate-200 bg-slate-50 text-slate-500'
                      }`}
                    >
                      <span
                        className={`h-2 w-2 rounded-full ${
                          selectedThread.clienteOnline ? 'bg-emerald-500' : 'bg-slate-400'
                        }`}
                      />
                      {selectedThread.clienteOnline ? 'online' : 'offline'}
                    </span>
                    <button
                      onClick={() => {
                        setAssistantOpen(true)
                        setAssistantSummary('')
                        setAssistantSuggestion('')
                        setAssistantResults([])
                      }}
                      className="inline-flex shrink-0 items-center gap-2 rounded-full bg-ink px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-white shadow-soft"
                    >
                      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-white/10">
                        <svg
                          aria-hidden="true"
                          viewBox="0 0 24 24"
                          className="h-4 w-4 text-white"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.6"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <rect x="6" y="8" width="12" height="10" rx="3" />
                          <path d="M9 8V6a3 3 0 0 1 6 0v2" />
                          <path d="M9 13h.01M15 13h.01" />
                          <path d="M4 12H2M22 12h-2M12 4V2" />
                        </svg>
                      </span>
                      Assistente
                    </button>
                    <button
                      onClick={() => {
                        setProfileCustomerId(selectedThread.clienteId)
                      }}
                      className="shrink-0 rounded-full bg-accent px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-white"
                    >
                      <span className="inline-flex items-center gap-2">
                        <svg
                          aria-hidden="true"
                          viewBox="0 0 24 24"
                          className="h-4 w-4"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.6"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M2 12s4-6 10-6 10 6 10 6-4 6-10 6-10-6-10-6Z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                        Ver perfil
                      </span>
                    </button>
                    <button
                      onClick={() => exportThread(selectedThread)}
                      className="shrink-0 rounded-full bg-accent px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-white"
                    >
                      <span className="inline-flex items-center gap-2">
                        <svg
                          aria-hidden="true"
                          viewBox="0 0 24 24"
                          className="h-4 w-4"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.6"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M12 3v12" />
                          <path d="m7 11 5 5 5-5" />
                          <path d="M5 21h14" />
                        </svg>
                        Exportar
                      </span>
                    </button>
                  </div>
                </div>

                <div className="mt-6 flex-1 space-y-4 overflow-y-auto pr-2">
                  {showSearchBar ? (
                    <div className="sticky top-0 z-10 rounded-2xl border border-stroke bg-white/90 p-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <input
                          value={messageSearch}
                          onChange={(event) => setMessageSearch(event.target.value)}
                          placeholder="Buscar por palavra-chave..."
                          className="flex-1 rounded-full border border-stroke bg-white px-4 py-2 text-xs text-ink/70 outline-none focus:border-accent"
                        />
                        <span className="text-[10px] uppercase tracking-[0.2em] text-ink/50">
                          {messageMatches.length ? `${matchIndex + 1}/${messageMatches.length}` : '0/0'}
                        </span>
                        <button
                          onClick={() => jumpToMatch(matchIndex - 1)}
                          className="rounded-full border border-stroke bg-white px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-ink/60"
                          disabled={messageMatches.length === 0}
                        >
                          Anterior
                        </button>
                        <button
                          onClick={() => jumpToMatch(matchIndex + 1)}
                          className="rounded-full border border-stroke bg-white px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-ink/60"
                          disabled={messageMatches.length === 0}
                        >
                          Proxima
                        </button>
                      </div>
                    </div>
                  ) : null}
                  {selectedThread.messages.map((msg, index) => {
                    const previous = selectedThread.messages[index - 1]
                    const showDivider =
                      !previous ||
                      getMessageDateLabel(previous.timestamp) !== getMessageDateLabel(msg.timestamp)
                    return (
                      <div
                        key={msg.id}
                        ref={(element) => {
                          if (element) messageRefs.current.set(msg.id, element)
                        }}
                        className="space-y-3"
                      >
                        {showDivider ? (
                          <div className="flex items-center justify-center">
                            <span className="rounded-full border border-stroke bg-white px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-ink/50">
                              {getMessageDateLabel(msg.timestamp)}
                            </span>
                          </div>
                        ) : null}
                        <div
                          className={`flex ${msg.author === 'equipe' ? 'justify-end' : 'justify-start'}`}
                        >
                          <div className="flex max-w-[78%] items-start gap-2">
                            {msg.author === 'equipe' ? (
                              <span className="mt-1 inline-flex h-7 w-7 items-center justify-center rounded-full bg-accent/15 text-xs font-semibold uppercase text-accent">
                                {selectedThread.atendenteNome.slice(0, 1)}
                              </span>
                            ) : null}
                            <div
                              className={`rounded-2xl px-4 py-3 text-sm shadow-soft ${
                                msg.author === 'equipe'
                                  ? 'bg-accent text-white'
                                  : 'border border-stroke bg-white text-ink'
                              }`}
                            >
                              <div className="flex w-full items-center justify-between gap-3 text-[11px] uppercase tracking-[0.2em] opacity-70">
                                <span>{msg.author === 'equipe' ? 'Equipe' : 'Cliente'}</span>
                                {msg.author === 'equipe' ? (
                                  <span className="inline-flex items-center gap-1">
                                    {msg.read ? (
                                      <>
                                        lida <span className="text-[10px]">✓✓</span>
                                      </>
                                    ) : msg.delivered ? (
                                      <>
                                        entregue <span className="text-[10px]">✓</span>
                                      </>
                                    ) : (
                                      'enviada'
                                    )}
                                  </span>
                                ) : null}
                              </div>
                              {msg.body ? (
                                <p className="mt-2">
                                  {msg.type !== 'texto' ? `[${msg.type.toUpperCase()}] ` : ''}
                                  {highlightText(msg.body, searchTokens)}
                                </p>
                              ) : null}
                              {msg.type === 'imagem' && msg.fileUrl ? (
                                <img src={msg.fileUrl} alt={msg.fileName} className="mt-2 w-full rounded-xl" />
                              ) : null}
                              {msg.type === 'audio' && msg.fileUrl ? (
                                <div className="mt-3 flex items-center gap-3 rounded-xl border border-white/20 bg-white/10 px-3 py-2">
                                  <button
                                    onClick={() => toggleAudio(msg.id)}
                                    className={`flex h-9 w-9 items-center justify-center rounded-full text-xs font-semibold ${
                                      msg.author === 'equipe'
                                        ? 'bg-white/20 text-white'
                                        : 'bg-accent/10 text-accent'
                                    }`}
                                    type="button"
                                  >
                                    {playingAudioId === msg.id ? '||' : '▶'}
                                  </button>
                                  <div className="flex flex-1 items-center gap-1">
                                    {getWaveHeights(msg.id).map((height, index) => (
                                      <span
                                        key={`${msg.id}-${index}`}
                                        style={{ height: `${height}px` }}
                                        className={`w-1 rounded-full ${
                                          msg.author === 'equipe'
                                            ? 'bg-white/70'
                                            : 'bg-ink/40'
                                        }`}
                                      />
                                    ))}
                                  </div>
                                  <audio
                                    ref={(element) => {
                                      if (!element) return
                                      audioRefs.current.set(msg.id, element)
                                      if (!durationMapRef.current.has(msg.id)) {
                                        const setDuration = () => {
                                          durationMapRef.current.set(msg.id, element.duration || 0)
                                          setDurationMap((prev) => ({
                                            ...prev,
                                            [msg.id]: formatAudioDuration(element.duration || 0),
                                          }))
                                        }
                                        if (Number.isFinite(element.duration) && element.duration) {
                                          setDuration()
                                        } else {
                                          element.addEventListener('loadedmetadata', setDuration, { once: true })
                                        }
                                      }
                                    }}
                                    src={msg.fileUrl}
                                    onEnded={() => {
                                      setPlayingAudioId(null)
                                      stopWaveform()
                                      setWaveformMap((prev) => ({
                                        ...prev,
                                        [msg.id]: Array.from({ length: 16 }, () => 4),
                                      }))
                                    }}
                                  />
                                  <span className="text-[10px] uppercase tracking-[0.2em] text-white/60">
                                    {durationMap[msg.id] ?? '0:00'}
                                  </span>
                                </div>
                              ) : null}
                              {msg.type === 'arquivo' && msg.fileName ? (
                                <div className="mt-2 text-xs opacity-70">Arquivo: {msg.fileName}</div>
                              ) : null}
                              <p
                                className={`mt-2 text-[10px] uppercase tracking-[0.2em] ${
                                  msg.author === 'equipe' ? 'text-white/60' : 'text-ink/40'
                                }`}
                              >
                                {formatTimestamp(msg.timestamp)}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
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
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' && !event.shiftKey) {
                        event.preventDefault()
                        if (showTemplateMenu) return
                        handleSendMessage()
                        return
                      }
                      if (event.key === '/') {
                        setShowTemplateMenu(true)
                      }
                    }}
                    rows={3}
                    placeholder="Escreva para o cliente..."
                    className="w-full rounded-2xl border border-stroke bg-white/80 px-4 py-3 text-sm shadow-soft outline-none focus:border-accent"
                  />
                  {showTemplateMenu ? (
                    <div className="rounded-2xl border border-stroke bg-white/90 p-3 text-xs text-ink/70">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-ink/50">
                        Templates rapidos
                      </p>
                      <div className="mt-2 space-y-2">
                        {filteredTemplates.map((template) => (
                          <button
                            key={template.id}
                            onClick={() => {
                              setSelectedChatTemplateId(template.id)
                              setMessage(template.body.replace('{nome}', selectedThread.clienteNome))
                              setShowTemplateMenu(false)
                            }}
                            className="w-full rounded-xl border border-stroke bg-white px-3 py-2 text-left text-xs text-ink hover:border-accent/50"
                          >
                            <p className="font-semibold text-ink">{template.label}</p>
                            <p className="text-[11px] text-ink/60">{template.body}</p>
                          </button>
                        ))}
                        {filteredTemplates.length === 0 ? (
                          <p className="text-[11px] text-ink/50">Nenhum template encontrado.</p>
                        ) : null}
                      </div>
                    </div>
                  ) : null}
                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      onClick={handleSendMessage}
                      className="rounded-full bg-accent px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white"
                    >
                      Enviar mensagem
                    </button>
                    <label className="rounded-full border border-stroke bg-white px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-ink/70">
                      Upload arquivo
                      <input
                        type="file"
                        className="hidden"
                        onChange={(event) => handleUpload('arquivo', event.target.files?.[0] ?? null)}
                      />
                    </label>
                    <button
                      onClick={toggleRecording}
                      className={`rounded-full border px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.2em] ${
                        isRecording
                          ? 'border-rose-300 bg-rose-500 text-white'
                          : 'border-stroke bg-white text-ink/70'
                      }`}
                      type="button"
                    >
                      {isRecording ? 'Gravando...' : 'Audio'}
                    </button>
                    <div className="relative" ref={emojiPickerRef}>
                      <button
                        onClick={() => setShowEmojiPicker((prev) => !prev)}
                        className="rounded-full border border-stroke bg-white px-3 py-2 text-[12px] font-semibold uppercase tracking-[0.2em] text-ink/70"
                        aria-label="Selecionar emoji"
                        type="button"
                      >
                        😊
                      </button>
                      {showEmojiPicker ? (
                        <div className="absolute bottom-12 left-0 z-20 w-56 rounded-2xl border border-stroke bg-white p-3 shadow-soft">
                          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-ink/50">
                            Emojis
                          </p>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {CHAT_EMOJIS.map((emoji) => (
                              <button
                                key={emoji}
                                onClick={() => {
                                  setMessage((prev) => `${prev}${emoji}`)
                                }}
                                className="flex h-8 w-8 items-center justify-center rounded-full border border-stroke bg-white text-lg"
                                type="button"
                              >
                                {emoji}
                              </button>
                            ))}
                          </div>
                        </div>
                      ) : null}
                    </div>
                    <button
                      onClick={() => setTemplateModalOpen(true)}
                      className="rounded-full border border-stroke bg-white px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-ink/70"
                      type="button"
                    >
                      Criar template
                    </button>
                    <button
                      onClick={() => setShowTemplateSelect((prev) => !prev)}
                      className={`rounded-full border px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.2em] ${
                        showTemplateSelect
                          ? 'border-accent bg-accent/10 text-accent'
                          : 'border-stroke bg-white text-ink/70'
                      }`}
                      type="button"
                    >
                      Template
                    </button>
                    <button
                      onClick={() => setShowSearchBar((prev) => !prev)}
                      className={`rounded-full border px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.2em] ${
                        showSearchBar
                          ? 'border-accent bg-accent/10 text-accent'
                          : 'border-stroke bg-white text-ink/70'
                      }`}
                      type="button"
                    >
                      Pesquisar
                    </button>
                  </div>
                {showTemplateSelect ? (
                  <select
                    value={selectedChatTemplateId}
                    onChange={(event) => {
                      const templateId = event.target.value
                      setSelectedChatTemplateId(templateId)
                      const template = chatTemplates.find((item) => item.id === templateId)
                      if (!template) return
                      setMessage(template.body.replace('{nome}', selectedThread.clienteNome))
                      setShowTemplateSelect(false)
                    }}
                    className="rounded-full border border-stroke bg-white px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-ink/70"
                  >
                    <option value="">Templates rapidos</option>
                    {chatTemplates.map((template) => (
                      <option key={template.id} value={template.id}>
                        {template.label}
                      </option>
                    ))}
                  </select>
                ) : null}
                  <p className="text-xs text-ink/50">Enter envia · Shift+Enter quebra linha.</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedThread.activeProtocol ? (
                      <button
                        onClick={() => handleCloseChat(selectedThread)}
                        className="rounded-full border border-rose-300 bg-rose-500 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-white shadow-soft hover:bg-rose-600"
                      >
                        Encerrar chat
                      </button>
                    ) : (
                      <button
                        onClick={() => handleInitiateChat(selectedThread)}
                        className="rounded-full border border-emerald-300 bg-emerald-500 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-white shadow-soft hover:bg-emerald-600"
                      >
                        Iniciar chat
                      </button>
                    )}
                  </div>
                </div>
              </>
            ) : null}
          </div>

        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
          <div className="surface-panel p-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-display text-ink">Emails recebidos</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowReceivedSearch((prev) => !prev)}
                  className={`rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] ${
                    showReceivedSearch
                      ? 'border-accent bg-accent/10 text-accent'
                      : 'border-stroke bg-white text-ink/70'
                  }`}
                >
                  Buscar
                </button>
                <span className="accent-pill">{receivedEmails.length} itens</span>
              </div>
            </div>
            {showReceivedSearch ? (
              <input
                value={receivedSearch}
                onChange={(event) => setReceivedSearch(event.target.value)}
                placeholder="Buscar por cliente ou assunto..."
                className="input-base mt-3 text-xs"
              />
            ) : null}
            <div className="mt-4 max-h-72 space-y-3 overflow-auto pr-1">
              {filteredReceivedEmails.slice(0, receivedVisibleCount).map((email) => (
                <button
                  key={email.id}
                  onClick={() => setSelectedReceivedEmailId(email.id)}
                  className={`w-full rounded-2xl border px-4 py-3 text-left text-sm transition ${
                    selectedReceivedEmailId === email.id
                      ? 'border-accent bg-accent text-white'
                      : 'border-stroke bg-white/80 text-ink'
                  }`}
                >
                  <p className="font-semibold">{email.clienteNome}</p>
                  <p className="text-xs opacity-70">{email.subject}</p>
                  <p className="mt-2 text-[11px] uppercase tracking-[0.2em] opacity-60">
                    {formatTimestamp(email.timestamp)}
                  </p>
                </button>
              ))}
            </div>
            {filteredReceivedEmails.length > 6 ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {receivedVisibleCount < filteredReceivedEmails.length ? (
                  <button
                    onClick={() =>
                      setReceivedVisibleCount((prev) =>
                        Math.min(prev + 6, filteredReceivedEmails.length)
                      )
                    }
                    className="rounded-full border border-stroke bg-white px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-ink/70"
                  >
                    Mostrar mais
                  </button>
                ) : null}
                {receivedVisibleCount > 6 ? (
                  <button
                    onClick={() => setReceivedVisibleCount(6)}
                    className="rounded-full border border-stroke bg-white px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-ink/70"
                  >
                    Mostrar menos
                  </button>
                ) : null}
              </div>
            ) : null}
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
                      {formatTimestamp(selectedReceivedEmail.timestamp)}
                    </span>
                  </div>
                  <p className="mt-4 text-xs uppercase tracking-[0.2em] text-ink/50">Assunto</p>
                  <p className="mt-1 font-semibold text-ink">{selectedReceivedEmail.subject}</p>
                  <p className="mt-4 whitespace-pre-wrap text-sm text-ink/80">
                    {selectedReceivedEmail.body}
                  </p>
                  <div className="mt-4">
                    <button
                      onClick={() => handleReplyReceivedEmail(selectedReceivedEmail)}
                      className="rounded-full bg-accent px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white"
                    >
                      Responder
                    </button>
                  </div>
                  {selectedReceivedEmail.attachments?.length ? (
                    <div className="mt-4">
                      <p className="text-xs uppercase tracking-[0.2em] text-ink/50">Anexos</p>
                      <div className="mt-2 space-y-2">
                        {selectedReceivedEmail.attachments.map((file) => (
                          <div
                            key={file.id}
                            className="flex items-center justify-between rounded-xl border border-stroke bg-white px-3 py-2 text-xs text-ink/70"
                          >
                            <div>
                              <p className="font-semibold text-ink">{file.name}</p>
                              <p className="text-[11px] text-ink/50">
                                {(file.size / 1024).toFixed(1)} KB
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => window.open(file.url, '_blank')}
                                className="rounded-full border border-stroke px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-ink/70"
                              >
                                Visualizar
                              </button>
                              <a
                                href={file.url}
                                download={file.name}
                                className="rounded-full bg-accent px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-white"
                              >
                                Baixar
                              </a>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </>
              ) : (
                <p className="text-ink/50">Selecione um email para visualizar.</p>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div className="surface-panel p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-xl font-display text-ink">Enviar email</h3>
                  <p className="text-xs text-ink/50">
                    {emailReplyContextId ? 'Modo: Responder' : 'Modo: Novo email'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {emailReplyContextId ? (
                    <button
                      onClick={() => {
                        setEmailReplyContextId(null)
                        setEmailAssistantGoal('')
                        setEmailAssistantResult('')
                      }}
                      className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-700"
                    >
                      Limpar contexto
                    </button>
                  ) : null}
                  <button
                    onClick={() => {
                      setEmailCustomerQuery('')
                      setSelectedEmailCustomerId('')
                      setEmailRecipient('')
                      setEmailSubject('')
                      setEmailBody('')
                      setEmailAttachments([])
                      setEmailReplyContextId(null)
                      setEmailAssistantGoal('')
                      setEmailAssistantResult('')
                    }}
                    className="rounded-full border border-stroke bg-white px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-ink/70"
                  >
                    Limpar dados
                  </button>
                </div>
              </div>
              {emailReplyContextId && selectedReceivedEmail ? (
                <div className="mt-3 rounded-2xl border border-amber-100 bg-amber-50/60 px-4 py-3 text-xs text-amber-700">
                  Respondendo: <span className="font-semibold">{selectedReceivedEmail.clienteNome}</span>
                  <span className="mx-1">·</span>
                  {selectedReceivedEmail.subject}
                </div>
              ) : selectedEmailCustomerId ? (
                <div className="mt-3 rounded-2xl border border-emerald-100 bg-emerald-50/60 px-4 py-3 text-xs text-emerald-700">
                  Enviando para:{' '}
                  <span className="font-semibold">
                    {emailCustomerQuery || emailRecipient || 'Cliente selecionado'}
                  </span>
                </div>
              ) : null}
              <div className="mt-4 space-y-3">
                <div>
                  <input
                    value={emailCustomerQuery}
                    onChange={(event) => {
                      setEmailCustomerQuery(event.target.value)
                      setSelectedEmailCustomerId('')
                      setEmailRecipient('')
                      setEmailReplyContextId(null)
                      setEmailAssistantGoal('')
                      setEmailAssistantResult('')
                    }}
                    placeholder="Buscar cliente por nome ou CPF..."
                    className="input-base"
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
                              setEmailReplyContextId(null)
                              setEmailAssistantGoal('')
                              setEmailAssistantResult('')
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
                  onChange={(event) => {
                    setEmailRecipient(event.target.value)
                    setEmailReplyContextId(null)
                    setEmailAssistantGoal('')
                    setEmailAssistantResult('')
                  }}
                  placeholder="Destinatario"
                  className="input-base"
                />
                <input
                  value={emailSubject}
                  onChange={(event) => setEmailSubject(event.target.value)}
                  placeholder="Assunto"
                  className="input-base"
                />
                <textarea
                  value={emailBody}
                  onChange={(event) => setEmailBody(event.target.value)}
                  rows={4}
                  placeholder="Corpo do email"
                  className="input-base"
                />
                <div className="rounded-2xl border border-stroke bg-white/80 p-3 text-xs text-ink/70">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-ink/50">
                      Anexos
                    </p>
                    <label className="rounded-full border border-stroke bg-white px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-ink/70">
                      Anexar arquivo
                      <input
                        type="file"
                        className="hidden"
                        onChange={(event) => handleEmailAttachment(event.target.files?.[0] ?? null)}
                      />
                    </label>
                  </div>
                  <div className="mt-3 space-y-2">
                    {emailAttachments.map((file) => (
                      <div
                        key={file.id}
                        className="flex items-center justify-between rounded-xl border border-stroke bg-white px-3 py-2"
                      >
                        <div>
                          <p className="font-semibold text-ink">{file.name}</p>
                          <p className="text-[11px] text-ink/50">
                            {(file.size / 1024).toFixed(1)} KB
                          </p>
                        </div>
                        <button
                          onClick={() => removeEmailAttachment(file.id)}
                          className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-rose-700"
                        >
                          Remover
                        </button>
                      </div>
                    ))}
                    {emailAttachments.length === 0 ? (
                      <p className="text-[11px] text-ink/50">Nenhum anexo.</p>
                    ) : null}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowTemplateForm((prev) => !prev)}
                    className="btn-outline rounded-full border-dashed px-3 py-1 text-xs uppercase tracking-[0.2em]"
                  >
                    Adicionar template
                  </button>
                  <button
                    onClick={() => setShowEmailTemplateSelect((prev) => !prev)}
                    className={`btn-outline rounded-full px-3 py-1 text-xs uppercase tracking-[0.2em] ${
                      showEmailTemplateSelect ? 'border-accent bg-accent/10 text-accent' : ''
                    }`}
                  >
                    Template
                  </button>
                  <button
                    onClick={() => setShowEmailTemplateManager((prev) => !prev)}
                    className={`btn-outline rounded-full px-3 py-1 text-xs uppercase tracking-[0.2em] ${
                      showEmailTemplateManager ? 'border-accent bg-accent/10 text-accent' : ''
                    }`}
                  >
                    Buscar template
                  </button>
                  <button
                    onClick={() => setEmailAssistantOpen(true)}
                    className="inline-flex items-center gap-2 rounded-full bg-ink px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-white shadow-soft"
                  >
                    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-white/10">
                      <svg
                        aria-hidden="true"
                        viewBox="0 0 24 24"
                        className="h-4 w-4 text-white"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <rect x="6" y="8" width="12" height="10" rx="3" />
                        <path d="M9 8V6a3 3 0 0 1 6 0v2" />
                        <path d="M9 13h.01M15 13h.01" />
                        <path d="M4 12H2M22 12h-2M12 4V2" />
                      </svg>
                    </span>
                    Assistente
                  </button>
                </div>
                {showEmailTemplateSelect ? (
                  <select
                    value=""
                    onChange={(event) => {
                      const templateId = event.target.value
                      const template = emailTemplates.find((item) => item.id === templateId)
                      if (!template) return
                      applyTemplate(template)
                      setShowEmailTemplateSelect(false)
                    }}
                    className="input-base text-xs font-semibold uppercase tracking-[0.2em]"
                  >
                    <option value="">Selecione um template</option>
                    {emailTemplates.map((template) => (
                      <option key={template.id} value={template.id}>
                        {template.label}
                      </option>
                    ))}
                  </select>
                ) : null}
                {showTemplateForm ? (
                  <div className="rounded-2xl border border-stroke bg-white/80 p-4 text-sm">
                    <p className="text-xs uppercase tracking-[0.2em] text-ink/50">Novo template</p>
                    <div className="mt-3 space-y-2">
                      <input
                        value={templateLabel}
                        onChange={(event) => setTemplateLabel(event.target.value)}
                        placeholder="Nome do template"
                        className="input-base bg-white/90"
                      />
                      <input
                        value={templateSubject}
                        onChange={(event) => setTemplateSubject(event.target.value)}
                        placeholder="Assunto (use {nome}, {cpf}, {email})"
                        className="input-base bg-white/90"
                      />
                      <textarea
                        value={templateBody}
                        onChange={(event) => setTemplateBody(event.target.value)}
                        rows={4}
                        placeholder="Corpo do template (use {nome}, {cpf}, {email})"
                        className="input-base bg-white/90"
                      />
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        onClick={handleAddTemplate}
                        className="btn-primary rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em]"
                      >
                        Salvar template
                      </button>
                      <button
                        onClick={() => setShowTemplateForm(false)}
                        className="btn-outline rounded-full px-3 py-1 text-xs uppercase tracking-[0.2em]"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : null}
                {showEmailTemplateManager ? (
                  <div className="rounded-2xl border border-stroke bg-white/80 p-4 text-sm">
                    <p className="text-xs uppercase tracking-[0.2em] text-ink/50">Templates salvos</p>
                    <input
                      value={emailTemplateSearch}
                      onChange={(event) => setEmailTemplateSearch(event.target.value)}
                      placeholder="Buscar template..."
                      className="mt-3 w-full rounded-xl border border-stroke bg-white px-3 py-2 text-xs text-ink/70 outline-none focus:border-accent"
                    />
                    <div className="mt-3 max-h-56 space-y-2 overflow-auto pr-1">
                      {filteredEmailTemplates.map((template) => (
                        <div
                          key={template.id}
                          className="flex items-center justify-between rounded-xl border border-stroke bg-white px-3 py-2 text-xs text-ink/70"
                        >
                          <div>
                            <p className="font-semibold text-ink">{template.label}</p>
                            <p className="text-[11px] text-ink/60">{template.subject}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => {
                                setEmailTemplatePreview(template)
                                setEmailTemplatePreviewOpen(true)
                              }}
                              className="rounded-full border border-stroke bg-white px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-ink/70"
                            >
                              Ver
                            </button>
                            <button
                              onClick={() => {
                                setEmailTemplateEditing(template)
                                setEmailTemplateEditLabel(template.label)
                                setEmailTemplateEditSubject(template.subject)
                                setEmailTemplateEditBody(template.body)
                                setEmailTemplateEditOpen(true)
                              }}
                              className="rounded-full border border-stroke bg-white px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-ink/70"
                            >
                              Editar
                            </button>
                            <button
                              onClick={() => {
                                if (!window.confirm('Excluir este template de email?')) {
                                  return
                                }
                                setEmailTemplates((prev) =>
                                  prev.filter((item) => item.id !== template.id)
                                )
                              }}
                              className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-rose-700"
                            >
                              Excluir
                            </button>
                          </div>
                        </div>
                      ))}
                      {filteredEmailTemplates.length === 0 ? (
                        <p className="text-[11px] text-ink/50">
                          Nenhum template encontrado.
                        </p>
                      ) : null}
                    </div>
                  </div>
                ) : null}
                <button
                  onClick={handleSendEmail}
                  className="btn-primary w-full rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em]"
                >
                  Enviar email
                </button>
              </div>
            </div>

            <div className="surface-panel p-6">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-display text-ink">Envios recentes</h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowSentSearch((prev) => !prev)}
                    className={`rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] ${
                      showSentSearch
                        ? 'border-accent bg-accent/10 text-accent'
                        : 'border-stroke bg-white text-ink/70'
                    }`}
                  >
                    Buscar
                  </button>
                  <span className="accent-pill">{sentEmails.length} enviados</span>
                </div>
              </div>
              {showSentSearch ? (
                <input
                  value={sentSearch}
                  onChange={(event) => setSentSearch(event.target.value)}
                  placeholder="Buscar por cliente ou assunto..."
                  className="input-base mt-3 text-xs"
                />
              ) : null}
              <div className="mt-4 max-h-72 space-y-3 overflow-auto pr-1">
                {filteredSentEmails.slice(0, sentVisibleCount).map((email) => (
                  <button
                    key={email.id}
                    onClick={() => setSelectedSentEmailId(email.id)}
                    className="w-full rounded-2xl border border-stroke bg-white/80 px-4 py-3 text-left text-sm transition hover:border-accent/50"
                  >
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-ink">{email.clienteNome}</p>
                      <StatusBadge variant="sucesso" />
                    </div>
                    <p className="text-xs text-ink/60">
                      {email.actorName ? `${email.actorName} · ` : ''}{email.subject}
                    </p>
                    <p className="text-[11px] uppercase tracking-[0.2em] text-ink/40">
                      {formatTimestamp(email.timestamp)}
                    </p>
                  </button>
                ))}
              </div>
              {filteredSentEmails.length > 6 ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {sentVisibleCount < filteredSentEmails.length ? (
                    <button
                      onClick={() =>
                        setSentVisibleCount((prev) =>
                          Math.min(prev + 6, filteredSentEmails.length)
                        )
                      }
                      className="rounded-full border border-stroke bg-white px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-ink/70"
                    >
                      Mostrar mais
                    </button>
                  ) : null}
                  {sentVisibleCount > 6 ? (
                    <button
                      onClick={() => setSentVisibleCount(6)}
                      className="rounded-full border border-stroke bg-white px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-ink/70"
                    >
                      Mostrar menos
                    </button>
                  ) : null}
                </div>
              ) : null}
            </div>

            <div className="surface-panel p-6">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-display text-ink">Falhas</h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowFailedSearch((prev) => !prev)}
                    className={`rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] ${
                      showFailedSearch
                        ? 'border-accent bg-accent/10 text-accent'
                        : 'border-stroke bg-white text-ink/70'
                    }`}
                  >
                    Buscar
                  </button>
                  <span className="accent-pill">{failedEmails.length} erros</span>
                </div>
              </div>
              {showFailedSearch ? (
                <input
                  value={failedSearch}
                  onChange={(event) => setFailedSearch(event.target.value)}
                  placeholder="Buscar por cliente ou assunto..."
                  className="input-base mt-3 text-xs"
                />
              ) : null}
              <div className="mt-4 max-h-72 space-y-3 overflow-auto pr-1 text-sm text-ink/60">
                {filteredFailedEmails.slice(0, failedVisibleCount).map((email) => (
                  <div key={email.id} className="rounded-2xl border border-rose-300 bg-rose-50 px-4 py-3">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-rose-900">{email.clienteNome}</p>
                      <StatusBadge variant="erro" />
                    </div>
                    <p className="text-xs text-rose-700/80">
                      {email.actorName ? `${email.actorName} · ` : ''}{email.subject}
                    </p>
                    <p className="mt-1 text-[11px] uppercase tracking-[0.2em] text-rose-700/70">
                      {formatTimestamp(email.timestamp)}
                    </p>
                  </div>
                ))}
              </div>
              {filteredFailedEmails.length > 6 ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {failedVisibleCount < filteredFailedEmails.length ? (
                    <button
                      onClick={() =>
                        setFailedVisibleCount((prev) =>
                          Math.min(prev + 6, filteredFailedEmails.length)
                        )
                      }
                      className="rounded-full border border-stroke bg-white px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-ink/70"
                    >
                      Mostrar mais
                    </button>
                  ) : null}
                  {failedVisibleCount > 6 ? (
                    <button
                      onClick={() => setFailedVisibleCount(6)}
                      className="rounded-full border border-stroke bg-white px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-ink/70"
                    >
                      Mostrar menos
                    </button>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}
      <Modal
        open={assistantOpen}
        title="Assistente"
        onClose={() => setAssistantOpen(false)}
        size="lg"
      >
        {selectedThread ? (
          <div className="space-y-5">
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => runAssistant('summary_short')}
                className="rounded-full bg-accent px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white"
                disabled={assistantLoading}
              >
                Resumo rapido
              </button>
              <button
                onClick={() => runAssistant('summary_long')}
                className="rounded-full border border-stroke bg-white px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-ink/70"
                disabled={assistantLoading}
              >
                Resumo detalhado
              </button>
              <button
                onClick={() => {
                  setAssistantPromptOpen(true)
                  setAssistantOpen(false)
                }}
                className="rounded-full border border-stroke bg-white px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-ink/70"
                disabled={assistantLoading}
              >
                Sugerir resposta
              </button>
            </div>

            {assistantSummary ? (
              <div className="rounded-2xl border border-stroke bg-white/80 p-4 text-sm text-ink/70">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink/50">Resumo</p>
                <p className="mt-2 whitespace-pre-wrap text-sm text-ink/80">{assistantSummary}</p>
              </div>
            ) : null}

            {assistantSuggestion ? (
              <div className="rounded-2xl border border-stroke bg-white/80 p-4 text-sm text-ink/70">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink/50">
                    Sugestao de resposta
                  </p>
                  <button
                    onClick={() => {
                      setMessage(assistantSuggestion)
                      setAssistantOpen(false)
                    }}
                    className="rounded-full bg-accent px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-white"
                  >
                    Usar rascunho
                  </button>
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm text-ink/80">{assistantSuggestion}</p>
              </div>
            ) : null}

            <div className="rounded-2xl border border-stroke bg-white/80 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink/50">
                Buscar no historico
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <input
                  value={assistantQuery}
                  onChange={(event) => setAssistantQuery(event.target.value)}
                  placeholder="Digite um termo ou pergunta"
                  className="flex-1 rounded-full border border-stroke bg-white px-4 py-2 text-sm text-ink/80 outline-none focus:border-accent"
                />
                <button
                  onClick={() => runAssistant('search')}
                  className="rounded-full bg-accent px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white"
                  disabled={assistantLoading || !assistantQuery.trim()}
                >
                  Buscar
                </button>
              </div>
              {assistantResults.length > 0 ? (
                <div className="mt-3 space-y-2 text-xs text-ink/70">
                  {assistantResults.map((item) => (
                    <div
                      key={item.message_id}
                      className="rounded-xl border border-stroke bg-white/80 px-3 py-2"
                    >
                      <p className="font-semibold text-ink">{item.content}</p>
                      <p className="text-[10px] uppercase tracking-[0.2em] text-ink/40">
                        {formatTimestamp(item.created_at)}
                      </p>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        ) : null}
      </Modal>
      <Modal
        open={assistantPromptOpen}
        title="Sugerir resposta"
        onClose={() => setAssistantPromptOpen(false)}
        size="lg"
      >
        {selectedThread ? (
          <div className="space-y-4">
            <div className="rounded-2xl border border-stroke bg-white/80 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink/50">
                    Contexto recente
                  </p>
                  <p className="text-xs text-ink/50">
                    {selectedThread.messages.length} mensagens •{' '}
                    {formatTimestamp(
                      selectedThread.messages[selectedThread.messages.length - 1]?.timestamp ?? ''
                    )}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {[
                    'Profissional',
                    'Amigável',
                    'Jurídico',
                    'Direto',
                    'Empático',
                    'Firme',
                    'Urgente',
                    'Formal',
                    'Persuasivo',
                    'Didático',
                    'Conciliador',
                    'Cobrança',
                    'Outro',
                  ].map((tone) => (
                    <button
                      key={tone}
                      onClick={() => {
                        setAssistantPromptToneChoice(tone)
                        if (tone !== 'Outro') setAssistantPromptTone(tone)
                      }}
                      className={`rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] ${
                        assistantPromptToneChoice === tone
                          ? 'border-accent bg-accent/10 text-accent'
                          : 'border-stroke bg-white text-ink/70'
                      }`}
                    >
                      {tone}
                    </button>
                  ))}
                </div>
              </div>
              {assistantPromptToneChoice === 'Outro' ? (
                <input
                  value={assistantPromptCustomTone}
                  onChange={(event) => setAssistantPromptCustomTone(event.target.value)}
                  placeholder="Digite um tom personalizado"
                  className="mt-3 w-full rounded-xl border border-stroke bg-white px-4 py-2 text-xs text-ink shadow-soft outline-none focus:border-accent"
                />
              ) : null}
              <div className="mt-4 space-y-2">
                {selectedThread.messages.slice(-3).map((item) => (
                  <div
                    key={item.id}
                    className={`rounded-xl border px-3 py-2 text-xs ${
                      item.author === 'cliente'
                        ? 'border-stroke bg-white text-ink/80'
                        : 'border-accent/40 bg-accent/10 text-ink'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.2em] text-ink/50">
                      <span>{item.author === 'cliente' ? 'Cliente' : 'Equipe'}</span>
                      <span>{formatTimestamp(item.timestamp)}</span>
                    </div>
                    <p className="mt-1 line-clamp-2">{item.body || 'Mensagem sem texto.'}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-2xl border border-stroke bg-white/80 p-4">
              <div className="max-h-[280px] space-y-3 overflow-auto pr-2">
                {assistantPromptMessages.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-stroke bg-white/70 p-4 text-sm text-ink/60">
                    Pergunte algo sobre este cliente ou gere uma resposta sugerida.
                  </div>
                ) : (
                  assistantPromptMessages.map((item, index) => (
                    <div
                      key={`${item.role}-${index}`}
                      className={`flex ${item.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm shadow-soft ${
                          item.role === 'user'
                            ? 'bg-accent text-white'
                            : 'border border-stroke bg-white text-ink'
                        }`}
                      >
                        <p className="whitespace-pre-wrap">{item.content}</p>
                        {item.role === 'assistant' && index === lastAssistantIndex ? (
                          <div className="mt-3 flex flex-wrap gap-2">
                            <button
                              onClick={() => {
                                if (navigator?.clipboard) {
                                  navigator.clipboard.writeText(item.content)
                                }
                              }}
                              className="rounded-full border border-stroke px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-ink/70"
                            >
                              Copiar
                            </button>
                            <button
                              onClick={() => {
                                setMessage(item.content)
                                setAssistantPromptOpen(false)
                              }}
                              className="rounded-full bg-accent px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-white"
                            >
                              Inserir no chat
                            </button>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
            <div className="rounded-2xl border border-stroke bg-white/80 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink/50">
                Pergunta ou comando
              </p>
              <textarea
                value={assistantPromptInput}
                onChange={(event) => setAssistantPromptInput(event.target.value)}
                placeholder="Ex: Responda com clareza e destaque o proximo passo."
                rows={3}
                className="mt-3 w-full rounded-xl border border-stroke bg-white px-4 py-3 text-sm text-ink outline-none focus:border-accent"
              />
              <div className="mt-3 flex items-center justify-between gap-3">
                <p className="text-xs text-ink/50">
                  O assistente usa o historico do chat como contexto.
                </p>
                <button
                  onClick={runAssistantPrompt}
                  disabled={assistantPromptLoading}
                  className="rounded-full bg-accent px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white disabled:opacity-60"
                >
                  {assistantPromptLoading ? 'Gerando...' : 'Enviar'}
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </Modal>
      <Modal
        open={templateModalOpen}
        title="Criar template"
        onClose={() => setTemplateModalOpen(false)}
        size="md"
      >
        <div className="space-y-4">
          <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-ink/50">
            Nome do template
            <input
              value={chatTemplateTitle}
              onChange={(event) => setChatTemplateTitle(event.target.value)}
              className="mt-2 w-full rounded-xl border border-stroke bg-white px-4 py-3 text-sm text-ink shadow-soft outline-none focus:border-accent"
              placeholder="Ex: Pedido de comprovante"
            />
          </label>
          <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-ink/50">
            Corpo da mensagem
            <textarea
              value={chatTemplateBody}
              onChange={(event) => setChatTemplateBody(event.target.value)}
              rows={4}
              className="mt-2 w-full rounded-xl border border-stroke bg-white px-4 py-3 text-sm text-ink shadow-soft outline-none focus:border-accent"
              placeholder="Use {nome} para inserir o nome do cliente"
            />
          </label>
          <button
            onClick={() => {
              const label = chatTemplateTitle.trim()
              const body = chatTemplateBody.trim()
              if (!label || !body) {
                setToast({ message: 'Preencha o nome e o corpo do template.', tone: 'error' })
                setTimeout(() => setToast(null), 2000)
                return
              }
              setChatTemplates((prev) => [
                { id: `tmpl-${Date.now()}`, label, body },
                ...prev,
              ])
              setChatTemplateTitle('')
              setChatTemplateBody('')
              setTemplateModalOpen(false)
            }}
            className="w-full rounded-full bg-accent px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white"
          >
            Salvar template
          </button>
          <div className="rounded-2xl border border-stroke bg-white/80 p-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-ink/50">
              Templates salvos
            </p>
            <div className="mt-2 space-y-2">
              {chatTemplates.map((template) => (
                <div
                  key={template.id}
                  className="flex items-center justify-between rounded-xl border border-stroke bg-white px-3 py-2 text-xs text-ink/70"
                >
                  <div>
                    <p className="font-semibold text-ink">{template.label}</p>
                    <p className="text-[11px] text-ink/60">{template.body}</p>
                  </div>
                  <button
                    onClick={() => {
                      setChatTemplates((prev) => prev.filter((item) => item.id !== template.id))
                      if (selectedChatTemplateId === template.id) {
                        setSelectedChatTemplateId('')
                      }
                    }}
                    className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-rose-700"
                  >
                    Apagar
                  </button>
                </div>
              ))}
              {chatTemplates.length === 0 ? (
                <p className="text-[11px] text-ink/50">Nenhum template salvo.</p>
              ) : null}
            </div>
          </div>
        </div>
      </Modal>
      <Modal
        open={emailAssistantOpen}
        title="Assistente de email"
        onClose={() => setEmailAssistantOpen(false)}
        size="md"
      >
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setEmailAssistantMode('improve')}
              className={`rounded-full px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] ${
                emailAssistantMode === 'improve'
                  ? 'bg-accent text-white'
                  : 'border border-stroke bg-white text-ink/70'
              }`}
            >
              Melhorar texto
            </button>
            <button
              onClick={() => setEmailAssistantMode('create')}
              className={`rounded-full px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] ${
                emailAssistantMode === 'create'
                  ? 'bg-accent text-white'
                  : 'border border-stroke bg-white text-ink/70'
              }`}
            >
              Criar email
            </button>
          </div>
          {emailAssistantMode === 'create' ? (
            <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-ink/50">
              Objetivo
              <input
                value={emailAssistantGoal}
                onChange={(event) => setEmailAssistantGoal(event.target.value)}
                placeholder="Ex: solicitar documentos pendentes"
                className="mt-2 w-full rounded-xl border border-stroke bg-white px-4 py-3 text-sm text-ink shadow-soft outline-none focus:border-accent"
              />
            </label>
          ) : (
            <div className="rounded-2xl border border-stroke bg-white/80 px-4 py-3 text-xs text-ink/60">
              Melhorar texto usa o assunto e o corpo já preenchidos no email.
            </div>
          )}
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink/50">Tom</p>
            <div className="flex flex-wrap gap-2">
              {[
                'Profissional',
                'Amigável',
                'Jurídico',
                'Direto',
                'Empático',
                'Firme',
                'Urgente',
                'Formal',
                'Persuasivo',
                'Didático',
                'Conciliador',
                'Cobrança',
                'Outro',
              ].map((tone) => (
                <button
                  key={tone}
                  onClick={() => {
                    setEmailAssistantToneChoice(tone)
                    if (tone !== 'Outro') setEmailAssistantTone(tone)
                  }}
                  className={`rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] ${
                    emailAssistantToneChoice === tone
                      ? 'border-accent bg-accent/10 text-accent'
                      : 'border-stroke bg-white text-ink/70'
                  }`}
                >
                  {tone}
                </button>
              ))}
            </div>
            {emailAssistantToneChoice === 'Outro' ? (
              <input
                value={emailAssistantCustomTone}
                onChange={(event) => setEmailAssistantCustomTone(event.target.value)}
                placeholder="Digite um tom personalizado"
                className="mt-2 w-full rounded-xl border border-stroke bg-white px-4 py-3 text-sm text-ink shadow-soft outline-none focus:border-accent"
              />
            ) : null}
          </div>
          <div className="rounded-2xl border border-stroke bg-white/80 p-3 text-xs text-ink/70">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-ink/50">
              Resultado
            </p>
            <p className="mt-2 whitespace-pre-wrap">
              {emailAssistantResult || 'Execute o assistente para gerar o texto.'}
            </p>
          </div>
          <button
            onClick={() => runEmailAssistant(emailAssistantMode)}
            disabled={emailAssistantLoading}
            className="rounded-full bg-accent px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white disabled:opacity-60"
          >
            {emailAssistantLoading ? 'Gerando...' : 'Gerar texto'}
          </button>
        </div>
      </Modal>
      <Modal
        open={emailTemplateEditOpen}
        title="Editar template"
        onClose={() => setEmailTemplateEditOpen(false)}
        size="md"
      >
        <div className="space-y-4">
          <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-ink/50">
            Nome do template
            <input
              value={emailTemplateEditLabel}
              onChange={(event) => setEmailTemplateEditLabel(event.target.value)}
              className="mt-2 w-full rounded-xl border border-stroke bg-white px-4 py-3 text-sm text-ink shadow-soft outline-none focus:border-accent"
              placeholder="Nome do template"
            />
          </label>
          <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-ink/50">
            Assunto
            <input
              value={emailTemplateEditSubject}
              onChange={(event) => setEmailTemplateEditSubject(event.target.value)}
              className="mt-2 w-full rounded-xl border border-stroke bg-white px-4 py-3 text-sm text-ink shadow-soft outline-none focus:border-accent"
              placeholder="Assunto do template"
            />
          </label>
          <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-ink/50">
            Corpo do template
            <textarea
              value={emailTemplateEditBody}
              onChange={(event) => setEmailTemplateEditBody(event.target.value)}
              rows={4}
              className="mt-2 w-full rounded-xl border border-stroke bg-white px-4 py-3 text-sm text-ink shadow-soft outline-none focus:border-accent"
              placeholder="Corpo do template"
            />
          </label>
          <button
            onClick={() => {
              if (!emailTemplateEditing) return
              const label = emailTemplateEditLabel.trim()
              const subject = emailTemplateEditSubject.trim()
              const body = emailTemplateEditBody.trim()
              if (!label || !subject || !body) {
                setToast({ message: 'Preencha nome, assunto e corpo.', tone: 'error' })
                setTimeout(() => setToast(null), 2000)
                return
              }
              setEmailTemplates((prev) =>
                prev.map((item) =>
                  item.id === emailTemplateEditing.id
                    ? { ...item, label, subject, body }
                    : item
                )
              )
              setEmailTemplateEditOpen(false)
            }}
            className="w-full rounded-full bg-accent px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white"
          >
            Salvar alterações
          </button>
        </div>
      </Modal>
      <Modal
        open={emailTemplatePreviewOpen}
        title={emailTemplatePreview?.label ?? 'Template'}
        onClose={() => setEmailTemplatePreviewOpen(false)}
        size="md"
      >
        {emailTemplatePreview ? (
          <div className="space-y-4">
            <p className="text-xs uppercase tracking-[0.2em] text-ink/50">Assunto</p>
            <p className="font-semibold text-ink">
              {emailTemplatePreview.subject
                .replace('{nome}', 'Patricia Monteiro')
                .replace('{cpf}', '741.258.963-00')
                .replace('{email}', 'patricia@exemplo.com')}
            </p>
            <p className="text-xs uppercase tracking-[0.2em] text-ink/50">Corpo</p>
            <p className="whitespace-pre-wrap text-sm text-ink/80">
              {emailTemplatePreview.body
                .replace('{nome}', 'Patricia Monteiro')
                .replace('{cpf}', '741.258.963-00')
                .replace('{email}', 'patricia@exemplo.com')}
            </p>
          </div>
        ) : null}
      </Modal>
      <Modal
        open={Boolean(profileCustomer)}
        title={profileCustomer ? `${profileCustomer.nome} · ${profileCustomer.id}` : 'Cliente'}
        onClose={() => setProfileCustomerId(null)}
        size="lg"
      >
        {profileCustomer ? (
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-stroke bg-white/90 p-4 text-sm text-slate-600">
                <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                  <span className="h-2 w-2 rounded-full bg-accent/60" />
                  CPF
                </div>
                <p className="mt-2 font-semibold text-ink">{profileCustomer.cpf}</p>
              </div>
              <div className="rounded-2xl border border-stroke bg-white/90 p-4 text-sm text-slate-600">
                <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                  <span className="h-2 w-2 rounded-full bg-accent/60" />
                  Email
                </div>
                <p className="mt-2 font-semibold text-ink">{profileCustomer.email}</p>
              </div>
              <div className="rounded-2xl border border-stroke bg-white/90 p-4 text-sm text-slate-600">
                <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                  <span className="h-2 w-2 rounded-full bg-accent/60" />
                  Telefone
                </div>
                <p className="mt-2 font-semibold text-ink">{profileCustomer.telefone}</p>
                {profileCustomer.telefoneSecundario ? (
                  <p className="text-xs text-slate-500">{profileCustomer.telefoneSecundario}</p>
                ) : null}
              </div>
              <div className="rounded-2xl border border-stroke bg-white/90 p-4 text-sm text-slate-600 md:col-span-3">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                  <span className="h-2 w-2 rounded-full bg-accent/60" />
                  Processos
                </div>
                <div className="mt-3 grid gap-2 text-xs text-slate-600 md:grid-cols-2">
                  <span className="rounded-lg bg-slate-50/80 px-3 py-2">
                    Super: {profileCustomer.processoSuper}
                  </span>
                  <span className="rounded-lg bg-slate-50/80 px-3 py-2">
                    RMC: {profileCustomer.processoRmc}
                  </span>
                </div>
              </div>
              <div className="rounded-2xl border border-stroke bg-white/90 p-4 text-sm text-slate-600">
                <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                  <span className="h-2 w-2 rounded-full bg-accent/60" />
                  Status pagamento
                </div>
                <span
                  className={`mt-2 inline-flex items-center gap-2 rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] ${getPaymentTone(
                    profileCustomer.statusPagamento
                  )}`}
                >
                  <span className={`h-2 w-2 rounded-full ${getPaymentDot(profileCustomer.statusPagamento)}`} />
                  {profileCustomer.statusPagamento}
                </span>
              </div>
              <div className="rounded-2xl border border-stroke bg-white/90 p-4 text-sm text-slate-600">
                <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                  <span className="h-2 w-2 rounded-full bg-accent/60" />
                  Status app
                </div>
                <span
                  className={`mt-2 inline-flex rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] ${
                    profileCustomer.appStatus === 'bloqueado'
                      ? 'border-rose-300 bg-rose-50 text-rose-700'
                      : profileCustomer.appStatus === 'pendente'
                      ? 'border-amber-300 bg-amber-50 text-amber-700'
                      : 'border-emerald-300 bg-emerald-50 text-emerald-700'
                  }`}
                >
                  {profileCustomer.appStatus}
                </span>
              </div>
            </div>

            <div className="surface-panel p-5">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                <span className="h-2 w-2 rounded-full bg-accent/60" />
                Andamento do processo
              </div>
              <p className="mt-3 text-sm text-slate-600">
                Etapa simulada: aguardando documentacao final para liberar acesso definitivo.
              </p>
            </div>

            <div className="surface-panel p-5">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                <span className="h-2 w-2 rounded-full bg-accent/60" />
                Financeiro
              </div>
              <div className="mt-4 grid gap-3 text-sm text-slate-600 sm:grid-cols-2">
                <div className="rounded-lg bg-slate-50/80 px-3 py-2">
                  Valor: {profileCustomer.contratoValor}
                </div>
                <div className="rounded-lg bg-slate-50/80 px-3 py-2">
                  Parcelamento: {profileCustomer.parcelas}
                </div>
                <div className="rounded-lg bg-slate-50/80 px-3 py-2">
                  Servico: {profileCustomer.servicoContratado}
                </div>
                <div className="rounded-lg bg-slate-50/80 px-3 py-2">
                  Forma de pagamento: {profileCustomer.formaPagamento}
                </div>
              </div>
              <div className="mt-4">
                <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                  <span className="h-2 w-2 rounded-full bg-accent/60" />
                  Timeline de parcelas
                </div>
                <div className="mt-3 space-y-2 text-sm text-slate-600">
                  {profileCustomer.parcelasPagas.map((parcela) => (
                    <div key={parcela.label} className="rounded-lg bg-slate-50/80 px-3 py-2">
                      {parcela.label} - {parcela.vencimento} {parcela.status}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="surface-panel p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                  <span className="h-2 w-2 rounded-full bg-accent/60" />
                  Timeline do processo
                </div>
                <span className="accent-pill">mock</span>
              </div>
              <div className="mt-4 space-y-4 text-sm text-slate-600">
                {profileCustomer.appTimeline.map((item) => (
                  <div key={item.id} className="rounded-lg border border-stroke/60 bg-white/80 p-3">
                    <p className="font-semibold text-ink">{item.title}</p>
                    <p className="text-xs text-slate-500">{item.description}</p>
                    <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">
                      {formatTimestamp(item.timestamp)}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => updateProfileStatus('liberado')}
                className="rounded-full border border-emerald-300 bg-emerald-500 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white shadow-soft hover:bg-emerald-600"
              >
                Liberar acesso
              </button>
              <button
                onClick={() => updateProfileStatus('bloqueado')}
                className="rounded-full border border-rose-300 bg-rose-500 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white shadow-soft hover:bg-rose-600"
              >
                Bloquear acesso
              </button>
              <button
                onClick={() => updateProfileStatus('pendente')}
                className="rounded-full border border-amber-300 bg-amber-400 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white shadow-soft hover:bg-amber-500"
              >
                Voltar para pendente
              </button>
            </div>
          </div>
        ) : null}
      </Modal>

      {selectedSentEmail ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 backdrop-blur-sm px-4">
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
                {selectedSentEmail.actorName ? (
                  <p className="mt-2 text-xs text-ink/60">
                    Enviado por {selectedSentEmail.actorName}
                    {selectedSentEmail.actorEmail ? ` · ${selectedSentEmail.actorEmail}` : ''}
                  </p>
                ) : null}
            <p className="mt-4 text-xs uppercase tracking-[0.2em] text-ink/50">Mensagem</p>
            <p className="mt-2 whitespace-pre-wrap text-sm text-ink/80">{selectedSentEmail.body}</p>
            {selectedSentEmail.attachments?.length ? (
              <div className="mt-4">
                <p className="text-xs uppercase tracking-[0.2em] text-ink/50">Anexos</p>
                <div className="mt-2 space-y-2">
                  {selectedSentEmail.attachments.map((file) => (
                    <div
                      key={file.id}
                      className="flex items-center justify-between rounded-xl border border-stroke bg-white px-3 py-2 text-xs text-ink/70"
                    >
                      <div>
                        <p className="font-semibold text-ink">{file.name}</p>
                        <p className="text-[11px] text-ink/50">
                          {(file.size / 1024).toFixed(1)} KB
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => window.open(file.url, '_blank')}
                          className="rounded-full border border-stroke px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-ink/70"
                        >
                          Visualizar
                        </button>
                        <a
                          href={file.url}
                          download={file.name}
                          className="rounded-full bg-accent px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-white"
                        >
                          Baixar
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
            <p className="mt-6 text-[11px] uppercase tracking-[0.2em] text-ink/40">
              {formatTimestamp(selectedSentEmail.timestamp)}
            </p>
          </div>
        </div>
      ) : null}
    </div>
  )
}
