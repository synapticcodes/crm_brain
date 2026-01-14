export type KanbanLane =
  | 'documentacao_pendente'
  | 'documentacao_enviada'
  | 'em_dia'
  | 'provas'
  | 'inadimplentes'

export type AppAccessStatus = 'pendente' | 'liberado' | 'bloqueado'

export interface CustomerTimelineItem {
  id: string
  title: string
  description: string
  timestamp: string
  type:
    | 'update'
    | 'documento'
    | 'comunicacao'
    | 'contato'
    | 'juridico'
    | 'processo'
    | 'pagamento'
    | 'app'
}

export interface CustomerFile {
  id: string
  name: string
  type: string
  timestamp: string
  status: 'pendente' | 'aprovado'
  source: 'cliente' | 'equipe'
}

export interface CustomerMock {
  id: string
  nome: string
  cpf: string
  rg: string
  email: string
  telefone: string
  telefoneSecundario?: string
  statusPagamento: string
  kanbanLane: KanbanLane
  vendedor: string
  createdAt: string
  documentosPendentes: boolean
  documentosRecusados?: boolean
  appStatus: AppAccessStatus
  processoRmc: string
  processoSuper: string
  endereco: string
  numero: string
  bairro: string
  cep: string
  cidade: string
  estado: string
  servicoContratado: string
  contratoValor: string
  formaPagamento: string
  parcelas: string
  parcelasPagas: { label: string; vencimento: string; status: string }[]
  idade: number
  genero: string
  profissao: string
  estadoCivil: string
  situacao: string
  vulnerabilidade: string
  escolaridade: string
  dependentes: boolean
  numeroDependentes: number
  rendaIndividual: string
  rendaFamiliar: string
  despesas: {
    luz: string
    agua: string
    telefone: string
    internet: string
    aluguel: string
    prestacaoCasa: string
    alimentacao: string
    planoSaude: string
    medicamentos: string
    impostos: string
    transporte: string
    outras: string
  }
  causaDividas: string
  numeroCredores: number
  comprometimentoMensal: string
  cadastroInadimplencia: boolean
  casaPropria: boolean
  financiamentoVeiculo: boolean
  files: CustomerFile[]
  timeline: CustomerTimelineItem[]
  appTimeline: { id: string; title: string; description: string; timestamp: string }[]
}

export interface LegalTicketMock {
  id: string
  clienteId: string
  clienteNome: string
  status: 'pendente' | 'respondido'
  lastUpdate: string
  messages: {
    id: string
    author: 'equipe' | 'juridico'
    body: string
    timestamp: string
  }[]
}

export interface ChatThreadMock {
  id: string
  clienteId: string
  uidid: string
  clienteNome: string
  cpf: string
  telefone: string
  email: string
  protocolo: string
  statusPagamento: string
  lastInteraction: string
  clienteOnline: boolean
  atendenteNome: string
  atendenteOnline: boolean
  activeProtocol: boolean
  messages: {
    id: string
    author: 'cliente' | 'equipe'
    body: string
    timestamp: string
    type: 'texto' | 'imagem' | 'arquivo' | 'audio'
    delivered?: boolean
    read?: boolean
    fileName?: string
    fileUrl?: string
  }[]
}

export interface EmailMock {
  id: string
  clienteNome: string
  email: string
  subject: string
  body: string
  status: 'enviado' | 'recebido' | 'erro'
  timestamp: string
}

export interface LogMock {
  id: string
  action: string
  actor: string
  description: string
  timestamp: string
}

export interface TeamMemberMock {
  id: string
  nome: string
  email: string
  telefone: string
  avatarUrl: string
  role: 'admin' | 'administrativo'
  status: 'online' | 'offline' | 'pendente' | 'demitido'
  lastActivity: string
  ipAddress: string
}

