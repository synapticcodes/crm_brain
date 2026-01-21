import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react'
import PageHeader from '../components/PageHeader'
import Modal from '../components/Modal'
import { teamMock, type CustomerMock, type CustomerTimelineItem, type LegalTicketAttachment } from '../lib/mockData'
import { upsertLegalTicket } from '../lib/legalTicketsStore'
import { getCustomers, saveCustomers } from '../lib/customersStore'
import { supabase } from '../lib/supabaseClient'
import { formatTimestamp } from '../lib/formatTimestamp'
import QRCode from 'qrcode'
import { jsPDF } from 'jspdf'
import { appendLog } from '../lib/logsStore'
import { playSound } from '../lib/soundEffects'

type ContractTemplate = {
  id: string
  produto: string
  servico: string
  metodo_pagamento: string
  parcelas_min: number
  parcelas_max: number
}

const LANE_CONFIG = [
  {
    key: 'documentacao_pendente',
    title: 'Documentacao pendente',
    tone: 'border-amber-300 bg-amber-50/70',
    badge: 'text-amber-700',
  },
  {
    key: 'documentacao_enviada',
    title: 'Documentacao enviada',
    tone: 'border-sky-300 bg-sky-50/70',
    badge: 'text-sky-700',
  },
  {
    key: 'em_dia',
    title: 'Em dia',
    tone: 'border-emerald-300 bg-emerald-50/70',
    badge: 'text-emerald-700',
  },
  {
    key: 'em_atraso',
    title: 'Em atraso',
    tone: 'border-orange-300 bg-orange-50/70',
    badge: 'text-orange-700',
  },
  {
    key: 'provas',
    title: 'Provas',
    tone: 'border-pink-400 bg-pink-50/70',
    badge: 'text-pink-700',
  },
  {
    key: 'inadimplentes',
    title: 'Inadimplentes',
    tone: 'border-rose-300 bg-rose-50/70',
    badge: 'text-rose-700',
  },
] as const

const DATE_FILTERS = [
  { value: 'all', label: 'Todo periodo' },
  { value: '7', label: 'Ultimos 7 dias' },
  { value: '30', label: 'Ultimos 30 dias' },
  { value: '90', label: 'Ultimos 90 dias' },
  { value: 'year', label: 'Anual' },
  { value: 'custom', label: 'Personalizado' },
] as const

const BANK_CREDITORS = [
  'Caixa Economica',
  'Banco do Brasil',
  'Itau Unibanco',
  'Bradesco',
  'Santander Brasil',
  'Banco Safra',
  'BTG Pactual',
  'Banco Inter',
  'Banco Original',
  'Banco Pan',
  'Banco Votorantim',
  'Banco C6',
  'Banco Neon',
  'Banco BMG',
  'Banco Daycoval',
  'Banco Sofisa',
  'Banco Topazio',
  'Banco Pine',
  'Banco Modal',
  'Banco ABC Brasil',
  'Banco Alfa',
  'Banco Arbi',
  'Banco BS2',
  'Banco BV',
  'Banco Capital',
  'Banco Credit Suisse',
  'Banco Fator',
  'Banco Fibra',
  'Banco Indusval',
  'Banco J.P. Morgan',
  'Banco Luso Brasileiro',
  'Banco Mercantil do Brasil',
  'Banco Rendimento',
  'Banco Renner',
  'Banco Crefisa',
  'Banco Cetelem',
  'Banco BOCOM BBM',
  'Banco BRB',
  'Banco do Nordeste',
  'Banco da Amazonia',
  'Banrisul',
  'Banese',
  'Banestes',
  'Banpara',
  'Banco Agibank',
  'Banco Sicoob',
  'Banco Sicredi',
  'Banco Original do Agronegocio',
  'Banco Western Union',
  'Banco Ourinvest',
  'Banco Digimais',
  'Banco Next',
  'Banco PagBank',
  'Banco Stone',
  'Banco XP',
  'Banco Nubank',
] as const

function hashString(value: string) {
  let hash = 0
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0
  }
  return hash
}

function buildCreditorBanks(customerId: string, count: number) {
  if (count <= 0) return []
  const pool = [...BANK_CREDITORS]
  const selected: string[] = []
  let seed = hashString(customerId) || 1
  for (let i = 0; i < count; i += 1) {
    if (pool.length === 0) {
      pool.push(...BANK_CREDITORS)
    }
    seed = (seed * 1103515245 + 12345) >>> 0
    const index = seed % pool.length
    selected.push(pool.splice(index, 1)[0])
  }
  return selected
}

function digitsOnly(value: string) {
  return value.replace(/\D/g, '')
}

function buildPhoneNumber(seed: number, areaCode: string) {
  const rest = String(seed % 100000000).padStart(8, '0')
  return `(${areaCode}) 9${rest.slice(0, 4)}-${rest.slice(4)}`
}

function buildWhatsappNumbers(cpf: string) {
  const baseSeed = hashString(cpf) || 1
  const areaCodeSeed = digitsOnly(cpf).slice(0, 2) || '11'
  return [0, 1].map((offset) => buildPhoneNumber(baseSeed + offset * 7919, areaCodeSeed))
}

function buildWhatsappHistory(cpf: string, phone: string) {
  const seed = hashString(`${cpf}-${phone}`) || 1
  const customerPhrases = [
    'Oi, preciso de ajuda.',
    'Consegue me atualizar?',
    'Estou com duvida sobre as parcelas.',
    'Posso enviar o comprovante aqui?',
    'Obrigado pelo retorno.',
    'Quando tiver novidade me avise.',
  ]
  const teamPhrases = [
    'Oi, claro! Como posso ajudar?',
    'Estamos verificando os dados.',
    'Pode enviar por aqui sim.',
    'Vou registrar e retorno.',
    'Assim que tivermos resposta, aviso.',
    'Vamos seguir com a renegociacao.',
  ]
  const totalMessages = 24 + (seed % 10)
  const base = new Date(2025, (seed % 12), 1 + (seed % 20), 9, 15)
  const stepMinutes = 18 + (seed % 12)
  const messages = Array.from({ length: totalMessages }, (_, index) => {
    const isCustomer = index % 2 === 0
    const timestamp = new Date(base.getTime() + index * stepMinutes * 60000)
    const formatted = timestamp.toISOString().slice(0, 16).replace('T', ' ')
    const body = isCustomer
      ? customerPhrases[index % customerPhrases.length]
      : teamPhrases[index % teamPhrases.length]
    return {
      id: `wa-${seed}-${index}`,
      author: isCustomer ? 'cliente' : 'equipe',
      body,
      timestamp: formatted,
    }
  })
  return messages
}

function buildCallHistory(cpf: string, phones: string[]) {
  const seed = hashString(cpf) || 1
  const totalCalls = 3 + (seed % 4)
  const base = new Date(2025, (seed % 12), 3 + (seed % 18), 10, 0)
  return Array.from({ length: totalCalls }, (_, index) => {
    const timestamp = new Date(base.getTime() + index * 36 * 60 * 60 * 1000)
    const formatted = timestamp.toISOString().slice(0, 16).replace('T', ' ')
    const durationSeconds = 45 + ((seed + index * 37) % 240)
    const minutes = Math.floor(durationSeconds / 60)
    const seconds = String(durationSeconds % 60).padStart(2, '0')
    return {
      id: `call-${seed}-${index}`,
      phone: phones[index % phones.length] ?? phones[0] ?? '(11) 90000-0000',
      timestamp: formatted,
      duration: `${minutes}:${seconds}`,
      status: 'gravada',
    }
  })
}

function buildTimelineItem(title: string, description: string, type: CustomerTimelineItem['type']) {
  const now = new Date()
  const timestamp = now.toISOString().slice(0, 16).replace('T', ' ')
  return {
    id: `T-${now.getTime()}`,
    title,
    description,
    timestamp,
    type,
  }
}

function parseBrazilDate(value: string) {
  const [day, month, year] = value.split('/').map((item) => Number.parseInt(item, 10))
  if (!day || !month || !year) return null
  return new Date(year, month - 1, day)
}

function computePaymentStatus(customer: CustomerMock) {
  const overdueCount = customer.parcelasPagas.filter((parcela) => {
    const dueDate = parseBrazilDate(parcela.vencimento)
    if (!dueDate) return false
    const today = new Date()
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    if (dueDate >= todayStart) return false
    return !parcela.status.toLowerCase().includes('paga')
  }).length

  if (overdueCount >= 2) return 'Inadimplente'
  if (overdueCount === 1) return 'Em atraso'
  return customer.statusPagamento
}

function applyKanbanRules(customer: CustomerMock, targetLane?: CustomerMock['kanbanLane']) {
  const statusPagamento = computePaymentStatus(customer)
  const effectiveLane = targetLane ?? customer.kanbanLane
  if (effectiveLane === 'provas') {
    return { ...customer, kanbanLane: effectiveLane, statusPagamento }
  }
  if (statusPagamento === 'Inadimplente') {
    return { ...customer, kanbanLane: 'inadimplentes', statusPagamento, appStatus: 'bloqueado' }
  }
  if (statusPagamento === 'Em atraso') {
    return { ...customer, kanbanLane: 'em_atraso', statusPagamento, appStatus: 'bloqueado' }
  }
  if (effectiveLane === 'documentacao_enviada' && statusPagamento === 'Em dia') {
    return { ...customer, kanbanLane: 'em_dia', statusPagamento }
  }
  return { ...customer, kanbanLane: effectiveLane, statusPagamento }
}

function normalizeCustomers(customers: CustomerMock[]) {
  return customers.map((customer) => applyKanbanRules(customer))
}

const timelineTone = {
  update: 'border-stroke text-ink/70',
  documento: 'border-amber-300 text-amber-700',
  comunicacao: 'border-sky-300 text-sky-700',
  contato: 'border-teal/40 text-teal',
  juridico: 'border-orange-300 text-orange-700',
  processo: 'border-stone-400 text-stone-700',
  pagamento: 'border-emerald-300 text-emerald-700',
  app: 'border-rose-300 text-rose-700',
} satisfies Record<CustomerTimelineItem['type'], string>

