// ============================================================
// SERVICE — Módulo 2: Análise Inicial (Compras / CPL)
// backend/src/modules/analise-cpl/analise-cpl.service.ts
// ============================================================

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// ── Mapa de status do sistema de licitações ──────────────────
export const STATUS = {
  RASCUNHO:             1,
  ENC_LICITACAO:       20,  // Encaminhado para licitação → entrada M2
  EM_ANALISE_CPL:      22,  // CPL recebeu e está analisando
  APROVADO_ANALISE:    23,  // Aprovado → segue para M3
  REPROVADO:            6,  // Encerrado (global)
  PENDENTE_AJUSTE:     24,  // Devolvido para área demandante
} as const

// SLA padrão configurável (dias úteis de referência de mercado: 3-5)
const SLA_DIAS_UTEIS = 5

// ── Tipos internos ───────────────────────────────────────────
interface ChecklistAnaliseCpl {
  conformidadeDocumental: boolean | null
  qualidadeTR:            boolean | null
  coerenciaEstimativa:    boolean | null
  enquadramentoLegal:     boolean | null
  viabilidade:            boolean | null
  adequacaoPCA:           boolean | null
  riscoContratacao:       'BAIXO' | 'MEDIO' | 'ALTO' | null
}

interface ReceberSolicitacaoInput {
  idPedido:      string
  idOrganizacao: string
  idAnalista:    string
}

interface SalvarChecklistInput {
  idPedido:      string
  idOrganizacao: string
  idAnalista:    string
  checklist:     Partial<ChecklistAnaliseCpl>
  riscosObservados?: string
}

interface AprovarAnaliseInput {
  idPedido:      string
  idOrganizacao: string
  idAnalista:    string
  parecerTecnico: string  // obrigatório na aprovação
  checklist?:    Partial<ChecklistAnaliseCpl>
}

interface DevolverParaAjusteInput {
  idPedido:      string
  idOrganizacao: string
  idAnalista:    string
  idMotivo:      number
  motivoTexto?:  string   // obrigatório se idMotivo = OUTRO
  pendencias:    string   // descrição das pendências para o solicitante
}

interface ReprovarSolicitacaoInput {
  idPedido:      string
  idOrganizacao: string
  idAnalista:    string
  idMotivo:      number
  motivoTexto?:  string
  justificativa: string  // obrigatório na reprovação
}

// ── Helpers ──────────────────────────────────────────────────
function calcularSlaPrazo(diasUteis: number): Date {
  const prazo = new Date()
  let diasAdicionados = 0

  while (diasAdicionados < diasUteis) {
    prazo.setDate(prazo.getDate() + 1)
    const diaSemana = prazo.getDay()
    if (diaSemana !== 0 && diaSemana !== 6) { // ignora domingos e sábados
      diasAdicionados++
    }
  }
  return prazo
}

function classificarContratacaoComplexa(pedido: {
  valorTotal?: number | null
  tipoPedido?: string | null
  modalidadeSugerida?: string | null
}): boolean {
  // Pendência TERRACAP item 1: critérios automáticos de complexidade
  // Implementados: valor alto, tipo de objeto, modalidade prevista
  const VALOR_LIMITE_COMPLEXIDADE = 1_000_000 // R$ 1 milhão

  if (pedido.valorTotal && pedido.valorTotal >= VALOR_LIMITE_COMPLEXIDADE) return true

  const tiposComplexos = ['OBRA', 'SERVICO_TI', 'SERVICO_CONTINUADO', 'CONCESSAO']
  if (pedido.tipoPedido && tiposComplexos.includes(pedido.tipoPedido)) return true

  const modalidadesComplexas = ['CONCORRENCIA', 'DIALOGO_COMPETITIVO']
  if (pedido.modalidadeSugerida && modalidadesComplexas.includes(pedido.modalidadeSugerida)) return true

  return false
}

async function obterVersaoAtual(idPedido: string): Promise<number> {
  const ultima = await prisma.analiseCpl.findFirst({
    where: { idPedido },
    orderBy: { versao: 'desc' },
    select: { versao: true },
  })
  return ultima ? ultima.versao + 1 : 1
}