export const customersMock: CustomerMock[] = [
  {
    id: 'CLI-1042',
    nome: 'Luciana Prado',
    cpf: '123.456.789-00',
    rg: '32.456.789-0',
    email: 'luciana@exemplo.com',
    telefone: '(11) 98888-1111',
    telefoneSecundario: '(11) 97777-2222',
    statusPagamento: 'Em dia',
    kanbanLane: 'documentacao_pendente',
    vendedor: 'Bruno Lima',
    createdAt: '2025-01-12',
    documentosPendentes: true,
    appStatus: 'pendente',
    processoRmc: '0879645-70.2025.8.20.5001',
    processoSuper: '0328741-55.2024.8.26.0100',
    endereco: 'Rua das Acacias',
    numero: '120',
    bairro: 'Jardins',
    cep: '01400-000',
    cidade: 'Sao Paulo',
    estado: 'SP',
    servicoContratado: 'Revisao de contrato e defesa juridica',
    contratoValor: 'R$ 18.900',
    formaPagamento: 'Boleto',
    parcelas: '18x',
    parcelasPagas: [
      { label: 'Parcela 01', vencimento: '10/12/2025', status: 'PAGA' },
      { label: 'Parcela 02', vencimento: '10/01/2026', status: 'PAGA' },
      { label: 'Parcela 03', vencimento: '10/02/2026', status: 'PENDENTE' },
    ],
    idade: 42,
    genero: 'Feminino',
    profissao: 'Autonoma',
    estadoCivil: 'Casada',
    situacao: 'CLT',
    vulnerabilidade: 'Doenca cronica',
    escolaridade: 'Superior completo',
    dependentes: true,
    numeroDependentes: 2,
    rendaIndividual: 'R$ 4.500',
    rendaFamiliar: 'R$ 7.800',
    despesas: {
      luz: 'R$ 180',
      agua: 'R$ 120',
      telefone: 'R$ 90',
      internet: 'R$ 120',
      aluguel: 'R$ 1.600',
      prestacaoCasa: 'R$ 0',
      alimentacao: 'R$ 1.200',
      planoSaude: 'R$ 450',
      medicamentos: 'R$ 320',
      impostos: 'R$ 260',
      transporte: 'R$ 380',
      outras: 'R$ 200',
    },
    causaDividas: 'Emprestimos consignados',
    numeroCredores: 4,
    comprometimentoMensal: '38%',
    cadastroInadimplencia: true,
    casaPropria: false,
    financiamentoVeiculo: true,
    files: [
      {
        id: 'F-1',
        name: 'RG_frente.pdf',
        type: 'pdf',
        timestamp: '2025-01-12 09:20',
        status: 'aprovado',
        source: 'cliente',
      },
      {
        id: 'F-2',
        name: 'RG_verso.pdf',
        type: 'pdf',
        timestamp: '2025-01-12 09:22',
        status: 'pendente',
        source: 'cliente',
      },
    ],
    timeline: [
      {
        id: 'T-1',
        title: 'Dados atualizados pelo usuario',
        description: 'Telefone secundario ajustado no painel.',
        timestamp: '2025-01-12 09:10',
        type: 'update',
      },
      {
        id: 'T-2',
        title: 'Recebimento de documentos',
        description: 'RG e comprovante anexados pelo app.',
        timestamp: '2025-01-12 09:23',
        type: 'documento',
      },
      {
        id: 'T-7',
        title: 'Disparo automatico de email',
        description: 'Email de pendencia enviado ao cliente.',
        timestamp: '2025-01-12 09:30',
        type: 'comunicacao',
      },
      {
        id: 'T-8',
        title: 'Contato recebido pelo aplicativo',
        description: 'Cliente solicitou retorno via chat.',
        timestamp: '2025-01-12 10:05',
        type: 'contato',
      },
      {
        id: 'T-9',
        title: 'Resposta do juridico',
        description: 'Orientacao enviada para anexar novo comprovante.',
        timestamp: '2025-01-12 11:20',
        type: 'juridico',
      },
      {
        id: 'T-10',
        title: 'Atualizacao de processo',
        description: 'Processo entrou em fase de analise.',
        timestamp: '2025-01-12 12:10',
        type: 'processo',
      },
      {
        id: 'T-11',
        title: 'Status de pagamento atualizado',
        description: 'Parcela 02 confirmada como paga.',
        timestamp: '2025-01-12 12:40',
        type: 'pagamento',
      },
      {
        id: 'T-12',
        title: 'Aplicativo liberado',
        description: 'Acesso liberado apos validacao.',
        timestamp: '2025-01-12 13:05',
        type: 'app',
      },
    ],
    appTimeline: [
      {
        id: 'AT-1',
        title: 'Cadastro iniciado',
        description: 'Cliente iniciou onboarding no app.',
        timestamp: '2025-01-12 08:40',
      },
      {
        id: 'AT-2',
        title: 'Documentos enviados',
        description: 'RG e comprovante enviados pelo app.',
        timestamp: '2025-01-12 09:20',
      },
      {
        id: 'AT-3',
        title: 'Validacao pendente',
        description: 'Equipe aguardando revisao dos documentos.',
        timestamp: '2025-01-12 09:45',
      },
    ],
  },
  {
    id: 'CLI-1512',
    nome: 'Carolina Mendes',
    cpf: '654.321.987-10',
    rg: '12.654.321-0',
    email: 'carolina@exemplo.com',
    telefone: '(11) 95555-2100',
    telefoneSecundario: '(11) 94444-8899',
    statusPagamento: 'Aguardando primeiro pagamento',
    kanbanLane: 'documentacao_pendente',
    vendedor: 'Bruno Lima',
    createdAt: '2025-02-18',
    documentosPendentes: true,
    appStatus: 'pendente',
    processoRmc: '0542199-12.2025.8.26.0100',
    processoSuper: '0712330-44.2024.8.26.0100',
    endereco: 'Rua Bela Vista',
    numero: '34',
    bairro: 'Moema',
    cep: '04523-000',
    cidade: 'Sao Paulo',
    estado: 'SP',
    servicoContratado: 'Analise de contratos',
    contratoValor: 'R$ 21.500',
    formaPagamento: 'Boleto',
    parcelas: '20x',
    parcelasPagas: [
      { label: 'Parcela 01', vencimento: '10/03/2026', status: 'PENDENTE' },
      { label: 'Parcela 02', vencimento: '10/04/2026', status: 'PENDENTE' },
    ],
    idade: 38,
    genero: 'Feminino',
    profissao: 'Empresaria',
    estadoCivil: 'Solteira',
    situacao: 'Autonoma',
    vulnerabilidade: 'Sem vulnerabilidade',
    escolaridade: 'Superior completo',
    dependentes: false,
    numeroDependentes: 0,
    rendaIndividual: 'R$ 9.800',
    rendaFamiliar: 'R$ 9.800',
    despesas: {
      luz: 'R$ 210',
      agua: 'R$ 140',
      telefone: 'R$ 120',
      internet: 'R$ 140',
      aluguel: 'R$ 2.400',
      prestacaoCasa: 'R$ 0',
      alimentacao: 'R$ 1.600',
      planoSaude: 'R$ 520',
      medicamentos: 'R$ 80',
      impostos: 'R$ 430',
      transporte: 'R$ 360',
      outras: 'R$ 260',
    },
    causaDividas: 'Credito empresarial',
    numeroCredores: 2,
    comprometimentoMensal: '28%',
    cadastroInadimplencia: false,
    casaPropria: false,
    financiamentoVeiculo: false,
    files: [
      {
        id: 'F-7',
        name: 'comprovante_residencia.pdf',
        type: 'pdf',
        timestamp: '2025-02-18 14:20',
        status: 'pendente',
        source: 'cliente',
      },
    ],
    timeline: [
      {
        id: 'T-20',
        title: 'Cadastro recebido pelo CRM',
        description: 'Cliente importada com pendencia de documentos.',
        timestamp: '2025-02-18 13:10',
        type: 'update',
      },
      {
        id: 'T-21',
        title: 'Recebimento de documentos',
        description: 'Comprovante de residencia anexado.',
        timestamp: '2025-02-18 14:22',
        type: 'documento',
      },
    ],
    appTimeline: [
      {
        id: 'AT-4',
        title: 'Cadastro iniciado',
        description: 'Cliente preencheu dados basicos.',
        timestamp: '2025-02-18 12:30',
      },
      {
        id: 'AT-5',
        title: 'Pendencia de documentos',
        description: 'Aguardando envio de RG verso.',
        timestamp: '2025-02-18 13:20',
      },
    ],
  },
  {
    id: 'CLI-1598',
    nome: 'Joao Batista',
    cpf: '112.233.445-56',
    rg: '55.112.233-4',
    email: 'joao.batista@exemplo.com',
    telefone: '(21) 93333-7788',
    statusPagamento: 'Aguardando primeiro pagamento',
    kanbanLane: 'documentacao_pendente',
    vendedor: 'Ana Paula',
    createdAt: '2025-02-20',
    documentosPendentes: true,
    appStatus: 'pendente',
    processoRmc: '0912450-77.2025.8.19.0001',
    processoSuper: '0341200-19.2024.8.19.0001',
    endereco: 'Rua do Comercio',
    numero: '221',
    bairro: 'Centro',
    cep: '20040-001',
    cidade: 'Rio de Janeiro',
    estado: 'RJ',
    servicoContratado: 'Renegociacao guiada',
    contratoValor: 'R$ 16.700',
    formaPagamento: 'Pix',
    parcelas: '16x',
    parcelasPagas: [
      { label: 'Parcela 01', vencimento: '10/03/2026', status: 'PENDENTE' },
      { label: 'Parcela 02', vencimento: '10/04/2026', status: 'PENDENTE' },
    ],
    idade: 46,
    genero: 'Masculino',
    profissao: 'Vendedor',
    estadoCivil: 'Casado',
    situacao: 'CLT',
    vulnerabilidade: 'Sem vulnerabilidade',
    escolaridade: 'Medio completo',
    dependentes: true,
    numeroDependentes: 2,
    rendaIndividual: 'R$ 4.000',
    rendaFamiliar: 'R$ 5.800',
    despesas: {
      luz: 'R$ 160',
      agua: 'R$ 120',
      telefone: 'R$ 90',
      internet: 'R$ 100',
      aluguel: 'R$ 1.500',
      prestacaoCasa: 'R$ 0',
      alimentacao: 'R$ 1.200',
      planoSaude: 'R$ 320',
      medicamentos: 'R$ 60',
      impostos: 'R$ 180',
      transporte: 'R$ 240',
      outras: 'R$ 140',
    },
    causaDividas: 'Parcelamento de cartao',
    numeroCredores: 3,
    comprometimentoMensal: '34%',
    cadastroInadimplencia: true,
    casaPropria: false,
    financiamentoVeiculo: true,
    files: [
      {
        id: 'F-8',
        name: 'rg_frente.pdf',
        type: 'pdf',
        timestamp: '2025-02-20 09:50',
        status: 'pendente',
        source: 'cliente',
      },
    ],
    timeline: [
      {
        id: 'T-22',
        title: 'Recebimento de documentos',
        description: 'RG frente anexado.',
        timestamp: '2025-02-20 09:52',
        type: 'documento',
      },
      {
        id: 'T-23',
        title: 'Contato recebido pelo whatsapp',
        description: 'Cliente pediu atualizacao do processo.',
        timestamp: '2025-02-20 10:05',
        type: 'contato',
      },
    ],
    appTimeline: [
      {
        id: 'AT-6',
        title: 'Cadastro iniciado',
        description: 'Cliente iniciou registro no app.',
        timestamp: '2025-02-20 08:40',
      },
      {
        id: 'AT-7',
        title: 'Bloqueio preventivo',
        description: 'Acesso bloqueado ate envio de documentos.',
        timestamp: '2025-02-20 10:10',
      },
    ],
  },
  {
    id: 'CLI-1634',
    nome: 'Vanessa Ribeiro',
    cpf: '998.776.554-33',
    rg: '88.998.776-5',
    email: 'vanessa@exemplo.com',
    telefone: '(31) 97777-5522',
    telefoneSecundario: '(31) 98888-4422',
    statusPagamento: 'Aguardando primeiro pagamento',
    kanbanLane: 'documentacao_pendente',
    vendedor: 'Camila Souza',
    createdAt: '2025-02-22',
    documentosPendentes: true,
    appStatus: 'pendente',
    processoRmc: '0654321-90.2025.8.13.0024',
    processoSuper: '0109876-55.2024.8.13.0024',
    endereco: 'Rua Horizonte',
    numero: '89',
    bairro: 'Savassi',
    cep: '30120-040',
    cidade: 'Belo Horizonte',
    estado: 'MG',
    servicoContratado: 'Regularizacao juridica',
    contratoValor: 'R$ 19.200',
    formaPagamento: 'Boleto',
    parcelas: '18x',
    parcelasPagas: [
      { label: 'Parcela 01', vencimento: '10/03/2026', status: 'PENDENTE' },
      { label: 'Parcela 02', vencimento: '10/04/2026', status: 'PENDENTE' },
    ],
    idade: 33,
    genero: 'Feminino',
    profissao: 'Designer',
    estadoCivil: 'Solteira',
    situacao: 'Autonoma',
    vulnerabilidade: 'Deficiencia fisica',
    escolaridade: 'Superior completo',
    dependentes: false,
    numeroDependentes: 0,
    rendaIndividual: 'R$ 5.200',
    rendaFamiliar: 'R$ 5.200',
    despesas: {
      luz: 'R$ 150',
      agua: 'R$ 110',
      telefone: 'R$ 95',
      internet: 'R$ 110',
      aluguel: 'R$ 1.300',
      prestacaoCasa: 'R$ 0',
      alimentacao: 'R$ 1.000',
      planoSaude: 'R$ 360',
      medicamentos: 'R$ 90',
      impostos: 'R$ 190',
      transporte: 'R$ 210',
      outras: 'R$ 150',
    },
    causaDividas: 'Emprestimo pessoal',
    numeroCredores: 1,
    comprometimentoMensal: '30%',
    cadastroInadimplencia: false,
    casaPropria: false,
    financiamentoVeiculo: false,
    files: [
      {
        id: 'F-9',
        name: 'cpf_frente.pdf',
        type: 'pdf',
        timestamp: '2025-02-22 11:45',
        status: 'pendente',
        source: 'cliente',
      },
    ],
    timeline: [
      {
        id: 'T-24',
        title: 'Cadastro recebido pelo CRM',
        description: 'Cliente aguardando envio de documentos.',
        timestamp: '2025-02-22 10:30',
        type: 'update',
      },
    ],
    appTimeline: [
      {
        id: 'AT-8',
        title: 'Cadastro iniciado',
        description: 'Cliente iniciou etapa de documentos.',
        timestamp: '2025-02-22 09:50',
      },
      {
        id: 'AT-9',
        title: 'Documentos pendentes',
        description: 'RG verso ainda nao enviado.',
        timestamp: '2025-02-22 11:10',
      },
    ],
  },
  {
    id: 'CLI-1108',
    nome: 'Marcos Teixeira',
    cpf: '987.654.321-00',
    rg: '11.987.654-3',
    email: 'marcos@exemplo.com',
    telefone: '(21) 95555-3333',
    statusPagamento: 'Inadimplente',
    kanbanLane: 'inadimplentes',
    vendedor: 'Ana Paula',
    createdAt: '2024-12-03',
    documentosPendentes: false,
    appStatus: 'bloqueado',
    processoRmc: '1190042-83.2023.8.19.0001',
    processoSuper: '0745129-10.2022.8.07.0001',
    endereco: 'Av. Central',
    numero: '450',
    bairro: 'Centro',
    cep: '20010-000',
    cidade: 'Rio de Janeiro',
    estado: 'RJ',
    servicoContratado: 'Renegociacao de dividas',
    contratoValor: 'R$ 24.300',
    formaPagamento: 'Pix',
    parcelas: '24x',
    parcelasPagas: [
      { label: 'Parcela 01', vencimento: '10/11/2025', status: 'PAGA' },
      { label: 'Parcela 02', vencimento: '10/12/2025', status: 'PAGA' },
      { label: 'Parcela 03', vencimento: '10/01/2026', status: 'ATRASADA' },
    ],
    idade: 51,
    genero: 'Masculino',
    profissao: 'Motorista',
    estadoCivil: 'Divorciado',
    situacao: 'Autonomo',
    vulnerabilidade: 'Sem vulnerabilidade',
    escolaridade: 'Medio completo',
    dependentes: false,
    numeroDependentes: 0,
    rendaIndividual: 'R$ 3.200',
    rendaFamiliar: 'R$ 3.200',
    despesas: {
      luz: 'R$ 140',
      agua: 'R$ 110',
      telefone: 'R$ 80',
      internet: 'R$ 120',
      aluguel: 'R$ 1.200',
      prestacaoCasa: 'R$ 0',
      alimentacao: 'R$ 950',
      planoSaude: 'R$ 0',
      medicamentos: 'R$ 90',
      impostos: 'R$ 180',
      transporte: 'R$ 260',
      outras: 'R$ 150',
    },
    causaDividas: 'Cartao de credito',
    numeroCredores: 3,
    comprometimentoMensal: '52%',
    cadastroInadimplencia: true,
    casaPropria: false,
    financiamentoVeiculo: false,
    files: [
      {
        id: 'F-3',
        name: 'contrato_assinado.pdf',
        type: 'pdf',
        timestamp: '2024-12-03 14:12',
        status: 'aprovado',
        source: 'equipe',
      },
    ],
    timeline: [
      {
        id: 'T-3',
        title: 'Pagamento atrasado',
        description: 'Parcela 5 em aberto ha 10 dias.',
        timestamp: '2025-02-01 08:00',
        type: 'pagamento',
      },
    ],
    appTimeline: [
      {
        id: 'AT-10',
        title: 'Acesso bloqueado',
        description: 'App bloqueado por inadimplencia.',
        timestamp: '2025-02-01 08:20',
      },
      {
        id: 'AT-11',
        title: 'Notificacao enviada',
        description: 'Cliente notificado sobre bloqueio.',
        timestamp: '2025-02-01 08:30',
      },
    ],
  },
  {
    id: 'CLI-1219',
    nome: 'Fernanda Cruz',
    cpf: '321.654.987-00',
    rg: '28.321.654-9',
    email: 'fernanda@exemplo.com',
    telefone: '(31) 96666-4444',
    statusPagamento: 'Em dia',
    kanbanLane: 'em_dia',
    vendedor: 'Rafael Siqueira',
    createdAt: '2025-02-03',
    documentosPendentes: false,
    appStatus: 'liberado',
    processoRmc: '0058123-44.2025.8.15.0001',
    processoSuper: '0932178-62.2021.8.13.0024',
    endereco: 'Rua Serra Azul',
    numero: '88',
    bairro: 'Savassi',
    cep: '30140-110',
    cidade: 'Belo Horizonte',
    estado: 'MG',
    servicoContratado: 'Acompanhamento juridico',
    contratoValor: 'R$ 14.800',
    formaPagamento: 'Boleto',
    parcelas: '12x',
    parcelasPagas: [
      { label: 'Parcela 01', vencimento: '10/09/2025', status: 'PAGA' },
      { label: 'Parcela 02', vencimento: '10/10/2025', status: 'PAGA' },
      { label: 'Parcela 03', vencimento: '10/11/2025', status: 'PAGA' },
    ],
    idade: 36,
    genero: 'Feminino',
    profissao: 'Analista',
    estadoCivil: 'Solteira',
    situacao: 'CLT',
    vulnerabilidade: 'Sem vulnerabilidade',
    escolaridade: 'Superior completo',
    dependentes: true,
    numeroDependentes: 1,
    rendaIndividual: 'R$ 6.200',
    rendaFamiliar: 'R$ 8.500',
    despesas: {
      luz: 'R$ 160',
      agua: 'R$ 100',
      telefone: 'R$ 90',
      internet: 'R$ 130',
      aluguel: 'R$ 1.400',
      prestacaoCasa: 'R$ 0',
      alimentacao: 'R$ 1.050',
      planoSaude: 'R$ 390',
      medicamentos: 'R$ 60',
      impostos: 'R$ 210',
      transporte: 'R$ 280',
      outras: 'R$ 120',
    },
    causaDividas: 'Financiamento pessoal',
    numeroCredores: 2,
    comprometimentoMensal: '29%',
    cadastroInadimplencia: false,
    casaPropria: false,
    financiamentoVeiculo: false,
    files: [
      {
        id: 'F-4',
        name: 'comprovante_residencia.jpg',
        type: 'jpg',
        timestamp: '2025-02-03 10:18',
        status: 'aprovado',
        source: 'cliente',
      },
    ],
    timeline: [
      {
        id: 'T-4',
        title: 'Aplicativo liberado',
        description: 'Cliente ja acessou o app.',
        timestamp: '2025-02-05 09:40',
        type: 'app',
      },
    ],
    appTimeline: [
      {
        id: 'AT-12',
        title: 'Cadastro concluido',
        description: 'Cliente finalizou onboarding.',
        timestamp: '2025-02-04 16:00',
      },
      {
        id: 'AT-13',
        title: 'Acesso liberado',
        description: 'App liberado para uso.',
        timestamp: '2025-02-05 09:40',
      },
    ],
  },
  {
    id: 'CLI-1304',
    nome: 'Patricia Monteiro',
    cpf: '741.258.963-00',
    rg: '45.741.258-1',
    email: 'patricia@exemplo.com',
    telefone: '(85) 97777-9999',
    statusPagamento: 'Em dia',
    kanbanLane: 'provas',
    vendedor: 'Camila Souza',
    createdAt: '2024-11-18',
    documentosPendentes: false,
    appStatus: 'liberado',
    processoRmc: '0879645-70.2025.8.20.5001',
    processoSuper: '0214450-91.2020.8.05.0001',
    endereco: 'Rua do Sol',
    numero: '520',
    bairro: 'Aldeota',
    cep: '60120-230',
    cidade: 'Fortaleza',
    estado: 'CE',
    servicoContratado: 'Defesa em processo judicial',
    contratoValor: 'R$ 32.000',
    formaPagamento: 'Pix',
    parcelas: '30x',
    parcelasPagas: [
      { label: 'Parcela 01', vencimento: '10/08/2025', status: 'PAGA' },
      { label: 'Parcela 02', vencimento: '10/09/2025', status: 'PAGA' },
      { label: 'Parcela 03', vencimento: '10/10/2025', status: 'PAGA' },
    ],
    idade: 58,
    genero: 'Feminino',
    profissao: 'Professora',
    estadoCivil: 'Viuva',
    situacao: 'Aposentada',
    vulnerabilidade: 'Deficiencia fisica',
    escolaridade: 'Superior completo',
    dependentes: false,
    numeroDependentes: 0,
    rendaIndividual: 'R$ 5.400',
    rendaFamiliar: 'R$ 5.400',
    despesas: {
      luz: 'R$ 210',
      agua: 'R$ 140',
      telefone: 'R$ 80',
      internet: 'R$ 110',
      aluguel: 'R$ 0',
      prestacaoCasa: 'R$ 1.200',
      alimentacao: 'R$ 1.100',
      planoSaude: 'R$ 520',
      medicamentos: 'R$ 240',
      impostos: 'R$ 190',
      transporte: 'R$ 130',
      outras: 'R$ 180',
    },
    causaDividas: 'Dividas medicas',
    numeroCredores: 1,
    comprometimentoMensal: '22%',
    cadastroInadimplencia: false,
    casaPropria: true,
    financiamentoVeiculo: false,
    files: [
      {
        id: 'F-5',
        name: 'prova_audio.mp3',
        type: 'mp3',
        timestamp: '2025-01-20 16:30',
        status: 'aprovado',
        source: 'equipe',
      },
    ],
    timeline: [
      {
        id: 'T-5',
        title: 'Prova agendada',
        description: 'Audiencia marcada para 10/03.',
        timestamp: '2025-02-18 11:05',
        type: 'juridico',
      },
    ],
    appTimeline: [
      {
        id: 'AT-14',
        title: 'Cadastro concluido',
        description: 'Onboarding finalizado no app.',
        timestamp: '2024-11-20 15:10',
      },
      {
        id: 'AT-15',
        title: 'Acesso liberado',
        description: 'Liberacao definitiva.',
        timestamp: '2024-11-21 09:00',
      },
    ],
  },
  {
    id: 'CLI-1401',
    nome: 'Renato Gomes',
    cpf: '852.963.741-00',
    rg: '18.852.963-2',
    email: 'renato@exemplo.com',
    telefone: '(41) 94444-2222',
    statusPagamento: 'Documentacao enviada',
    kanbanLane: 'documentacao_enviada',
    vendedor: 'Larissa Mota',
    createdAt: '2025-02-10',
    documentosPendentes: false,
    appStatus: 'pendente',
    processoRmc: '0450099-33.2024.8.24.0023',
    processoSuper: '0671120-08.2023.8.09.0011',
    endereco: 'Av. das Araucarias',
    numero: '210',
    bairro: 'Batel',
    cep: '80420-090',
    cidade: 'Curitiba',
    estado: 'PR',
    servicoContratado: 'Acordo judicial',
    contratoValor: 'R$ 19.600',
    formaPagamento: 'Boleto',
    parcelas: '15x',
    parcelasPagas: [
      { label: 'Parcela 01', vencimento: '10/12/2025', status: 'PAGA' },
      { label: 'Parcela 02', vencimento: '10/01/2026', status: 'PAGA' },
      { label: 'Parcela 03', vencimento: '10/02/2026', status: 'PAGA' },
    ],
    idade: 40,
    genero: 'Masculino',
    profissao: 'Gestor',
    estadoCivil: 'Casado',
    situacao: 'CLT',
    vulnerabilidade: 'Sem vulnerabilidade',
    escolaridade: 'Superior completo',
    dependentes: true,
    numeroDependentes: 1,
    rendaIndividual: 'R$ 7.400',
    rendaFamiliar: 'R$ 9.200',
    despesas: {
      luz: 'R$ 170',
      agua: 'R$ 100',
      telefone: 'R$ 85',
      internet: 'R$ 140',
      aluguel: 'R$ 0',
      prestacaoCasa: 'R$ 1.450',
      alimentacao: 'R$ 1.300',
      planoSaude: 'R$ 480',
      medicamentos: 'R$ 120',
      impostos: 'R$ 240',
      transporte: 'R$ 320',
      outras: 'R$ 210',
    },
    causaDividas: 'Emprestimo consignado',
    numeroCredores: 2,
    comprometimentoMensal: '31%',
    cadastroInadimplencia: false,
    casaPropria: true,
    financiamentoVeiculo: true,
    files: [
      {
        id: 'F-6',
        name: 'comprovante_residencia.pdf',
        type: 'pdf',
        timestamp: '2025-02-10 15:00',
        status: 'aprovado',
        source: 'cliente',
      },
    ],
    timeline: [
      {
        id: 'T-6',
        title: 'Documentos aprovados',
        description: 'Equipe validou arquivos enviados.',
        timestamp: '2025-02-12 13:18',
        type: 'documento',
      },
    ],
    appTimeline: [
      {
        id: 'AT-16',
        title: 'Cadastro iniciado',
        description: 'Cliente iniciou onboarding.',
        timestamp: '2025-02-10 10:05',
      },
      {
        id: 'AT-17',
        title: 'Aguardando validacao',
        description: 'Equipe validando documentos enviados.',
        timestamp: '2025-02-12 09:40',
      },
    ],
  },
]