const timelineLabel = {
  update: 'Atualizacao',
  documento: 'Documento',
  comunicacao: 'Email',
  contato: 'Chat',
  juridico: 'Juridico',
  processo: 'Processo',
  pagamento: 'Financeiro',
  app: 'App',
} satisfies Record<CustomerTimelineItem['type'], string>

const TIMELINE_ITEM_HEIGHT = 96
const TIMELINE_OVERSCAN = 4

function TimelineVirtualList({ items }: { items: CustomerTimelineItem[] }) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [scrollTop, setScrollTop] = useState(0)
  const [containerHeight, setContainerHeight] = useState(360)

  useEffect(() => {
    if (!containerRef.current) return
    const element = containerRef.current
    function updateHeight() {
      setContainerHeight(element.clientHeight)
    }
    updateHeight()
    const observer = new ResizeObserver(() => updateHeight())
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  const totalHeight = items.length * TIMELINE_ITEM_HEIGHT
  const startIndex = Math.max(0, Math.floor(scrollTop / TIMELINE_ITEM_HEIGHT) - TIMELINE_OVERSCAN)
  const endIndex = Math.min(
    items.length,
    Math.ceil((scrollTop + containerHeight) / TIMELINE_ITEM_HEIGHT) + TIMELINE_OVERSCAN
  )
  const visibleItems = items.slice(startIndex, endIndex)

  return (
    <div
      ref={containerRef}
      onScroll={(event) => setScrollTop(event.currentTarget.scrollTop)}
      className="max-h-[360px] overflow-auto pr-2"
    >
      <div className="relative" style={{ height: totalHeight || TIMELINE_ITEM_HEIGHT }}>
        {visibleItems.map((item, index) => (
          <div
            key={item.id}
            style={{ top: (startIndex + index) * TIMELINE_ITEM_HEIGHT }}
            className="absolute left-0 right-0"
          >
            <div className="border-l-2 border-stroke pl-3">
              <span
                className={`mb-2 inline-flex rounded-full border px-2 py-1 text-[10px] uppercase tracking-[0.2em] ${timelineTone[item.type]}`}
              >
                {timelineLabel[item.type]}
              </span>
              <p className="font-semibold text-ink">{item.title}</p>
              <p className="text-xs text-ink/60">{item.description}</p>
              <p className="text-[11px] uppercase tracking-[0.2em] text-ink/40">
                {formatTimestamp(item.timestamp)}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<CustomerMock[]>(() => normalizeCustomers(getCustomers()))
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [laneFilter, setLaneFilter] = useState('all')
  const [dateFilter, setDateFilter] = useState('all')
  const [selectedYear, setSelectedYear] = useState(String(new Date().getFullYear()))
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')
  const [sellerFilter, setSellerFilter] = useState('')
  const [editing, setEditing] = useState(false)
  const [legalMessageOpen, setLegalMessageOpen] = useState(false)
  const [legalMessage, setLegalMessage] = useState('')
  const [legalAttachments, setLegalAttachments] = useState<LegalTicketAttachment[]>([])
  const [previewFile, setPreviewFile] = useState<CustomerMock['files'][number] | null>(null)
  const [timelineVisibleCount, setTimelineVisibleCount] = useState(20)
  const [rejectingFileId, setRejectingFileId] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [createError, setCreateError] = useState('')
  const [templates, setTemplates] = useState<ContractTemplate[]>([])
  const [selectedTemplateId, setSelectedTemplateId] = useState('')
  const selectedTemplate = useMemo(
    () => templates.find((item) => item.id === selectedTemplateId) ?? null,
    [templates, selectedTemplateId]
  )
  const [createForm, setCreateForm] = useState({
    nome: '',
    telefone: '',
    email: '',
    cpf: '',
    rg: '',
    telefoneSecundario: '',
    vendedor: '',
    processoSuper: '',
    processoRmc: '',
    endereco: '',
    numero: '',
    bairro: '',
    cidade: '',
    estado: '',
    cep: '',
    servicoContratado: '',
    contratoValor: '',
    parcelas: '1x',
    valorParcela: '',
    formaPagamento: 'boleto/pix/cartao',
  })

  useEffect(() => {
    const focusId = window.localStorage.getItem('brain_focus_customer_id')
    if (!focusId) return
    const exists = customers.some((customer) => customer.id === focusId)
    if (exists) {
      setSelectedId(focusId)
    }
    window.localStorage.removeItem('brain_focus_customer_id')
  }, [customers])
  const [draft, setDraft] = useState({
    email: '',
    telefone: '',
    telefoneSecundario: '',
    processoSuper: '',
    processoRmc: '',
    appStatus: 'pendente' as CustomerMock['appStatus'],
  })
  const [pixOpen, setPixOpen] = useState(false)
  const [pixService, setPixService] = useState('')
  const [pixAmount, setPixAmount] = useState('')
  const [pixSubject, setPixSubject] = useState('')
  const [pixQrCode, setPixQrCode] = useState('')
  const [pixLink, setPixLink] = useState('')
  const [pixError, setPixError] = useState('')
  const [pixLoading, setPixLoading] = useState(false)
  const [whatsappOpen, setWhatsappOpen] = useState(false)
  const [selectedWhatsappNumber, setSelectedWhatsappNumber] = useState<string | null>(null)
  const [showCalls, setShowCalls] = useState(false)
  const [callsPage, setCallsPage] = useState(1)

  useEffect(() => {
    let isMounted = true
    async function loadTemplates() {
      const { data, error } = await supabase
        .schema('brain')
        .from('contrato_templates')
        .select('id, produto, servico, metodo_pagamento, parcelas_min, parcelas_max')
        .order('produto', { ascending: true })
      if (!isMounted) return
      if (error) {
        setTemplates([])
        return
      }
      setTemplates((data ?? []) as ContractTemplate[])
    }
    loadTemplates()
    return () => {
      isMounted = false
    }
  }, [])

  useEffect(() => {
    const raw = createForm.contratoValor
    const normalized = raw
      .replace(/\s/g, '')
      .replace(/\./g, '')
      .replace(',', '.')
      .replace(/[^0-9.]/g, '')
    const total = Number.parseFloat(normalized)
    const parcelas = Number.parseInt(createForm.parcelas.replace(/\D/g, '') || '1', 10)
    if (!total || Number.isNaN(total) || parcelas <= 1) {
      setCreateForm((prev) => ({ ...prev, valorParcela: '' }))
      return
    }
    const valor = total / parcelas
    const formatted = valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
    setCreateForm((prev) => ({ ...prev, valorParcela: formatted }))
  }, [createForm.contratoValor, createForm.parcelas])

  const selectedCustomer = customers.find((customer) => customer.id === selectedId) ?? null
  const customersRef = useRef(customers)
  const pendingFiles = selectedCustomer?.files.filter((file) => file.status === 'pendente') ?? []
  const approvedFiles = selectedCustomer?.files.filter((file) => file.status === 'aprovado') ?? []
  const creditorBanks = useMemo(() => {
    if (!selectedCustomer) return []
    const count = Math.max(0, Number(selectedCustomer.numeroCredores) || 0)
    return buildCreditorBanks(selectedCustomer.id, count)
  }, [selectedCustomer?.id, selectedCustomer?.numeroCredores])
  const whatsappNumbers = useMemo(() => {
    if (!selectedCustomer) return []
    return buildWhatsappNumbers(selectedCustomer.cpf)
  }, [selectedCustomer?.cpf])
  const whatsappHistory = useMemo(() => {
    if (!selectedCustomer || !selectedWhatsappNumber) return []
    return buildWhatsappHistory(selectedCustomer.cpf, selectedWhatsappNumber)
  }, [selectedCustomer?.cpf, selectedWhatsappNumber])
  const callHistory = useMemo(() => {
    if (!selectedCustomer) return []
    return buildCallHistory(selectedCustomer.cpf, whatsappNumbers)
  }, [selectedCustomer?.cpf, whatsappNumbers])
  const callsPageSize = 10
  const totalCalls = callHistory.length
  const totalCallsPages = Math.max(1, Math.ceil(totalCalls / callsPageSize))
  const callsSliceStart = (callsPage - 1) * callsPageSize
  const pagedCalls = callHistory.slice(callsSliceStart, callsSliceStart + callsPageSize)

  useEffect(() => {
    setTimelineVisibleCount(20)
  }, [selectedCustomer?.id])

  useEffect(() => {
    setEditing(false)
    setLegalMessageOpen(false)
    setLegalMessage('')
    setPixOpen(false)
    setPixQrCode('')
    setPixLink('')
    setPixError('')
    setWhatsappOpen(false)
    setSelectedWhatsappNumber(null)
    setShowCalls(false)
    setCallsPage(1)
  }, [selectedId])

  useEffect(() => {
    if (!selectedCustomer) return
    if (!whatsappNumbers.length) {
      setSelectedWhatsappNumber(null)
      return
    }
    setSelectedWhatsappNumber((prev) =>
      prev && whatsappNumbers.includes(prev) ? prev : whatsappNumbers[0]
    )
  }, [selectedCustomer?.id, whatsappNumbers])

  useEffect(() => {
    customersRef.current = customers
  }, [customers])

  useEffect(() => {
    saveCustomers(customers)
  }, [customers])

  async function handleGeneratePix() {
    if (!selectedCustomer) return
    const service = pixService.trim()
    const amount = pixAmount.trim()
    const subject = pixSubject.trim()
    if (!service || !amount || !subject) {
      setPixError('Preencha servico, valor e assunto para gerar o PIX.')
      return
    }
    setPixError('')
    setPixLoading(true)
    const payload = [
      'PIX',
      `cliente=${selectedCustomer.nome}`,
      `cpf=${selectedCustomer.cpf}`,
      `servico=${service}`,
      `valor=${amount}`,
      `assunto=${subject}`,
    ].join('|')
    const link = `https://meunomeok.com/pix?cliente=${encodeURIComponent(
      selectedCustomer.nome
    )}&cpf=${encodeURIComponent(selectedCustomer.cpf)}&valor=${encodeURIComponent(
      amount
    )}&assunto=${encodeURIComponent(subject)}`
    try {
      const qr = await QRCode.toDataURL(payload, {
        width: 220,
        margin: 1,
        color: { dark: '#1f2937', light: '#ffffff' },
      })
      setPixQrCode(qr)
      setPixLink(link)
      const { data } = await supabase.auth.getUser()
      const actorEmail = data.user?.email ?? 'financeiro@local.test'
      const actorName =
        teamMock.find((member) => member.email === actorEmail)?.nome ?? 'Equipe Financeiro'
      appendLog({
        id: `L-${Date.now()}`,
        action: 'payment.pix_generate',
        label: 'PIX gerado',
        actorName,
        actorEmail,
        description: `PIX gerado para ${selectedCustomer.nome}`,
        stage: 'sucesso',
        clienteId: selectedCustomer.cpf,
        clienteNome: selectedCustomer.nome,
        details: { servico: service, valor: amount, assunto: subject, link },
        timestamp: new Date().toISOString().slice(0, 16).replace('T', ' '),
      })
      playSound('success')
    } catch {
      setPixError('Nao foi possivel gerar o QR Code.')
      playSound('error')
    } finally {
      setPixLoading(false)
    }
  }

  function handleDownloadPixPdf() {
    if (!pixQrCode || !pixLink || !selectedCustomer) return
    const pdf = new jsPDF({ unit: 'pt', format: 'a4' })
    pdf.setFontSize(16)
    pdf.text('Pagamento PIX', 40, 50)
    pdf.setFontSize(11)
    pdf.text(`Cliente: ${selectedCustomer.nome}`, 40, 75)
    pdf.text(`CPF: ${selectedCustomer.cpf}`, 40, 92)
    pdf.text(`Servico: ${pixService}`, 40, 109)
    pdf.text(`Valor: ${pixAmount}`, 40, 126)
    pdf.text(`Assunto: ${pixSubject}`, 40, 143)
    pdf.addImage(pixQrCode, 'PNG', 40, 170, 180, 180)
    pdf.setFontSize(10)
    pdf.text('Link de pagamento:', 40, 375)
    pdf.text(pixLink, 40, 392, { maxWidth: 500 })
    pdf.save(`pix-${selectedCustomer.nome.replace(/\s+/g, '-').toLowerCase()}.pdf`)
  }

  useEffect(() => {
    function syncCustomers() {
      const next = normalizeCustomers(getCustomers())
      if (JSON.stringify(next) === JSON.stringify(customersRef.current)) {
        return
      }
      setCustomers(next)
    }

    window.addEventListener('brain:customersUpdated', syncCustomers)
    window.addEventListener('storage', syncCustomers)
    return () => {
      window.removeEventListener('brain:customersUpdated', syncCustomers)
      window.removeEventListener('storage', syncCustomers)
    }
  }, [])

  const filteredCustomers = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    const sellerNormalized = sellerFilter.trim().toLowerCase()
    const now = Date.now()
    const rangeDays =
      dateFilter === 'all' || dateFilter === 'year' || dateFilter === 'custom'
        ? null
        : Number(dateFilter)

    return customers.filter((customer) => {
      const matchesLane = laneFilter === 'all' || customer.kanbanLane === laneFilter
      const matchesQuery =
        !normalized ||
        [customer.nome, customer.email, customer.cpf, customer.telefone]
          .filter(Boolean)
          .concat([customer.processoSuper, customer.processoRmc])
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(normalized))
      const matchesSeller =
        !sellerNormalized || customer.vendedor.toLowerCase().includes(sellerNormalized)

      const createdAt = new Date(customer.createdAt)
      const matchesDate = rangeDays
        ? now - createdAt.getTime() <= rangeDays * 24 * 60 * 60 * 1000
        : dateFilter === 'year'
        ? createdAt.getFullYear() === Number(selectedYear)
        : dateFilter === 'custom'
        ? (!customStart || createdAt >= new Date(customStart)) &&
          (!customEnd || createdAt <= new Date(customEnd))
        : true

      return matchesLane && matchesQuery && matchesSeller && matchesDate
    })
  }, [customers, query, sellerFilter, laneFilter, dateFilter])

  const sellerOptions = useMemo(() => {
    return Array.from(new Set(customers.map((customer) => customer.vendedor))).sort()
  }, [customers])

  const grouped = useMemo(() => {
    return filteredCustomers.reduce((acc, customer) => {
      if (!acc[customer.kanbanLane]) acc[customer.kanbanLane] = []
      acc[customer.kanbanLane].push(customer)
      return acc
    }, {} as Record<string, CustomerMock[]>)
  }, [filteredCustomers])

  function updateCustomer(id: string, updater: (customer: CustomerMock) => CustomerMock) {
    setCustomers((prev) =>
      prev.map((customer) =>
        customer.id === id ? applyKanbanRules(updater(customer)) : customer
      )
    )
  }

  function addTimeline(id: string, item: CustomerTimelineItem) {
    updateCustomer(id, (customer) => ({
      ...customer,
      timeline: [item, ...customer.timeline],
    }))
  }

  function resetCreateForm() {
    setCreateForm({
      nome: '',
      telefone: '',
      email: '',
      cpf: '',
      rg: '',
      telefoneSecundario: '',
      vendedor: '',
      processoSuper: '',
      processoRmc: '',
      endereco: '',
      numero: '',
      bairro: '',
      cidade: '',
      estado: '',
      cep: '',
      servicoContratado: '',
      contratoValor: '',
      parcelas: '1x',
      valorParcela: '',
      formaPagamento: 'boleto/pix/cartao',
    })
    setCreateError('')
    setSelectedTemplateId('')
  }

  function handleCreateCustomer(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!createForm.nome || !createForm.telefone || !createForm.email || !createForm.cpf) {
      setCreateError('Nome, telefone, email e CPF sao obrigatorios.')
      return
    }
    const now = new Date()
    const timestamp = now.toISOString().slice(0, 16).replace('T', ' ')
    const newCustomer: CustomerMock = {
      id: `CLI-${Math.floor(1000 + Math.random() * 9000)}`,
      nome: createForm.nome,
      cpf: createForm.cpf,
      rg: createForm.rg,
      email: createForm.email,
      telefone: createForm.telefone,
      telefoneSecundario: createForm.telefoneSecundario || undefined,
      statusPagamento: 'Aguardando',
      kanbanLane: 'documentacao_pendente',
      vendedor: createForm.vendedor || 'Nao atribuido',
      createdAt: timestamp.slice(0, 10),
      documentosPendentes: false,
      appStatus: 'pendente',
      processoRmc: createForm.processoRmc || '0000000-00.2025.8.00.0000',
      processoSuper: createForm.processoSuper || '0000000-00.2025.8.00.0000',
      endereco: createForm.endereco,
      numero: createForm.numero,
      bairro: createForm.bairro,
      cep: createForm.cep,
      cidade: createForm.cidade,
      estado: createForm.estado,
      servicoContratado: createForm.servicoContratado,
      contratoValor: createForm.contratoValor,
      formaPagamento: createForm.formaPagamento,
      parcelas: createForm.parcelas,
      parcelasPagas: [],
      idade: 0,
      genero: '',
      profissao: '',
      estadoCivil: '',
      situacao: '',
      vulnerabilidade: '',
      escolaridade: '',
      dependentes: false,
      numeroDependentes: 0,
      rendaIndividual: '',
      rendaFamiliar: '',
      despesas: {
        luz: '',
        agua: '',
        telefone: '',
        internet: '',
        aluguel: '',
        prestacaoCasa: '',
        alimentacao: '',
        planoSaude: '',
        medicamentos: '',
        impostos: '',
        transporte: '',
        outras: '',
      },
      causaDividas: '',
      numeroCredores: 0,
      comprometimentoMensal: '',
      cadastroInadimplencia: false,
      casaPropria: false,
      financiamentoVeiculo: false,
      files: [],
      timeline: [
        {
          id: `T-${now.getTime()}`,
          title: 'Cliente criado no painel',
          description: 'Cadastro criado manualmente.',
          timestamp,
          type: 'update',
        },
      ],
      appTimeline: [],
    }

    setCustomers((prev) => [newCustomer, ...prev])
    setCreateOpen(false)
    resetCreateForm()
  }

  function handleDragStart(customerId: string) {
    setDraggingId(customerId)
  }

  function handleDrop(targetLane: CustomerMock['kanbanLane']) {
    if (!draggingId) return
    const dragged = customers.find((customer) => customer.id === draggingId)
    if (!dragged) return
    if (dragged.kanbanLane === targetLane) return
    updateCustomer(draggingId, (customer) => applyKanbanRules(customer, targetLane))
    addTimeline(
      draggingId,
      buildTimelineItem(
        'Movimento manual no kanban',
        `Cliente movido para ${targetLane.replace('_', ' ')}.`,
        'documento'
      )
    )
    setDraggingId(null)
  }

  function handleSendToLegal() {
    if (!selectedCustomer) return
    const trimmed = legalMessage.trim()
    if (!trimmed && legalAttachments.length === 0) return
    upsertLegalTicket({
      clienteId: selectedCustomer.id,
      clienteNome: selectedCustomer.nome,
      message: trimmed || 'Arquivo anexado.',
      author: 'equipe',
      attachments: legalAttachments,
    })
    addTimeline(
      selectedCustomer.id,
      buildTimelineItem('Mensagem ao juridico', 'Caso encaminhado para analise.', 'juridico')
    )
    setLegalMessage('')
    setLegalAttachments([])
    setLegalMessageOpen(false)
  }

  function formatFileSize(size: number) {
    if (size < 1024) return `${size} B`
    const kb = size / 1024
    if (kb < 1024) return `${kb.toFixed(1)} KB`
    return `${(kb / 1024).toFixed(1)} MB`
  }

  async function buildLegalAttachments(files: FileList) {
    const now = new Date().toISOString().slice(0, 16).replace('T', ' ')
    const items = await Promise.all(
      Array.from(files).map(
        (file) =>
          new Promise<LegalTicketAttachment>((resolve, reject) => {
            const reader = new FileReader()
            reader.onload = () => {
              resolve({
                id: `ATT-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                name: file.name,
                type: file.type || 'application/octet-stream',
                sizeLabel: formatFileSize(file.size),
                uploadedAt: now,
                url: typeof reader.result === 'string' ? reader.result : '',
              })
            }
            reader.onerror = () => reject(reader.error)
            reader.readAsDataURL(file)
          })
      )
    )
    return items
  }

  async function handleLegalAttachments(event: ChangeEvent<HTMLInputElement>) {
    if (!event.target.files?.length) return
    try {
      const items = await buildLegalAttachments(event.target.files)
      setLegalAttachments((prev) => [...prev, ...items])
    } catch {
      // Ignore upload errors in mock flow.
    } finally {
      event.target.value = ''
    }
  }

  async function handleAttachFile(event: ChangeEvent<HTMLInputElement>) {
    if (!selectedCustomer || !event.target.files?.length) return
    const files = Array.from(event.target.files)
    const now = new Date()
    const timestamp = now.toISOString().slice(0, 16).replace('T', ' ')
    const items = await Promise.all(
      files.map(
        (file) =>
          new Promise<CustomerMock['files'][number]>((resolve, reject) => {
            const reader = new FileReader()
            reader.onload = () => {
              resolve({
                id: `F-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                name: file.name,
                type: file.type || 'application/octet-stream',
                timestamp,
                status: 'aprovado',
                source: 'equipe',
                url: typeof reader.result === 'string' ? reader.result : '',
              })
            }
            reader.onerror = () => reject(reader.error)
            reader.readAsDataURL(file)
          })
      )
    )
    updateCustomer(selectedCustomer.id, (customer) => ({
      ...customer,
      files: [...items, ...customer.files],
      documentosPendentes: customer.files.some((file) => file.status === 'pendente'),
      documentosRecusados: false,
    }))
    addTimeline(
      selectedCustomer.id,
      buildTimelineItem('Arquivo anexado', `${items.length} arquivo(s) anexado(s) pela equipe.`, 'documento')
    )
    event.target.value = ''
  }

  function handleApproveFile(fileId: string) {
    if (!selectedCustomer) return
    updateCustomer(selectedCustomer.id, (customer) => {
      const files = customer.files.map((file) =>
        file.id === fileId ? { ...file, status: 'aprovado' } : file
      )
      return applyKanbanRules(
        {
          ...customer,
          files,
          documentosPendentes: files.some((file) => file.status === 'pendente'),
          documentosRecusados: false,
        },
        'documentacao_enviada'
      )
    })
    addTimeline(
      selectedCustomer.id,
      buildTimelineItem('Documento aprovado', 'Arquivo aprovado pela equipe.', 'documento')
    )
  }

  function handleRejectFile(fileId: string) {
    if (!selectedCustomer) return
    if (!rejectReason.trim()) return
    updateCustomer(selectedCustomer.id, (customer) => {
      const files = customer.files.filter((file) => file.id !== fileId)
      return {
        ...customer,
        files,
        documentosPendentes: files.some((file) => file.status === 'pendente'),
        documentosRecusados: true,
      }
    })
    addTimeline(
      selectedCustomer.id,
      buildTimelineItem('Documento recusado', `Motivo: ${rejectReason.trim()}`, 'documento')
    )
    setRejectingFileId(null)
    setRejectReason('')
  }

  function startEditing(customer: CustomerMock) {
    setDraft({
      email: customer.email,
      telefone: customer.telefone,
      telefoneSecundario: customer.telefoneSecundario ?? '',
      processoSuper: customer.processoSuper,
      processoRmc: customer.processoRmc,
      appStatus: customer.appStatus,
    })
    setEditing(true)
  }

  function cancelEditing() {
    setEditing(false)
  }

  function saveEditing() {
    if (!selectedCustomer) return
    updateCustomer(selectedCustomer.id, (customer) => ({
      ...customer,
      email: draft.email,
      telefone: draft.telefone,
      telefoneSecundario: draft.telefoneSecundario || undefined,
      processoSuper: draft.processoSuper,
      processoRmc: draft.processoRmc,
      appStatus: draft.appStatus,
    }))
    addTimeline(
      selectedCustomer.id,
      buildTimelineItem('Dados editados', 'Contato e processos atualizados no painel.', 'update')
    )
    setEditing(false)
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Clientes"
        subtitle="Gerencie seus clientes com visão Kanban, timeline de interações, documentos e controle financeiro"
        actions={
          <>
            <button
              onClick={() => setCreateOpen(true)}
              className="btn-primary rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em]"
            >
              Novo cliente
            </button>
          </>
        }
      />

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5" data-tour="customers-stats">
        {[
          {
            label: 'Total clientes',
            value: customers.length,
            tone: 'border-slate-200 bg-slate-50/60',
          },
          {
            label: 'Docs pendentes',
            value: customers.filter((c) => c.documentosPendentes).length,
            tone: 'border-amber-300 bg-amber-50/70',
          },
          {
            label: 'Em dia',
            value: customers.filter((c) => c.kanbanLane === 'em_dia').length,
            tone: 'border-emerald-300 bg-emerald-50/70',
          },
          {
            label: 'Em atraso',
            value: customers.filter((c) => c.kanbanLane === 'em_atraso').length,
            tone: 'border-orange-300 bg-orange-50/70',
          },
          {
            label: 'Inadimplentes',
            value: customers.filter((c) => c.kanbanLane === 'inadimplentes').length,
            tone: 'border-rose-300 bg-rose-50/70',
          },
        ].map((stat) => (
          <div key={stat.label} className={`surface-panel border-t-4 p-5 ${stat.tone}`}>
            <p className="text-xs uppercase tracking-[0.2em] text-ink/40">{stat.label}</p>
            <p className="mt-4 text-3xl font-display text-ink">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3" data-tour="customers-filters">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Buscar por nome, email, CPF ou telefone"
          className="w-full rounded-full border border-stroke bg-white/80 px-5 py-3 text-sm shadow-soft outline-none focus:border-accent sm:max-w-md"
        />
        <select
          value={sellerFilter}
          onChange={(event) => setSellerFilter(event.target.value)}
          className="w-full rounded-full border border-stroke bg-white/80 px-5 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-ink/70 shadow-soft outline-none focus:border-accent sm:max-w-md"
        >
          <option value="">Vendedor responsavel</option>
          {sellerOptions.map((seller) => (
            <option key={seller} value={seller}>
              {seller}
            </option>
          ))}
        </select>
        <select
          value={laneFilter}
          onChange={(event) => setLaneFilter(event.target.value)}
          className="rounded-full border border-stroke bg-white/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-ink/70"
        >
          <option value="all">Todas as colunas</option>
          {LANE_CONFIG.map((lane) => (
            <option key={lane.key} value={lane.key}>
              {lane.title}
            </option>
          ))}
        </select>
        <select
          value={dateFilter}
          onChange={(event) => setDateFilter(event.target.value)}
          className="rounded-full border border-stroke bg-white/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-ink/70"
        >
          {DATE_FILTERS.map((filter) => (
            <option key={filter.value} value={filter.value}>
              {filter.label}
            </option>
          ))}
        </select>
        {dateFilter === 'year' ? (
          <select
            value={selectedYear}
            onChange={(event) => setSelectedYear(event.target.value)}
            className="rounded-full border border-stroke bg-white/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-ink/70"
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
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="date"
              value={customStart}
              onChange={(event) => setCustomStart(event.target.value)}
              className="rounded-full border border-stroke bg-white/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-ink/70"
            />
            <span className="text-xs uppercase tracking-[0.2em] text-ink/50">ate</span>
            <input
              type="date"
              value={customEnd}
              onChange={(event) => setCustomEnd(event.target.value)}
              className="rounded-full border border-stroke bg-white/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-ink/70"
            />
          </div>
        ) : null}
      </div>

      <div className="grid gap-3 pb-2 md:grid-cols-3 xl:grid-cols-6" data-tour="customers-kanban">
        {LANE_CONFIG.map((lane) => {
          const laneItems = grouped[lane.key] ?? []
          return (
            <div
              key={lane.key}
              className={`surface-panel flex h-[620px] min-w-0 flex-col overflow-hidden border-t-4 ${lane.tone}`}
              onDragOver={(event) => {
                event.preventDefault()
              }}
              onDrop={() => {
                handleDrop(lane.key)
              }}
            >
              <div className="flex items-center justify-between border-b border-stroke/70 bg-white/60 px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-ink">{lane.title}</p>
                  <p className="text-xs text-slate-500">{laneItems.length} clientes</p>
                </div>
              </div>
              <div className="flex flex-1 flex-col gap-3 overflow-y-auto px-4 pb-4 pt-3">
                {laneItems.map((customer) => (
                  <button
                    key={customer.id}
                    onClick={() => setSelectedId(customer.id)}
                    className={`rounded-xl border border-stroke bg-white p-4 text-left shadow-soft transition hover:shadow-card ${
                      customer.statusPagamento.toLowerCase().includes('inadimplente')
                        ? 'border-l-4 border-l-rose-400'
                        : customer.statusPagamento.toLowerCase().includes('atraso')
                        ? 'border-l-4 border-l-amber-400'
                        : customer.statusPagamento.toLowerCase().includes('em dia')
                        ? 'border-l-4 border-l-emerald-400'
                        : 'border-l-4 border-l-slate-200'
                    }`}
                    draggable
                    onDragStart={() => handleDragStart(customer.id)}
                    onDragEnd={() => setDraggingId(null)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-ink">{customer.nome}</p>
                        <p className="text-xs text-slate-500">{customer.cpf}</p>
                      </div>
                      <div className="flex flex-shrink-0 flex-col items-end gap-2">
                        {customer.files.some((file) => file.status === 'pendente') ? (
                          <span className="max-w-[90px] rounded-full border border-amber-300 bg-amber-50 px-2 py-1 text-center text-[9px] font-semibold uppercase leading-tight tracking-[0.08em] text-amber-700">
                            docs pendentes
                          </span>
                        ) : null}
                        {customer.documentosRecusados ? (
                          <span className="max-w-[90px] rounded-full border border-rose-300 bg-rose-50 px-2 py-1 text-center text-[9px] font-semibold uppercase leading-tight tracking-[0.08em] text-rose-700">
                            recusado
                          </span>
                        ) : null}
                      </div>
                    </div>
                    <div className="mt-3 space-y-1 text-xs text-slate-500">
                      <p className="truncate">✉ {customer.email}</p>
                      <p>☎ {customer.telefone}</p>
                      {customer.kanbanLane === 'provas' ? (
                        <p className="truncate">🧾 RMC: {customer.processoRmc}</p>
                      ) : (
                        <p className="truncate">🧾 Super: {customer.processoSuper}</p>
                      )}
                    </div>
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[11px]">
                      <span
                        className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] ${
                          customer.statusPagamento.toLowerCase().includes('inadimplente')
                            ? 'border-rose-300 bg-rose-50 text-rose-700'
                            : customer.statusPagamento.toLowerCase().includes('atraso')
                        ? 'border-amber-300 bg-amber-50 text-amber-700'
                        : customer.statusPagamento.toLowerCase().includes('em dia')
                        ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                        : customer.statusPagamento.toLowerCase().includes('aguardando')
                        ? 'border-amber-300 bg-amber-50 text-amber-700'
                        : 'border-slate-200 bg-slate-50 text-slate-500'
                        }`}
                      >
                        {customer.statusPagamento}
                      </span>
                      <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-600">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-200 text-[11px] font-bold text-slate-700">
                          {customer.vendedor.slice(0, 1)}
                        </span>
                        {customer.vendedor}
                      </span>
                    </div>
                  </button>
                ))}
                {laneItems.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-stroke bg-white/50 p-4 text-xs text-ink/50">
                    Sem clientes nesta etapa.
                  </div>
                ) : null}
              </div>
            </div>
          )
        })}
      </div>

      <Modal
        open={Boolean(selectedCustomer)}
        title={selectedCustomer ? `${selectedCustomer.nome} · ${selectedCustomer.id}` : 'Cliente'}
        onClose={() => setSelectedId(null)}
        size="xl"
      >
        {selectedCustomer ? (
          <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="space-y-6">
              <section className="surface-panel p-5">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                  <span className="h-2 w-2 rounded-full bg-accent/60" />
                  Contato
                </div>
                <div className="mt-4 grid gap-3 text-sm text-slate-600 sm:grid-cols-[1.4fr_0.6fr]">
                  <div className="space-y-2">
                    <p className="font-semibold text-ink">{selectedCustomer.email}</p>
                    <p>{selectedCustomer.telefone}</p>
                    {selectedCustomer.telefoneSecundario ? (
                      <p>{selectedCustomer.telefoneSecundario}</p>
                    ) : null}
                  </div>
                  <div className="rounded-lg bg-slate-50/80 px-3 py-2 text-xs uppercase tracking-[0.2em] text-slate-500">
                    <p>{selectedCustomer.cidade}</p>
                    <p>{selectedCustomer.estado}</p>
                  </div>
                </div>
              </section>
              <section className="surface-panel p-5">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                  <span className="h-2 w-2 rounded-full bg-accent/60" />
                  Identificacao
                </div>
                <div className="mt-4 grid gap-3 text-sm text-slate-600 sm:grid-cols-2">
                  <div className="rounded-lg bg-slate-50/80 px-3 py-2">
                    <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">CPF</p>
                    <p className="mt-1 font-semibold text-ink">{selectedCustomer.cpf}</p>
                  </div>
                  <div className="rounded-lg bg-slate-50/80 px-3 py-2">
                    <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">RG</p>
                    <p className="mt-1 font-semibold text-ink">{selectedCustomer.rg}</p>
                  </div>
                </div>
              </section>
              <section className="surface-panel p-5">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                  <span className="h-2 w-2 rounded-full bg-accent/60" />
                  Endereco
                </div>
                <div className="mt-4 grid gap-3 text-sm text-slate-600 sm:grid-cols-2">
                  <div className="rounded-lg bg-slate-50/80 px-3 py-2">
                    {selectedCustomer.endereco}, {selectedCustomer.numero}
                  </div>
                  <div className="rounded-lg bg-slate-50/80 px-3 py-2">{selectedCustomer.bairro}</div>
                  <div className="rounded-lg bg-slate-50/80 px-3 py-2">
                    {selectedCustomer.cidade} - {selectedCustomer.estado}
                  </div>
                  <div className="rounded-lg bg-slate-50/80 px-3 py-2">CEP {selectedCustomer.cep}</div>
                </div>
              </section>

              <section className="surface-panel p-5">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                  <span className="h-2 w-2 rounded-full bg-accent/60" />
                  Financeiro
                </div>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-lg font-semibold text-ink">{selectedCustomer.contratoValor}</p>
                    <p className="text-xs text-slate-500">{selectedCustomer.parcelas}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full border px-3 py-1 text-xs uppercase tracking-[0.2em] ${
                        selectedCustomer.statusPagamento.toLowerCase().includes('aguardando') ||
                        selectedCustomer.statusPagamento.toLowerCase().includes('atraso')
                          ? 'border-amber-300 bg-amber-50 text-amber-700'
                          : selectedCustomer.statusPagamento.toLowerCase().includes('inadimplente')
                          ? 'border-rose-300 bg-rose-50 text-rose-700'
                          : 'border-accent/30 bg-accent/10 text-accent'
                      }`}
                    >
                      {selectedCustomer.statusPagamento}
                    </span>
                    <button
                      onClick={() => {
                        setPixService(selectedCustomer.servicoContratado || '')
                        setPixAmount(selectedCustomer.contratoValor || '')
                        setPixSubject('Pagamento do contrato')
                        setPixQrCode('')
                        setPixLink('')
                        setPixError('')
                        setPixOpen(true)
                      }}
                      className="rounded-full bg-emerald-500 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-white"
                    >
                      Gerar PIX
                    </button>
                  </div>
                </div>
                <div className="mt-4 grid gap-3 text-sm text-slate-600 sm:grid-cols-2">
                  <div className="rounded-lg bg-slate-50/80 px-3 py-2">
                    Servico: {selectedCustomer.servicoContratado}
                  </div>
                  <div className="rounded-lg bg-slate-50/80 px-3 py-2">
                    Forma de pagamento: {selectedCustomer.formaPagamento}
                  </div>
                </div>
              </section>
              <section className="surface-panel p-5">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                  <span className="h-2 w-2 rounded-full bg-accent/60" />
                  Parcelas pagas
                </div>
                <div className="mt-3 space-y-2 text-sm text-slate-600">
                  {selectedCustomer.parcelasPagas.map((parcela) => (
                    <div key={parcela.label} className="rounded-lg bg-slate-50/80 px-3 py-2">
                      {parcela.label} - {parcela.vencimento} {parcela.status}
                    </div>
                  ))}
                </div>
              </section>

              <section className="surface-panel p-5">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                  <span className="h-2 w-2 rounded-full bg-accent/60" />
                  Processos
                </div>
                <div className="mt-3 grid gap-3 text-sm text-slate-600 sm:grid-cols-2">
                  <div className="rounded-lg bg-slate-50/80 px-3 py-2">
                    Processo super: {selectedCustomer.processoSuper}
                  </div>
                  <div className="rounded-lg bg-slate-50/80 px-3 py-2">
                    Processo RMC: {selectedCustomer.processoRmc}
                  </div>
                </div>
              </section>
              <section className="surface-panel p-5">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                  <span className="h-2 w-2 rounded-full bg-accent/60" />
                  Perfil
                </div>
                <div className="mt-3 grid gap-3 text-sm text-slate-600 sm:grid-cols-2">
                  <div className="rounded-lg bg-slate-50/80 px-3 py-2">Idade: {selectedCustomer.idade}</div>
                  <div className="rounded-lg bg-slate-50/80 px-3 py-2">Genero: {selectedCustomer.genero}</div>
                  <div className="rounded-lg bg-slate-50/80 px-3 py-2">Profissao: {selectedCustomer.profissao}</div>
                  <div className="rounded-lg bg-slate-50/80 px-3 py-2">Estado civil: {selectedCustomer.estadoCivil}</div>
                  <div className="rounded-lg bg-slate-50/80 px-3 py-2">Situacao: {selectedCustomer.situacao}</div>
                  <div className="rounded-lg bg-slate-50/80 px-3 py-2">Vulnerabilidade: {selectedCustomer.vulnerabilidade}</div>
                  <div className="rounded-lg bg-slate-50/80 px-3 py-2">Escolaridade: {selectedCustomer.escolaridade}</div>
                  <div className="rounded-lg bg-slate-50/80 px-3 py-2">
                    Dependentes: {selectedCustomer.dependentes ? 'Sim' : 'Nao'} ({selectedCustomer.numeroDependentes})
                  </div>
                </div>
              </section>
              <section className="surface-panel p-5">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                  <span className="h-2 w-2 rounded-full bg-accent/60" />
                  Renda e despesas
                </div>
                <div className="mt-3 grid gap-3 text-sm text-slate-600 sm:grid-cols-2">
                  <div className="rounded-lg bg-slate-50/80 px-3 py-2">Renda individual: {selectedCustomer.rendaIndividual}</div>
                  <div className="rounded-lg bg-slate-50/80 px-3 py-2">Renda familiar: {selectedCustomer.rendaFamiliar}</div>
                  <div className="rounded-lg bg-slate-50/80 px-3 py-2">Luz: {selectedCustomer.despesas.luz}</div>
                  <div className="rounded-lg bg-slate-50/80 px-3 py-2">Agua: {selectedCustomer.despesas.agua}</div>
                  <div className="rounded-lg bg-slate-50/80 px-3 py-2">Telefone: {selectedCustomer.despesas.telefone}</div>
                  <div className="rounded-lg bg-slate-50/80 px-3 py-2">Internet: {selectedCustomer.despesas.internet}</div>
                  <div className="rounded-lg bg-slate-50/80 px-3 py-2">Aluguel: {selectedCustomer.despesas.aluguel}</div>
                  <div className="rounded-lg bg-slate-50/80 px-3 py-2">Prestacao casa: {selectedCustomer.despesas.prestacaoCasa}</div>
                  <div className="rounded-lg bg-slate-50/80 px-3 py-2">Alimentacao: {selectedCustomer.despesas.alimentacao}</div>
                  <div className="rounded-lg bg-slate-50/80 px-3 py-2">Plano de saude: {selectedCustomer.despesas.planoSaude}</div>
                  <div className="rounded-lg bg-slate-50/80 px-3 py-2">Medicamentos: {selectedCustomer.despesas.medicamentos}</div>
                  <div className="rounded-lg bg-slate-50/80 px-3 py-2">Impostos: {selectedCustomer.despesas.impostos}</div>
                  <div className="rounded-lg bg-slate-50/80 px-3 py-2">Transporte: {selectedCustomer.despesas.transporte}</div>
                  <div className="rounded-lg bg-slate-50/80 px-3 py-2">Outras: {selectedCustomer.despesas.outras}</div>
                </div>
              </section>
              <section className="surface-panel p-5">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                  <span className="h-2 w-2 rounded-full bg-accent/60" />
                  Dividas
                </div>
                <div className="mt-3 grid gap-3 text-sm text-ink/70 sm:grid-cols-2">
                  <div className="rounded-xl border border-stroke bg-white/80 px-3 py-2">
                    Causa: {selectedCustomer.causaDividas}
                  </div>
                  <div className="rounded-xl border border-stroke bg-white/80 px-3 py-2">
                    Numero de credores: {selectedCustomer.numeroCredores}
                  </div>
                  <div className="rounded-xl border border-stroke bg-white/80 px-3 py-2">
                    Comprometimento mensal: {selectedCustomer.comprometimentoMensal}
                  </div>
                  <div className="rounded-xl border border-stroke bg-white/80 px-3 py-2">
                    Cadastro de inadimplencia: {selectedCustomer.cadastroInadimplencia ? 'Sim' : 'Nao'}
                  </div>
                  <div className="rounded-xl border border-stroke bg-white/80 px-3 py-2">
                    Casa propria: {selectedCustomer.casaPropria ? 'Sim' : 'Nao'}
                  </div>
                  <div className="rounded-xl border border-stroke bg-white/80 px-3 py-2">
                    Financiamento veiculo: {selectedCustomer.financiamentoVeiculo ? 'Sim' : 'Nao'}
                  </div>
                  {creditorBanks.map((bank, index) => (
                    <div key={`${selectedCustomer.id}-bank-${index}`} className="rounded-xl border border-stroke bg-white/80 px-3 py-2">
                      Banco {index + 1}: {bank}
                    </div>
                  ))}
                </div>
              </section>

              <section className="surface-panel p-5">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                  <span className="h-2 w-2 rounded-full bg-accent/60" />
                  Timeline
                </div>
                <div className="mt-4 text-sm text-ink/70">
                  <TimelineVirtualList items={selectedCustomer.timeline.slice(0, timelineVisibleCount)} />
                  <p className="mt-3 text-xs text-ink/50">
                    Mostrando {Math.min(timelineVisibleCount, selectedCustomer.timeline.length)} de{' '}
                    {selectedCustomer.timeline.length}
                  </p>
                  {selectedCustomer.timeline.length > timelineVisibleCount ? (
                    <button
                      onClick={() => setTimelineVisibleCount((prev) => prev + 20)}
                      className="mt-3 w-full rounded-full border border-stroke bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-ink/70"
                    >
                      Carregar mais
                    </button>
                  ) : null}
                </div>
              </section>
            </div>

            <div className="space-y-6">
              <section className="surface-panel p-5">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                  <span className="h-2 w-2 rounded-full bg-accent/60" />
                  Documentos
                </div>
                <div className="mt-4 space-y-3">
                  {pendingFiles.length > 0 ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-[11px] uppercase tracking-[0.2em] text-purple-700">Documentos pendentes</p>
                        <span className="rounded-full border border-purple-200 bg-purple-50 px-2 py-0.5 text-[10px] uppercase tracking-[0.2em] text-purple-700">
                          {pendingFiles.length} analisar
                        </span>
                      </div>
                      {pendingFiles.map((file) => (
                        <div
                          key={file.id}
                          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-purple-200 bg-purple-50/70 px-3 py-2 text-xs"
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-semibold text-ink">{file.name}</p>
                              <span className="rounded-full border border-purple-300 bg-purple-100 px-2 py-0.5 text-[10px] uppercase tracking-[0.2em] text-purple-700">
                                analisar
                              </span>
                            </div>
                            <p className="text-ink/50">{file.type} · {formatTimestamp(file.timestamp)}</p>
                          </div>
                          <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-amber-700">
                            Cliente
                          </span>
                          <div className="flex flex-wrap gap-2">
                            <button
                              onClick={() => setPreviewFile(file)}
                              className="rounded-full bg-accent px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-white"
                            >
                              ver
                            </button>
                            <button
                              onClick={() => handleApproveFile(file.id)}
                              className="rounded-full bg-accent px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-white"
                            >
                              aprovar
                            </button>
                            <button
                              onClick={() => {
                                setRejectingFileId(file.id)
                                setRejectReason('')
                              }}
                              className="rounded-full border border-stroke bg-white px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-ink/70"
                            >
                              recusar
                            </button>
                          </div>
                          {rejectingFileId === file.id ? (
                            <div className="w-full space-y-2 rounded-xl border border-purple-200 bg-white/80 px-3 py-2">
                              <textarea
                                value={rejectReason}
                                onChange={(event) => setRejectReason(event.target.value)}
                                rows={2}
                                placeholder="Informe o motivo da recusa"
                                className="w-full rounded-lg border border-stroke bg-white px-3 py-2 text-xs shadow-soft outline-none focus:border-accent"
                              />
                              <div className="flex flex-wrap gap-2">
                                <button
                                  onClick={() => handleRejectFile(file.id)}
                                  className="rounded-full bg-accent px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-white"
                                >
                                  confirmar recusa
                                </button>
                                <button
                                  onClick={() => {
                                    setRejectingFileId(null)
                                    setRejectReason('')
                                  }}
                                  className="rounded-full border border-stroke bg-white px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-ink/70"
                                >
                                  cancelar
                                </button>
                              </div>
                            </div>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  ) : null}
                  <div className="space-y-2">
                    <p className="text-[11px] uppercase tracking-[0.2em] text-ink/40">Documentos aprovados</p>
                    {approvedFiles.map((file) => (
                      <div key={file.id} className="flex items-center justify-between rounded-xl border border-stroke bg-white/80 px-3 py-2 text-xs">
                        <div>
                          <p className="font-semibold text-ink">{file.name}</p>
                          <p className="text-ink/50">{file.type} · {formatTimestamp(file.timestamp)}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-emerald-700">
                            {file.source === 'equipe' ? 'Equipe' : 'Cliente'}
                          </span>
                          <button
                            onClick={() => setPreviewFile(file)}
                            className="rounded-full bg-accent px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-white"
                          >
                            ver
                          </button>
                        </div>
                      </div>
                    ))}
                    {approvedFiles.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-stroke bg-white/60 px-3 py-2 text-xs text-ink/50">
                        Nenhum documento aprovado.
                      </div>
                    ) : null}
                  </div>
                  <label className="w-full rounded-xl border border-stroke bg-white px-3 py-2 text-center text-xs font-semibold uppercase tracking-[0.2em] text-ink/70">
                    Anexar arquivo
                    <input
                      type="file"
                      multiple
                      onChange={handleAttachFile}
                      className="hidden"
                    />
                  </label>
                </div>
              </section>

              <section className="surface-panel space-y-4 p-5">
                <div className="flex items-start gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                  <span className="mt-1 h-2 w-2 rounded-full bg-accent/60" />
                  <div>
                    <p>Enviar ao juridico</p>
                    <p className="mt-2 text-xs text-ink/60">
                      Envie mensagens ao setor jurídico
                    </p>
                  </div>
                </div>
                {legalMessageOpen ? (
                  <div className="space-y-3">
                    <textarea
                      value={legalMessage}
                      onChange={(event) => setLegalMessage(event.target.value)}
                      rows={3}
                      placeholder="Escreva a mensagem para o juridico..."
                      className="w-full rounded-2xl border border-stroke bg-white/80 px-4 py-3 text-sm shadow-soft outline-none focus:border-accent"
                    />
                    <div className="rounded-2xl border border-stroke bg-white/80 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <p className="text-[11px] uppercase tracking-[0.2em] text-ink/40">Arquivos anexados</p>
                        <label className="rounded-full border border-stroke bg-white px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-ink/70">
                          Anexar arquivo
                          <input
                            type="file"
                            multiple
                            accept=".pdf,.jpg,.jpeg,.png,.ogg,.mp3,.mp4,.docx,.csv,.xlsx"
                            onChange={handleLegalAttachments}
                            className="hidden"
                          />
                        </label>
                      </div>
                      <div className="mt-3 space-y-2">
                        {legalAttachments.length === 0 ? (
                          <p className="text-xs text-ink/50">Nenhum arquivo anexado.</p>
                        ) : (
                          legalAttachments.map((attachment) => (
                            <div
                              key={attachment.id}
                              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-stroke bg-white px-3 py-2 text-xs"
                            >
                              <div>
                                <p className="font-semibold text-ink">{attachment.name}</p>
                                <p className="text-ink/50">
                                  {attachment.sizeLabel} · {attachment.uploadedAt}
                                </p>
                              </div>
                              <a
                                href={attachment.url}
                                download={attachment.name}
                                className="rounded-full border border-stroke px-2 py-1 uppercase tracking-[0.2em] text-ink/50"
                              >
                                baixar
                              </a>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={handleSendToLegal}
                        className="rounded-full bg-accent px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white"
                      >
                        Enviar
                      </button>
                      <button
                        onClick={() => {
                          setLegalMessageOpen(false)
                          setLegalMessage('')
                          setLegalAttachments([])
                        }}
                        className="rounded-full border border-stroke bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-ink/70"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setLegalMessageOpen(true)}
                    className="rounded-xl bg-accent px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white"
                  >
                    Enviar mensagem
                  </button>
                )}
              </section>


              <section className="surface-panel p-5">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                  <span className="h-2 w-2 rounded-full bg-accent/60" />
                  Ajustes rapidos
                </div>
                {!editing ? (
                  <div className="mt-3 space-y-3 text-xs text-ink/60">
                    <p>Editar telefone, email e processos.</p>
                    <p>Status do app: {selectedCustomer.appStatus}.</p>
                    <button
                      onClick={() => startEditing(selectedCustomer)}
                      className="rounded-full bg-accent px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white"
                    >
                      Editar dados
                    </button>
                  </div>
                ) : (
                  <div className="mt-4 space-y-3 text-xs text-ink/60">
                    <input
                      value={draft.email}
                      onChange={(event) => setDraft((prev) => ({ ...prev, email: event.target.value }))}
                      className="w-full rounded-xl border border-stroke bg-white/80 px-3 py-2 text-sm shadow-soft outline-none focus:border-accent"
                      placeholder="Email"
                    />
                    <input
                      value={draft.telefone}
                      onChange={(event) => setDraft((prev) => ({ ...prev, telefone: event.target.value }))}
                      className="w-full rounded-xl border border-stroke bg-white/80 px-3 py-2 text-sm shadow-soft outline-none focus:border-accent"
                      placeholder="Telefone"
                    />
                    <input
                      value={draft.telefoneSecundario}
                      onChange={(event) => setDraft((prev) => ({ ...prev, telefoneSecundario: event.target.value }))}
                      className="w-full rounded-xl border border-stroke bg-white/80 px-3 py-2 text-sm shadow-soft outline-none focus:border-accent"
                      placeholder="Telefone secundario"
                    />
                    <input
                      value={draft.processoSuper}
                      onChange={(event) => setDraft((prev) => ({ ...prev, processoSuper: event.target.value }))}
                      className="w-full rounded-xl border border-stroke bg-white/80 px-3 py-2 text-sm shadow-soft outline-none focus:border-accent"
                      placeholder="Processo super-endividamento"
                    />
                    <input
                      value={draft.processoRmc}
                      onChange={(event) => setDraft((prev) => ({ ...prev, processoRmc: event.target.value }))}
                      className="w-full rounded-xl border border-stroke bg-white/80 px-3 py-2 text-sm shadow-soft outline-none focus:border-accent"
                      placeholder="Processo RMC"
                    />
                    <select
                      value={draft.appStatus}
                      onChange={(event) =>
                        setDraft((prev) => ({ ...prev, appStatus: event.target.value as CustomerMock['appStatus'] }))
                      }
                      className="w-full rounded-xl border border-stroke bg-white/80 px-3 py-2 text-sm shadow-soft outline-none focus:border-accent"
                    >
                      <option value="pendente">Acesso pendente</option>
                      <option value="liberado">Acesso liberado</option>
                      <option value="bloqueado">Acesso bloqueado</option>
                    </select>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={saveEditing}
                        className="rounded-full bg-accent px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white"
                      >
                        Salvar
                      </button>
                      <button
                        onClick={cancelEditing}
                        className="rounded-full border border-stroke bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-ink/70"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}
              </section>
              <section className="surface-panel p-5">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                  <span className="h-2 w-2 rounded-full bg-accent/60" />
                  Historico
                </div>
                <div className="mt-3 space-y-3 text-xs text-ink/60">
                  <p>Consolide conversas e ligacoes do cliente.</p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setWhatsappOpen(true)}
                      className="rounded-full bg-emerald-500 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white"
                    >
                      WhatsApp
                    </button>
                    <button
                      onClick={() => setShowCalls((prev) => !prev)}
                      className="rounded-full border border-stroke bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-ink/70"
                    >
                      Ligacoes
                    </button>
                  </div>
                  {showCalls ? (
                    <div className="mt-3 space-y-2">
                      {pagedCalls.map((call, index) => (
                        <div
                          key={call.id}
                          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-stroke bg-white/80 px-3 py-2 text-xs text-ink/70"
                        >
                          <div>
                            <p className="font-semibold text-ink">
                              Ligacao {callsSliceStart + index + 1}
                            </p>
                            <p className="text-ink/50">
                              {call.phone} · {formatTimestamp(call.timestamp)}
                            </p>
                          </div>
                          <span className="rounded-full border border-stroke px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-ink/60">
                            {call.duration} · {call.status}
                          </span>
                        </div>
                      ))}
                      {callHistory.length === 0 ? (
                        <p className="text-xs text-ink/50">Nenhuma ligacao registrada.</p>
                      ) : null}
                      {callHistory.length > 0 ? (
                        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 text-[10px] uppercase tracking-[0.2em] text-ink/50">
                          <span>
                            Pagina {callsPage} de {totalCallsPages} · {totalCalls} ligacoes
                          </span>
                          <div className="flex gap-2">
                            <button
                              onClick={() => setCallsPage((prev) => Math.max(1, prev - 1))}
                              disabled={callsPage === 1}
                              className="rounded-full border border-stroke bg-white px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-ink/70 disabled:opacity-50"
                            >
                              Anterior
                            </button>
                            <button
                              onClick={() =>
                                setCallsPage((prev) => Math.min(totalCallsPages, prev + 1))
                              }
                              disabled={callsPage === totalCallsPages}
                              className="rounded-full border border-stroke bg-white px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-ink/70 disabled:opacity-50"
                            >
                              Proxima
                            </button>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </section>
            </div>
          </div>
        ) : null}
      </Modal>
      <Modal
        open={pixOpen}
        title="Gerar PIX"
        onClose={() => setPixOpen(false)}
        size="md"
      >
        {selectedCustomer ? (
          <div className="space-y-4">
            <div className="rounded-2xl border border-stroke bg-white/80 p-4 text-sm text-ink/70">
              <p className="text-xs uppercase tracking-[0.2em] text-ink/50">Cliente</p>
              <p className="mt-2 font-semibold text-ink">{selectedCustomer.nome}</p>
              <p className="text-xs text-ink/50">{selectedCustomer.cpf}</p>
            </div>
            <div className="grid gap-3 text-sm">
              <label className="text-xs uppercase tracking-[0.2em] text-ink/50">
                Servico
                <input
                  value={pixService}
                  onChange={(event) => setPixService(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-stroke bg-white px-4 py-3 text-sm text-ink shadow-soft outline-none focus:border-accent"
                  placeholder="Servico"
                />
              </label>
              <label className="text-xs uppercase tracking-[0.2em] text-ink/50">
                Valor
                <input
                  value={pixAmount}
                  onChange={(event) => setPixAmount(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-stroke bg-white px-4 py-3 text-sm text-ink shadow-soft outline-none focus:border-accent"
                  placeholder="R$ 0,00"
                />
              </label>
              <label className="text-xs uppercase tracking-[0.2em] text-ink/50">
                Assunto
                <input
                  value={pixSubject}
                  onChange={(event) => setPixSubject(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-stroke bg-white px-4 py-3 text-sm text-ink shadow-soft outline-none focus:border-accent"
                  placeholder="Assunto"
                />
              </label>
            </div>
            {pixError ? (
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-xs text-rose-700">
                {pixError}
              </div>
            ) : null}
            <button
              onClick={handleGeneratePix}
              className="w-full rounded-full bg-emerald-500 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white disabled:opacity-60"
              disabled={pixLoading}
            >
              {pixLoading ? 'Gerando...' : 'Gerar PIX'}
            </button>
            {pixQrCode ? (
              <div className="rounded-2xl border border-stroke bg-white/80 p-4">
                <div className="flex flex-col items-center gap-3">
                  <img src={pixQrCode} alt="QR Code PIX" className="h-44 w-44" />
                  <div className="w-full rounded-xl border border-stroke bg-white px-3 py-2 text-xs text-ink/70">
                    {pixLink}
                  </div>
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    <button
                      onClick={() => {
                        if (navigator?.clipboard) {
                          navigator.clipboard.writeText(pixLink)
                        }
                      }}
                      className="rounded-full border border-stroke bg-white px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-ink/70"
                    >
                      Copiar
                    </button>
                    <button
                      onClick={handleDownloadPixPdf}
                      className="rounded-full bg-accent px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-white"
                    >
                      Baixar PDF
                    </button>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
      </Modal>

      <Modal
        open={whatsappOpen}
        title="Historico WhatsApp"
        onClose={() => setWhatsappOpen(false)}
        size="lg"
      >
        {selectedCustomer ? (
          <div className="space-y-4">
            <div className="rounded-2xl border border-stroke bg-white/80 p-4 text-sm text-ink/70">
              <p className="text-xs uppercase tracking-[0.2em] text-ink/50">Cliente</p>
              <p className="mt-2 font-semibold text-ink">{selectedCustomer.nome}</p>
              <p className="text-xs text-ink/50">{selectedCustomer.cpf}</p>
            </div>
            <div className="grid gap-4 md:grid-cols-[0.9fr_1.6fr]">
              <div className="rounded-2xl border border-stroke bg-white/90 p-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-ink/50">
                  Numeros do WhatsApp
                </p>
                <div className="mt-3 space-y-2 text-xs">
                  {whatsappNumbers.map((phone) => (
                    <button
                      key={phone}
                      onClick={() => setSelectedWhatsappNumber(phone)}
                      className={`w-full rounded-xl border px-3 py-2 text-left ${
                        phone === selectedWhatsappNumber
                          ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                          : 'border-stroke bg-white text-ink/70'
                      }`}
                    >
                      {phone}
                    </button>
                  ))}
                  {whatsappNumbers.length === 0 ? (
                    <p className="text-xs text-ink/50">Nenhum numero encontrado.</p>
                  ) : null}
                </div>
              </div>
              <div className="rounded-2xl border border-stroke bg-white/90 p-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-ink/50">
                  Historico completo
                </p>
                <div className="mt-3 max-h-96 space-y-2 overflow-auto pr-1 text-xs">
                  {whatsappHistory.map((message) => (
                    <div
                      key={message.id}
                      className={`rounded-xl border px-3 py-2 ${
                        message.author === 'cliente'
                          ? 'border-stroke bg-white text-ink/70'
                          : 'border-emerald-200 bg-emerald-50 text-emerald-700'
                      }`}
                    >
                      <p className="font-semibold uppercase tracking-[0.2em] text-[10px]">
                        {message.author === 'cliente' ? 'Cliente' : 'Equipe'}
                      </p>
                      <p className="mt-1">{message.body}</p>
                      <p className="mt-2 text-[10px] uppercase tracking-[0.2em] text-ink/40">
                        {formatTimestamp(message.timestamp)}
                      </p>
                    </div>
                  ))}
                  {whatsappHistory.length === 0 ? (
                    <p className="text-xs text-ink/50">Selecione um numero para ver o historico.</p>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </Modal>

      <Modal open={createOpen} title="Novo cliente" onClose={() => setCreateOpen(false)} size="md">
        <form className="space-y-6" onSubmit={handleCreateCustomer}>
          <div className="rounded-2xl border border-stroke bg-slate-50/80 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Cadastro rapido</p>
            <p className="mt-2 text-sm text-ink/70">
              Preencha os dados essenciais e finalize o cadastro do cliente.
            </p>
          </div>

          <section className="space-y-4 rounded-2xl border border-stroke bg-white/90 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Dados pessoais</p>
            <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-ink/50">
              Nome completo *
              <input
                value={createForm.nome}
                onChange={(event) => setCreateForm((prev) => ({ ...prev, nome: event.target.value }))}
                className="input-base mt-2 py-3"
                placeholder="Nome do cliente"
                required
              />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-ink/50">
                CPF *
                <input
                  value={createForm.cpf}
                  onChange={(event) => setCreateForm((prev) => ({ ...prev, cpf: event.target.value }))}
                  className="input-base mt-2 py-3"
                  placeholder="000.000.000-00"
                  required
                />
              </label>
              <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-ink/50">
                RG (opcional)
                <input
                  value={createForm.rg}
                  onChange={(event) => setCreateForm((prev) => ({ ...prev, rg: event.target.value }))}
                  className="input-base mt-2 py-3"
                  placeholder="00.000.000-0"
                />
              </label>
            </div>
          </section>

          <section className="space-y-4 rounded-2xl border border-stroke bg-white/90 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Contato</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-ink/50">
                Telefone *
                <input
                  value={createForm.telefone}
                  onChange={(event) => setCreateForm((prev) => ({ ...prev, telefone: event.target.value }))}
                  className="input-base mt-2 py-3"
                  placeholder="(00) 00000-0000"
                  required
                />
              </label>
              <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-ink/50">
                Telefone secundario (opcional)
                <input
                  value={createForm.telefoneSecundario}
                  onChange={(event) =>
                    setCreateForm((prev) => ({ ...prev, telefoneSecundario: event.target.value }))
                  }
                  className="input-base mt-2 py-3"
                />
              </label>
            </div>
            <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-ink/50">
              Email *
              <input
                value={createForm.email}
                onChange={(event) => setCreateForm((prev) => ({ ...prev, email: event.target.value }))}
                className="input-base mt-2 py-3"
                placeholder="email@cliente.com"
                required
              />
            </label>
          </section>

          <section className="space-y-4 rounded-2xl border border-stroke bg-white/90 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Endereco</p>
            <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-ink/50">
              Endereco (opcional)
              <input
                value={createForm.endereco}
                onChange={(event) => setCreateForm((prev) => ({ ...prev, endereco: event.target.value }))}
                className="input-base mt-2 py-3"
                placeholder="Rua, avenida, etc."
              />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-ink/50">
                Numero (opcional)
                <input
                  value={createForm.numero}
                  onChange={(event) => setCreateForm((prev) => ({ ...prev, numero: event.target.value }))}
                  className="input-base mt-2 py-3"
                />
              </label>
              <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-ink/50">
                Bairro (opcional)
                <input
                  value={createForm.bairro}
                  onChange={(event) => setCreateForm((prev) => ({ ...prev, bairro: event.target.value }))}
                  className="input-base mt-2 py-3"
                />
              </label>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-ink/50">
                Cidade (opcional)
                <input
                  value={createForm.cidade}
                  onChange={(event) => setCreateForm((prev) => ({ ...prev, cidade: event.target.value }))}
                  className="input-base mt-2 py-3"
                />
              </label>
              <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-ink/50">
                Estado (opcional)
                <input
                  value={createForm.estado}
                  onChange={(event) => setCreateForm((prev) => ({ ...prev, estado: event.target.value }))}
                  className="input-base mt-2 py-3"
                />
              </label>
              <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-ink/50">
                CEP (opcional)
                <input
                  value={createForm.cep}
                  onChange={(event) => setCreateForm((prev) => ({ ...prev, cep: event.target.value }))}
                  className="input-base mt-2 py-3"
                />
              </label>
            </div>
          </section>

          <section className="space-y-4 rounded-2xl border border-stroke bg-white/90 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Processos</p>
            <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-ink/50">
              Processo super-endividamento (opcional)
              <input
                value={createForm.processoSuper}
                onChange={(event) => setCreateForm((prev) => ({ ...prev, processoSuper: event.target.value }))}
                className="input-base mt-2 py-3"
                placeholder="0879645-70.2025.8.20.5001"
              />
            </label>
            <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-ink/50">
              Processo RMC (opcional)
              <input
                value={createForm.processoRmc}
                onChange={(event) => setCreateForm((prev) => ({ ...prev, processoRmc: event.target.value }))}
                className="input-base mt-2 py-3"
                placeholder="0879645-70.2025.8.20.5001"
              />
            </label>
          </section>

          <section className="space-y-4 rounded-2xl border border-stroke bg-white/90 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Contrato</p>
            <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-ink/50">
              Template de servico
              <select
                value={selectedTemplateId}
                onChange={(event) => {
                  const nextId = event.target.value
                  setSelectedTemplateId(nextId)
                  const template = templates.find((item) => item.id === nextId)
                  if (!template) return
                  setCreateForm((prev) => ({
                    ...prev,
                    servicoContratado: template.produto,
                    formaPagamento: template.metodo_pagamento,
                    parcelas: `${template.parcelas_max}x`,
                  }))
                }}
                className="input-base mt-2 py-3"
              >
                <option value="">Selecione um template</option>
                {templates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.produto}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-ink/50">
              Servico contratado (opcional)
              <input
                value={createForm.servicoContratado}
                onChange={(event) => setCreateForm((prev) => ({ ...prev, servicoContratado: event.target.value }))}
                className="input-base mt-2 py-3"
              />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-ink/50">
                Valor do contrato (opcional)
                <input
                  value={createForm.contratoValor}
                  onChange={(event) => setCreateForm((prev) => ({ ...prev, contratoValor: event.target.value }))}
                  className="input-base mt-2 py-3"
                  placeholder="R$ 0,00"
                />
              </label>
              <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-ink/50">
                Parcelamento
                <select
                  value={createForm.parcelas}
                  onChange={(event) => setCreateForm((prev) => ({ ...prev, parcelas: event.target.value }))}
                  className="input-base mt-2 py-3"
                >
                  {Array.from({ length: selectedTemplate?.parcelas_max ?? 36 }, (_, index) => {
                    const value = `${index + 1}x`
                    return (
                      <option key={value} value={value}>
                        {value}
                      </option>
                    )
                  })}
                </select>
              </label>
            </div>
            {Number.parseInt(createForm.parcelas.replace(/\D/g, '') || '1', 10) > 1 ? (
              <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-ink/50">
                Valor da parcela
                <input
                  value={createForm.valorParcela}
                  readOnly
                  className="input-base mt-2 py-3 bg-slate-50/80"
                  placeholder="R$ 0,00"
                />
              </label>
            ) : null}
            <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-ink/50">
              Forma de pagamento
              <select
                value={createForm.formaPagamento}
                onChange={(event) => setCreateForm((prev) => ({ ...prev, formaPagamento: event.target.value }))}
                className="input-base mt-2 py-3"
              >
                <option value="boleto/pix/cartao">Boleto, Pix e Cartao</option>
                <option value="boleto">Boleto</option>
                <option value="pix">Pix</option>
                <option value="cartao">Cartao</option>
              </select>
            </label>
          </section>

          <section className="space-y-4 rounded-2xl border border-stroke bg-white/90 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Responsavel</p>
            <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-ink/50">
              Vendedor (opcional)
              <input
                value={createForm.vendedor}
                onChange={(event) => setCreateForm((prev) => ({ ...prev, vendedor: event.target.value }))}
                className="input-base mt-2 py-3"
                placeholder="Nome do vendedor"
              />
            </label>
          </section>

          {createError ? (
            <div className="rounded-xl border border-accent/30 bg-accent/10 px-4 py-3 text-sm text-accent">
              {createError}
            </div>
          ) : null}

          <div className="sticky bottom-0 border-t border-stroke bg-white/90 pt-4 backdrop-blur">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs text-slate-500">Campos com * sao obrigatorios.</p>
              <div className="flex flex-wrap gap-2">
                <button type="submit" className="btn-primary rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em]">
                  Criar cliente
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCreateOpen(false)
                    resetCreateForm()
                  }}
                  className="btn-outline rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em]"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </form>
      </Modal>

      <Modal
        open={Boolean(previewFile)}
        title={previewFile?.name ?? 'Arquivo'}
        onClose={() => setPreviewFile(null)}
        size="lg"
      >
        {previewFile ? (
          <div className="space-y-4">
            <div className="rounded-2xl border border-dashed border-stroke bg-white/80 p-6 text-sm text-ink/60">
              Visualizacao rapida mock para {previewFile.name}.
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
              <div>
                <p className="font-semibold text-ink">{previewFile.name}</p>
                <p className="text-xs text-ink/50">
                  {previewFile.type} · {formatTimestamp(previewFile.timestamp)}
                </p>
              </div>
              <a
                href={previewFile.url ?? 'data:text/plain;charset=utf-8,Arquivo%20mock%20para%20download'}
                download={previewFile.name}
                className="btn-primary rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] !text-white"
              >
                Baixar arquivo
              </a>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  )
}