async function validarPermissaoCPL(idAnalista: string, idOrganizacao: string): Promise<void> {
  const usuario = await prisma.usuarioOrganizacao.findFirst({
    where: {
      idUsuario: idAnalista,
      idOrganizacao,
      perfil: { in: ['Comprador', 'CPL', 'GestorCompras', 'Admin'] },
      ativo: true,
    },
  })
  if (!usuario) {
    throw new Error('Usuário não tem permissão de Compras/CPL nesta organização')
  }
}

async function registrarAuditoria(params: {
  idPedido:      string
  idUsuario:     string
  acao:          string
  valorAntes:    string
  valorDepois:   string
  campo:         string
}): Promise<void> {
  await prisma.auditoriaPedido.create({
    data: {
      idPedido:   params.idPedido,
      usuarioId:  params.idUsuario,
      acao:       params.acao,
      valorAntes: params.valorAntes,
      valorDepois: params.valorDepois,
      campo:      params.campo,
    },
  })
}

// ── 1. RECEBER SOLICITAÇÃO (status 2 → 3) ───────────────────
// CPL recebe o pedido submetido e inicia a análise formal.
export async function receberSolicitacao(input: ReceberSolicitacaoInput) {
  const pedido = await prisma.pedido.findFirst({
    where: { id: input.idPedido, idOrganizacao: input.idOrganizacao },
  })

  if (!pedido) throw new Error('Pedido não encontrado')
  if (pedido.status !== STATUS.ENC_LICITACAO) {
    throw new Error(`Pedido deve estar encaminhado para licitação (status 20) para iniciar análise. Status atual: ${pedido.status}`)
  }

  const exigeMatrizRisco = classificarContratacaoComplexa({
    valorTotal:         Number(pedido.valorTotal ?? 0),
    tipoPedido:         (pedido as any).tipoPedido ?? null,
    modalidadeSugerida: (pedido as any).modalidadeSugerida ?? null,
  })

  const versao  = await obterVersaoAtual(input.idPedido)
  const slaPrazo = calcularSlaPrazo(SLA_DIAS_UTEIS)

  const [analise] = await prisma.$transaction([
    prisma.analiseCpl.create({
      data: {
        idPedido:        input.idPedido,
        idOrganizacao:   input.idOrganizacao,
        idAnalista:      input.idAnalista,
        versao,
        statusAnterior:  STATUS.SUBMETIDO,
        exigeMatrizRisco,
        slaPrazo,
        dataRecebimento: new Date(),
      },
    }),
    prisma.pedido.update({
      where: { id: input.idPedido },
      data:  { status: STATUS.EM_ANALISE_CPL },
    }),
  ])

  await registrarAuditoria({
    idPedido:    input.idPedido,
    idUsuario:   input.idAnalista,
    acao:        'Análise CPL iniciada',
    valorAntes:  String(STATUS.SUBMETIDO),
    valorDepois: String(STATUS.EM_ANALISE_CPL),
    campo:       'status',
  })

  return {
    analise,
    alertas: exigeMatrizRisco
      ? ['Contratação classificada como complexa — matriz de risco obrigatória']
      : [],
  }
}

// ── 2. SALVAR CHECKLIST DE ANÁLISE ──────────────────────────
// Salva o progresso do checklist sem encerrar a análise.
export async function salvarChecklist(input: SalvarChecklistInput) {
  const analise = await prisma.analiseCpl.findFirst({
    where: {
      idPedido:     input.idPedido,
      idOrganizacao: input.idOrganizacao,
    },
    orderBy: { versao: 'desc' },
  })

  if (!analise) throw new Error('Análise CPL não encontrada para este pedido')

  const pedido = await prisma.pedido.findUnique({ where: { id: input.idPedido } })
  if (pedido?.status !== STATUS.EM_ANALISE_CPL) {
    throw new Error('Pedido não está em análise CPL no momento')
  }

  const checklistAtual = (analise.checklist && typeof analise.checklist === "object" && !Array.isArray(analise.checklist) ? analise.checklist : {}) as Partial<ChecklistAnaliseCpl>
  const checklistAtualizado = { ...checklistAtual, ...input.checklist }

  const analiseAtualizada = await prisma.analiseCpl.update({
    where: { id: analise.id },
    data: {
      checklist:       checklistAtualizado,
      riscosObservados: input.riscosObservados ?? analise.riscosObservados,
      idAnalista:      input.idAnalista,
    },
  })

  await registrarAuditoria({
    idPedido:    input.idPedido,
    idUsuario:   input.idAnalista,
    acao:        'Checklist de análise atualizado',
    valorAntes:  JSON.stringify(checklistAtual),
    valorDepois: JSON.stringify(checklistAtualizado),
    campo:       'checklist_analise_cpl',
  })

  return analiseAtualizada
}