export const legalTicketsMock: LegalTicketMock[] = [
  {
    id: 'JUR-189',
    clienteId: 'CLI-1304',
    clienteNome: 'Patricia Monteiro',
    status: 'pendente',
    lastUpdate: '2025-02-22 14:10',
    messages: [
      {
        id: 'M-1',
        author: 'equipe',
        body: 'Solicitamos revisao do contrato e orientacao sobre provas.',
        timestamp: '2025-02-22 13:40',
      },
    ],
  },
  {
    id: 'JUR-312',
    clienteId: 'CLI-1108',
    clienteNome: 'Marcos Teixeira',
    status: 'pendente',
    lastUpdate: '2025-02-23 15:10',
    messages: [
      {
        id: 'M-4',
        author: 'equipe',
        body: 'Cliente inadimplente solicitou renegociacao. Precisa orientacao juridica.',
        timestamp: '2025-02-23 14:45',
      },
    ],
  },
  {
    id: 'JUR-204',
    clienteId: 'CLI-1042',
    clienteNome: 'Luciana Prado',
    status: 'respondido',
    lastUpdate: '2025-02-20 09:15',
    messages: [
      {
        id: 'M-2',
        author: 'equipe',
        body: 'Cliente enviou documentos incompletos, como proceder?',
        timestamp: '2025-02-19 17:20',
      },
      {
        id: 'M-3',
        author: 'juridico',
        body: 'Solicitar novo comprovante e anexar ao processo.',
        timestamp: '2025-02-20 09:15',
      },
    ],
  },
]