// ── 3. APROVAR ANÁLISE INICIAL (status 3 → 5) ───────────────
// Aprovação encaminha automaticamente para M3 (Definição da Contratação).
export async function aprovarAnaliseInicial(input: AprovarAnaliseInput) {
  if (!input.parecerTecnico?.trim()) {
    throw new Error('Parecer técnico é obrigatório para aprovar a análise inicial')
  }

  const pedido = await prisma.pedido.findFirst({
    where: { id: input.idPedido, idOrganizacao: input.idOrganizacao },
  })

  if (!pedido) throw new Error('Pedido não encontrado')
  if (pedido.status !== STATUS.EM_ANALISE_CPL) {
    throw new Error('Pedido deve estar Em análise Compras/CPL para ser aprovado')
  }

  const analise = await prisma.analiseCpl.findFirst({
    where: { idPedido: input.idPedido },
    orderBy: { versao: 'desc' },
  })

  if (!analise) throw new Error('Registro de análise CPL não encontrado')

  const checklistAtual = (analise.checklist && typeof analise.checklist === "object" && !Array.isArray(analise.checklist)) ? analise.checklist as Record<string, unknown> : {}
  const checklistFinal = input.checklist
    ? { ...checklistAtual, ...input.checklist }
    : analise.checklist

  const [analiseAtualizada] = await prisma.$transaction([
    prisma.analiseCpl.update({
      where: { id: analise.id },
      data: {
        parecerTecnico:  input.parecerTecnico,
        checklist:       checklistFinal ?? undefined,
        statusResultado: STATUS.APROVADO_ANALISE,
        dataConclusao:   new Date(),
      },
    }),
    prisma.pedido.update({
      where: { id: input.idPedido },
      data:  { status: STATUS.APROVADO_ANALISE },
    }),
  ])

  await registrarAuditoria({
    idPedido:    input.idPedido,
    idUsuario:   input.idAnalista,
    acao:        'Aprovado na análise inicial — encaminhado para Definição da Contratação',
    valorAntes:  String(STATUS.EM_ANALISE_CPL),
    valorDepois: String(STATUS.APROVADO_ANALISE),
    campo:       'status',
  })

  // TODO: disparar notificação ao solicitante (módulo de notificações)
  // TODO: criar evento para M3 (Definição da Contratação)

  return analiseAtualizada
}