export const chatThreadsMock: ChatThreadMock[] = [
  {
    id: 'CHAT-01',
    clienteId: 'CLI-1219',
    uidid: 'CLI-1219',
    clienteNome: 'Fernanda Cruz',
    cpf: '321.654.987-00',
    telefone: '(31) 96666-4444',
    email: 'fernanda@exemplo.com',
    protocolo: 'PRT-904',
    statusPagamento: 'Em dia',
    lastInteraction: '2025-02-25 09:12',
    clienteOnline: true,
    atendenteNome: 'Livia Ramos',
    atendenteOnline: true,
    activeProtocol: true,
    messages: [
      {
        id: 'C-1',
        author: 'cliente',
        body: 'Oi, posso falar sobre meu contrato?',
        timestamp: '2025-02-25 09:10',
        type: 'texto',
      },
      {
        id: 'C-2',
        author: 'equipe',
        body: 'Claro! Estou aqui para ajudar.',
        timestamp: '2025-02-25 09:12',
        type: 'texto',
        delivered: true,
        read: true,
      },
      {
        id: 'C-3',
        author: 'cliente',
        body: 'Queria entender o status do meu processo.',
        timestamp: '2025-02-25 09:14',
        type: 'texto',
      },
      {
        id: 'C-4',
        author: 'equipe',
        body: 'Seu processo esta em analise, previsao de resposta em 48h.',
        timestamp: '2025-02-25 09:15',
        type: 'texto',
        delivered: true,
        read: true,
      },
      {
        id: 'C-5',
        author: 'cliente',
        body: 'Enviei um comprovante ontem.',
        timestamp: '2025-02-25 09:17',
        type: 'texto',
      },
      {
        id: 'C-6',
        author: 'equipe',
        body: 'Recebido! Vou anexar ao seu cadastro.',
        timestamp: '2025-02-25 09:18',
        type: 'texto',
        delivered: true,
        read: false,
      },
      {
        id: 'C-7',
        author: 'cliente',
        body: 'Documento_anexo.pdf',
        timestamp: '2025-02-25 09:19',
        type: 'arquivo',
        fileName: 'Documento_anexo.pdf',
      },
      {
        id: 'C-8',
        author: 'equipe',
        body: 'Obrigada! Estou registrando.',
        timestamp: '2025-02-25 09:20',
        type: 'texto',
        delivered: true,
        read: false,
      },
      {
        id: 'C-9',
        author: 'cliente',
        body: 'Qualquer novidade me avise.',
        timestamp: '2025-02-25 09:21',
        type: 'texto',
      },
    ],
  },
  {
    id: 'CHAT-02',
    clienteId: 'CLI-1108',
    uidid: 'CLI-1108',
    clienteNome: 'Marcos Teixeira',
    cpf: '987.654.321-00',
    telefone: '(21) 95555-3333',
    email: 'marcos@exemplo.com',
    protocolo: 'PRT-777',
    statusPagamento: 'Inadimplente',
    lastInteraction: '2025-02-24 18:32',
    clienteOnline: false,
    atendenteNome: 'Guilherme Pires',
    atendenteOnline: true,
    activeProtocol: true,
    messages: [
      {
        id: 'C-3',
        author: 'cliente',
        body: 'Preciso renegociar.',
        timestamp: '2025-02-24 18:32',
        type: 'texto',
      },
      {
        id: 'C-4',
        author: 'equipe',
        body: 'Vamos revisar as parcelas abertas.',
        timestamp: '2025-02-24 18:34',
        type: 'texto',
        delivered: true,
        read: true,
      },
      {
        id: 'C-5',
        author: 'cliente',
        body: 'Posso pagar via pix?',
        timestamp: '2025-02-24 18:36',
        type: 'texto',
      },
      {
        id: 'C-6',
        author: 'equipe',
        body: 'Sim, posso te enviar o QR code.',
        timestamp: '2025-02-24 18:38',
        type: 'texto',
        delivered: true,
        read: false,
      },
      {
        id: 'C-7',
        author: 'cliente',
        body: 'Comprovante_pix.pdf',
        timestamp: '2025-02-24 18:40',
        type: 'arquivo',
        fileName: 'Comprovante_pix.pdf',
      },
      {
        id: 'C-8',
        author: 'equipe',
        body: 'Recebido, obrigado.',
        timestamp: '2025-02-24 18:41',
        type: 'texto',
        delivered: true,
        read: false,
      },
    ],
  },
  {
    id: 'CHAT-03',
    clienteId: 'CLI-1512',
    uidid: 'CLI-1512',
    clienteNome: 'Carolina Mendes',
    cpf: '654.321.987-10',
    telefone: '(11) 95555-2100',
    email: 'carolina@exemplo.com',
    protocolo: '',
    statusPagamento: 'Pendente',
    lastInteraction: '2025-02-21 12:10',
    clienteOnline: false,
    atendenteNome: 'Roberta Lins',
    atendenteOnline: false,
    activeProtocol: false,
    messages: [
      {
        id: 'C-4',
        author: 'equipe',
        body: 'Tentamos contato sem retorno.',
        timestamp: '2025-02-21 12:10',
        type: 'texto',
        delivered: true,
        read: false,
      },
      {
        id: 'C-5',
        author: 'equipe',
        body: 'Reenvio do contrato em anexo.',
        timestamp: '2025-02-21 12:12',
        type: 'arquivo',
        fileName: 'Contrato_atualizado.pdf',
        delivered: true,
        read: false,
      },
      {
        id: 'C-6',
        author: 'cliente',
        body: 'Vou avaliar e retorno.',
        timestamp: '2025-02-21 12:15',
        type: 'texto',
      },
      {
        id: 'C-7',
        author: 'equipe',
        body: 'Quando quiser, estou disponivel.',
        timestamp: '2025-02-21 12:16',
        type: 'texto',
        delivered: true,
        read: false,
      },
    ],
  },
]