// ── 4. DEVOLVER PARA AJUSTE (status 3 → 12) ─────────────────
// CPL devolve com lista de pendências. Abre edição ao solicitante.
export async function devolverParaAjuste(input: DevolverParaAjusteInput) {
  const motivo = await prisma.motivoAnaliseCpl.findUnique({
    where: { id: input.idMotivo },
  })

  if (!motivo) throw new Error('Motivo de devolução inválido')
  if (!['DEVOLUCAO', 'AMBOS'].includes(motivo.tipo)) {
    throw new Error('Motivo informado não se aplica a devolução')
  }

  // Se motivo for OUTRO, texto livre é obrigatório
  if (motivo.codigo === 'OUTRO' && !input.motivoTexto?.trim()) {
    throw new Error('Campo de justificativa é obrigatório quando o motivo for "Outro"')
  }

  const pedido = await prisma.pedido.findFirst({
    where: { id: input.idPedido, idOrganizacao: input.idOrganizacao },
  })

  if (!pedido) throw new Error('Pedido não encontrado')
  if (pedido.status !== STATUS.EM_ANALISE_CPL) {
    throw new Error('Pedido deve estar Em análise Compras/CPL para ser devolvido')
  }

  const analise = await prisma.analiseCpl.findFirst({
    where: { idPedido: input.idPedido },
    orderBy: { versao: 'desc' },
  })

  if (!analise) throw new Error('Registro de análise CPL não encontrado')

  const [analiseAtualizada] = await prisma.$transaction([
    prisma.analiseCpl.update({
      where: { id: analise.id },
      data: {
        idMotivo:        input.idMotivo,
        motivoTexto:     input.motivoTexto,
        statusResultado: STATUS.PENDENTE_AJUSTE,
        dataConclusao:   new Date(),
      },
    }),
    prisma.pedido.update({
      where: { id: input.idPedido },
      data:  { status: STATUS.PENDENTE_AJUSTE },
    }),
  ])

  await registrarAuditoria({
    idPedido:    input.idPedido,
    idUsuario:   input.idAnalista,
    acao:        `Devolvido para ajuste — ${motivo.descricao}`,
    valorAntes:  String(STATUS.EM_ANALISE_CPL),
    valorDepois: input.pendencias,
    campo:       'pendencias',
  })

  // TODO: notificar área demandante com lista de pendências

  return analiseAtualizada
}

// ── 5. REPROVAR SOLICITAÇÃO (status 3 → 6) ──────────────────
// Encerra o fluxo. Bloqueia edição do pedido.
export async function reprovarSolicitacao(input: ReprovarSolicitacaoInput) {
  if (!input.justificativa?.trim()) {
    throw new Error('Justificativa é obrigatória para reprovar uma solicitação')
  }

  const motivo = await prisma.motivoAnaliseCpl.findUnique({
    where: { id: input.idMotivo },
  })

  if (!motivo) throw new Error('Motivo de reprovação inválido')
  if (!['REPROVACAO', 'AMBOS'].includes(motivo.tipo)) {
    throw new Error('Motivo informado não se aplica a reprovação')
  }

  if (motivo.codigo === 'OUTRO' && !input.motivoTexto?.trim()) {
    throw new Error('Campo de justificativa é obrigatório quando o motivo for "Outro"')
  }

  const pedido = await prisma.pedido.findFirst({
    where: { id: input.idPedido, idOrganizacao: input.idOrganizacao },
  })

  if (!pedido) throw new Error('Pedido não encontrado')
  if (pedido.status !== STATUS.EM_ANALISE_CPL) {
    throw new Error('Pedido deve estar Em análise Compras/CPL para ser reprovado')
  }

  const analise = await prisma.analiseCpl.findFirst({
    where: { idPedido: input.idPedido },
    orderBy: { versao: 'desc' },
  })

  if (!analise) throw new Error('Registro de análise CPL não encontrado')

  const [analiseAtualizada] = await prisma.$transaction([
    prisma.analiseCpl.update({
      where: { id: analise.id },
      data: {
        parecerTecnico:  input.justificativa,
        idMotivo:        input.idMotivo,
        motivoTexto:     input.motivoTexto,
        statusResultado: STATUS.REPROVADO,
        dataConclusao:   new Date(),
      },
    }),
    prisma.pedido.update({
      where: { id: input.idPedido },
      data:  { status: STATUS.REPROVADO },
    }),
  ])

  await registrarAuditoria({
    idPedido:    input.idPedido,
    idUsuario:   input.idAnalista,
    acao:        `Reprovado — ${motivo.descricao}: ${input.justificativa}`,
    valorAntes:  String(STATUS.EM_ANALISE_CPL),
    valorDepois: String(STATUS.REPROVADO),
    campo:       'status',
  })

  // TODO: notificar área demandante e registrar no histórico unificado

  return analiseAtualizada
}

// ── 6. VERIFICAR E MARCAR ATRASOS ────────────────────────────
// Executar periodicamente (cron) para marcar análises vencidas.
export async function verificarAtrasos(idOrganizacao: string) {
  const agora = new Date()

  const resultado = await prisma.analiseCpl.updateMany({
    where: {
      idOrganizacao,
      slaPrazo:     { lt: agora },
      emAtraso:     false,
      statusResultado: null, // ainda abertas
    },
    data: { emAtraso: true },
  })

  return { marcadas: resultado.count }
}

// ── 7. FILA DA CPL ────────────────────────────────────────────
// Lista pedidos que a CPL deve analisar, ordenados por prioridade.
export async function obterFilaCpl(idOrganizacao: string, filtros?: {
  idAnalista?: string
  emAtraso?:   boolean
  urgente?:    boolean
}) {
  const pedidos = await prisma.pedido.findMany({
    where: {
      idOrganizacao,
      status: { in: [STATUS.SUBMETIDO, STATUS.EM_ANALISE_CPL] },

    },
    include: {
      analisesCpl: {
        orderBy: { versao: 'desc' },
        take: 1,
      },
      itens: { select: { id: true } },
    },
    orderBy: [
      { criticidade: 'desc' },    // mais críticos primeiro
      { criadoEm: 'asc' },        // mais antigos primeiro
    ],
  })

  if (filtros?.emAtraso) {
    return pedidos.filter((p: any) =>
      p.analisesCpl[0]?.emAtraso === true
    )
  }

  return pedidos
}

// ── 8. DETALHE DA ANÁLISE ─────────────────────────────────────
// Retorna estado completo do pedido para a tela de análise CPL.
export async function obterDetalheAnalise(idPedido: string, idOrganizacao: string) {
  const pedido = await prisma.pedido.findFirst({
    where: { id: idPedido, idOrganizacao },
    include: {
      itens:          true,
      documentos:     true,
      analisesCpl: {
        include: {
          analista: { select: { id: true, nome: true, email: true } },
          motivo:   true,
        },
        orderBy: { versao: 'desc' },
      },
      auditorias: {
        orderBy: { criadoEm: 'desc' },
        take: 50,
      },
    },
  })

  if (!pedido) throw new Error('Pedido não encontrado')

  // Validação de documentos obrigatórios (para exibir na tela)
  const docs = pedido.documentos ?? []
  const pendenciasDocumentais = [
    { campo: 'DFD',       presente: docs.some(d => d.tipo === 'DFD'),       obrigatorio: true  },
    { campo: 'TR/PB',     presente: docs.some(d => ['TR','PB'].includes(d.tipo)), obrigatorio: true  },
    { campo: 'ETP',       presente: docs.some(d => d.tipo === 'ETP'),       obrigatorio: false },
    { campo: 'Estimativa',presente: docs.some(d => d.tipo === 'ESTIMATIVA'), obrigatorio: true  },
    { campo: 'Dotação',   presente: !!(pedido as any).dotacaoOrcamentaria,   obrigatorio: true  },
  ]

  const analiseAtual = pedido.analisesCpl[0] ?? null
  const exigeMatrizRisco = analiseAtual?.exigeMatrizRisco ??
    classificarContratacaoComplexa({
      valorTotal:         Number(pedido.valorTotal ?? 0),
      tipoPedido:         (pedido as any).tipoPedido,
      modalidadeSugerida: (pedido as any).modalidadeSugerida,
    })

  return {
    pedido,
    analiseAtual,
    historico:         pedido.analisesCpl,
    pendenciasDocumentais,
    exigeMatrizRisco,
    slaInfo: analiseAtual ? {
      prazo:    analiseAtual.slaPrazo,
      emAtraso: analiseAtual.emAtraso,
      diasRestantes: analiseAtual.slaPrazo
        ? Math.ceil((analiseAtual.slaPrazo.getTime() - Date.now()) / 86400000)
        : null,
    } : null,
  }
}

// ── 9. MOTIVOS DISPONÍVEIS ───────────────────────────────────
export async function listarMotivos(tipo?: 'DEVOLUCAO' | 'REPROVACAO') {
  return prisma.motivoAnaliseCpl.findMany({
    where: {
      ativo: true,
      ...(tipo && { tipo: { in: [tipo, 'AMBOS'] } }),
    },
    orderBy: { ordem: 'asc' },
  })
}