export const emailsMock: EmailMock[] = [
  {
    id: 'E-1',
    clienteNome: 'Luciana Prado',
    email: 'luciana@exemplo.com',
    subject: 'Pendencia de documentos',
    body:
      'Oi, equipe.\n\nAinda estou com dificuldade para enviar os documentos. Poderiam confirmar se a lista esta correta e se aceitam fotos em PDF?\n\nObrigada,\nLuciana',
    status: 'recebido',
    timestamp: '2025-02-20 08:15',
  },
  {
    id: 'E-2',
    clienteNome: 'Renato Gomes',
    email: 'renato@exemplo.com',
    subject: 'Confirmacao de envio',
    body:
      'Confirmo o envio do contrato assinado e comprovante de residencia.\n\nFico no aguardo das proximas etapas.',
    status: 'enviado',
    timestamp: '2025-02-21 11:40',
  },
  {
    id: 'E-3',
    clienteNome: 'Marcos Teixeira',
    email: 'marcos@exemplo.com',
    subject: 'Falha no envio',
    body:
      'Erro ao enviar email para marcos@exemplo.com. Tente novamente ou valide o endereco.',
    status: 'erro',
    timestamp: '2025-02-21 13:12',
  },
  {
    id: 'E-4',
    clienteNome: 'Carolina Mendes',
    email: 'carolina@exemplo.com',
    subject: 'Solicitacao de atualizacao',
    body:
      'Bom dia!\n\nVocês podem atualizar meus dados cadastrais? Troquei de telefone e endereco.\n\nNovo telefone: (11) 95555-2100\nNovo endereco: Rua das Oliveiras, 45',
    status: 'recebido',
    timestamp: '2025-02-22 09:05',
  },
  {
    id: 'E-5',
    clienteNome: 'Fernanda Cruz',
    email: 'fernanda@exemplo.com',
    subject: 'Retorno sobre contrato',
    body:
      'Oi, equipe.\n\nSegue a duvida: o prazo de analise ainda esta dentro do combinado? Preciso de uma previsao.\n\nAguardo retorno.',
    status: 'recebido',
    timestamp: '2025-02-22 16:18',
  },
]

export const logsMock: LogMock[] = [
  {
    id: 'L-1',
    action: 'admin_invite',
    actor: 'admin@local.test',
    description: 'Convite enviado para juliana@empresa.com',
    timestamp: '2025-02-20 10:24',
  },
  {
    id: 'L-2',
    action: 'documentos_aprovados',
    actor: 'suporte@local.test',
    description: 'Documentacao aprovada para CLI-1401',
    timestamp: '2025-02-20 09:58',
  },
  {
    id: 'L-3',
    action: 'mail_send',
    actor: 'vendas@local.test',
    description: 'Email enviado para Marcos Teixeira',
    timestamp: '2025-02-19 18:12',
  },
  {
    id: 'L-4',
    action: 'auth_login',
    actor: 'suporte@local.test',
    description: 'Login realizado com sucesso',
    timestamp: '2025-02-21 08:02',
  },
  {
    id: 'L-5',
    action: 'auth_login_failed',
    actor: 'unknown@local.test',
    description: 'Falha de login: senha invalida',
    timestamp: '2025-02-21 08:04',
  },
  {
    id: 'L-6',
    action: 'team_disable',
    actor: 'admin@local.test',
    description: 'Usuario desativado: bruno@empresa.com',
    timestamp: '2025-02-21 09:15',
  },
  {
    id: 'L-7',
    action: 'role_update',
    actor: 'admin@local.test',
    description: 'Role alterada para administrativo: ana@empresa.com',
    timestamp: '2025-02-21 09:22',
  },
  {
    id: 'L-8',
    action: 'cliente_create',
    actor: 'vendas@local.test',
    description: 'Cliente criado: CLI-1512 (Carolina Mendes)',
    timestamp: '2025-02-21 10:03',
  },
  {
    id: 'L-9',
    action: 'cliente_update',
    actor: 'vendas@local.test',
    description: 'Dados atualizados: telefone e endereco (CLI-1401)',
    timestamp: '2025-02-21 10:44',
  },
  {
    id: 'L-10',
    action: 'document_upload',
    actor: 'suporte@local.test',
    description: 'Documento enviado: comprovante_residencia.pdf (CLI-1042)',
    timestamp: '2025-02-21 11:12',
  },
  {
    id: 'L-11',
    action: 'document_approve',
    actor: 'juridico@local.test',
    description: 'Documento aprovado: identidade_frente.jpg (CLI-1042)',
    timestamp: '2025-02-21 11:28',
  },
  {
    id: 'L-12',
    action: 'document_reject',
    actor: 'juridico@local.test',
    description: 'Documento rejeitado: comprovante_renda.pdf (CLI-1199)',
    timestamp: '2025-02-21 11:34',
  },
  {
    id: 'L-13',
    action: 'payment_recorded',
    actor: 'financeiro@local.test',
    description: 'Pagamento registrado: Parcela 03 (CLI-1042)',
    timestamp: '2025-02-21 12:05',
  },
  {
    id: 'L-14',
    action: 'contract_status_update',
    actor: 'financeiro@local.test',
    description: 'Contrato atualizado para em_dia (CLI-1042)',
    timestamp: '2025-02-21 12:08',
  },
  {
    id: 'L-15',
    action: 'juridico_ticket_open',
    actor: 'suporte@local.test',
    description: 'Ticket juridico aberto: JT-2101 (CLI-1199)',
    timestamp: '2025-02-21 13:02',
  },
  {
    id: 'L-16',
    action: 'juridico_ticket_reply',
    actor: 'juridico@local.test',
    description: 'Resposta enviada no ticket JT-2101',
    timestamp: '2025-02-21 13:24',
  },
  {
    id: 'L-17',
    action: 'chat_message_sent',
    actor: 'suporte@local.test',
    description: 'Mensagem enviada no chat PRT-777',
    timestamp: '2025-02-21 14:10',
  },
  {
    id: 'L-18',
    action: 'chat_export',
    actor: 'suporte@local.test',
    description: 'Exportacao de chat: PRT-904',
    timestamp: '2025-02-21 14:18',
  },
  {
    id: 'L-19',
    action: 'mail_send_failed',
    actor: 'suporte@local.test',
    description: 'Falha ao enviar email para carolina@exemplo.com',
    timestamp: '2025-02-21 15:02',
  },
  {
    id: 'L-20',
    action: 'rls_denied',
    actor: 'suporte@local.test',
    description: 'Acesso negado ao tenant CLI-9999',
    timestamp: '2025-02-21 16:05',
  },
]

export const teamMock: TeamMemberMock[] = [
  {
    id: 'U-1',
    nome: 'Aline Costa',
    email: 'aline@local.test',
    telefone: '(11) 98888-1201',
    avatarUrl: 'https://i.pravatar.cc/120?img=47',
    role: 'admin',
    status: 'online',
    lastActivity: 'Agora',
    ipAddress: '189.45.112.23',
  },
  {
    id: 'U-2',
    nome: 'Diego Souza',
    email: 'diego@local.test',
    telefone: '(11) 97777-3321',
    avatarUrl: 'https://i.pravatar.cc/120?img=12',
    role: 'administrativo',
    status: 'offline',
    lastActivity: 'Hoje 08:45',
    ipAddress: '200.190.15.88',
  },
  {
    id: 'U-3',
    nome: 'Rafaela Prado',
    email: 'rafaela@local.test',
    telefone: '(11) 98888-4432',
    avatarUrl: 'https://i.pravatar.cc/120?img=32',
    role: 'administrativo',
    status: 'online',
    lastActivity: 'Hoje 09:05',
    ipAddress: '177.10.204.61',
  },
]
