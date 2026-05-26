// ============================================================
// SERVICE — Módulo 3: Definição da Contratação
// backend/src/modules/definicao-contratacao/definicao-contratacao.service.ts
// ============================================================

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// ── Status do sistema de licitações ─────────────────────────
export const STATUS = {
  APROVADO_ANALISE:          23,  // Entrada no M3 (saída do M2)
  EM_DEFINICAO:              30,  // M3 recebeu → em definição
  DEFINICAO_CONCLUIDA:       31,  // Aprovado → segue para M4 (Análise Jurídica)
  REPROVADO:                  6,  // Encerrado (global)
  PENDENTE_AJUSTE_DEFINICAO: 32,  // Ajuste interno sem retornar etapa anterior
} as const

// SLA de referência de mercado (dias úteis)
const SLA_DIAS_UTEIS_SIMPLES  = 5
const SLA_DIAS_UTEIS_COMPLEXO = 10

// ── Tipos de entrada ─────────────────────────────────────────

export type Modalidade =
  | 'PREGAO'
  | 'CONCORRENCIA'
  | 'DISPENSA'
  | 'INEXIGIBILIDADE'
  | 'DIALOGO_COMPETITIVO'
  | 'LEILAO'

export type CriterioJulgamento =
  | 'MENOR_PRECO'
  | 'MAIOR_DESCONTO'
  | 'TECNICA_PRECO'
  | 'MELHOR_TECNICA'
  | 'MAIOR_RETORNO'

export type Estrategia =
  | 'SRP'
  | 'LOTE'
  | 'GLOBAL'
  | 'ITEM'
  | 'PARCELAMENTO'

export type FormaExecucao =
  | 'PRECO_GLOBAL'
  | 'PRECO_UNITARIO'
  | 'TAREFA'
  | 'INTEGRADA'
  | 'SEMI_INTEGRADA'

export interface ParametrosEdital {
  habilitacao?: {
    juridica?:             boolean | null
    regularidadeFiscal?:   boolean | null
    qualificacaoTecnica?:  boolean | null
    qualificacaoEconomica?: boolean | null
  }
  criteriosTecnicos?:     string | null
  qualificacaoEconomica?: string | null
  qualificacaoTecnica?:   string | null
}

export interface ReceberDefinicaoInput {
  idPedido:      string
  idOrganizacao: string
  idResponsavel: string
}

export interface SalvarDefinicaoInput {
  idPedido:      string
  idOrganizacao: string
  idResponsavel: string
  modalidade?:              Modalidade
  modalidadeJustificativa?: string
  criterioJulgamento?:      CriterioJulgamento
  criterioJustificativa?:   string
  estrategia?:              Estrategia
  estrategiaJustificativa?: string
  formaExecucao?:           FormaExecucao
  parametrosEdital?:        ParametrosEdital
  enquadramentoLegal?:      string
  justificativaLegal?:      string
  parecerTecnico?:          string
}

export interface ConcluirDefinicaoInput {
  idPedido:      string
  idOrganizacao: string
  idResponsavel: string
  parecerTecnico: string    // obrigatório na conclusão
  modalidade:              Modalidade
  modalidadeJustificativa: string
  criterioJulgamento:      CriterioJulgamento
  estrategia:              Estrategia
  parametrosEdital:        ParametrosEdital
  criterioJustificativa?:  string
  estrategiaJustificativa?: string
  formaExecucao?:          FormaExecucao
  enquadramentoLegal?:     string
  justificativaLegal?:     string
}

export interface AjusteInternoInput {
  idPedido:      string
  idOrganizacao: string
  idResponsavel: string
  pendencias:    string    // descrição do ajuste necessário
  motivoTexto?:  string
}

export interface ReprovarDefinicaoInput {
  idPedido:      string
  idOrganizacao: string
  idResponsavel: string
  motivoTexto:   string
  parecerTecnico: string
}

// ── Helpers ──────────────────────────────────────────────────

function calcularSlaPrazo(diasUteis: number): Date {
  const prazo = new Date()
  let adicionados = 0
  while (adicionados < diasUteis) {
    prazo.setDate(prazo.getDate() + 1)
    const dia = prazo.getDay()
    if (dia !== 0 && dia !== 6) adicionados++
  }
  return prazo
}

/**
 * Sugere modalidade automaticamente com base em tipo de objeto e valor.
 * Baseado nas regras da Lei 14.133/2021.
 */
function sugerirModalidade(pedido: {
  valorTotal?: number | null
  tipoPedido?: string | null
}): Modalidade {
  const valor = Number(pedido.valorTotal ?? 0)
  const tipo  = (pedido.tipoPedido ?? '').toUpperCase()

  // Limites de dispensa (Art. 75, I e II — Lei 14.133/2021)
  const LIMITE_DISPENSA_OBRAS     = 100_000
  const LIMITE_DISPENSA_OUTROS    = 50_000

  const ehObra = ['OBRA', 'SERVICO_ENGENHARIA'].includes(tipo)

  if (ehObra) {
    if (valor <= LIMITE_DISPENSA_OBRAS) return 'DISPENSA'
    return 'CONCORRENCIA'
  }

  // Bem/serviço comum
  if (valor <= LIMITE_DISPENSA_OUTROS) return 'DISPENSA'

  // Tipos que implicam inviabilidade de competição
  const tiposInexig = ['ARTISTA_CONSAGRADO', 'FORNECEDOR_EXCLUSIVO', 'SERVICO_TECNICO_ESPECIALIZADO']
  if (tiposInexig.includes(tipo)) return 'INEXIGIBILIDADE'

  // Padrão para bens/serviços comuns acima da faixa de dispensa
  return 'PREGAO'
}

/**
 * Valida consistência entre modalidade, critério e objeto.
 * Retorna lista de alertas (não bloqueia — cabe ao frontend decidir).
 */
function validarConsistencia(data: {
  modalidade?:       Modalidade
  criterioJulgamento?: CriterioJulgamento
  formaExecucao?:    FormaExecucao
  tipoPedido?:       string
}): string[] {
  const alertas: string[] = []
  const { modalidade, criterioJulgamento, formaExecucao, tipoPedido } = data
  const tipo = (tipoPedido ?? '').toUpperCase()
  const ehObra = ['OBRA', 'SERVICO_ENGENHARIA'].includes(tipo)

  if (modalidade === 'PREGAO' && criterioJulgamento === 'MELHOR_TECNICA')
    alertas.push('Pregão não admite critério de melhor técnica pura (Art. 36, §1º).')

  if (modalidade === 'PREGAO' && criterioJulgamento === 'MAIOR_RETORNO')
    alertas.push('Critério de maior retorno econômico não é usual para pregão.')

  if (criterioJulgamento === 'TECNICA_PRECO' && !data.criterioJulgamento)
    alertas.push('Técnica e preço exige justificativa obrigatória.')

  if (formaExecucao && !ehObra)
    alertas.push('Forma de execução é aplicável apenas a obras e serviços de engenharia.')

  if (modalidade === 'DISPENSA' || modalidade === 'INEXIGIBILIDADE') {
    // Enquadramento legal será exigido no frontend
  }

  return alertas
}

/**
 * Valida se todos os campos obrigatórios estão presentes antes de concluir.
 */
function validarCamposObrigatorios(data: Partial<ConcluirDefinicaoInput>): string[] {
  const erros: string[] = []
  if (!data.modalidade)              erros.push('Modalidade de contratação é obrigatória.')
  if (!data.modalidadeJustificativa) erros.push('Justificativa da modalidade é obrigatória.')
  if (!data.criterioJulgamento)      erros.push('Critério de julgamento é obrigatório.')
  if (!data.estrategia)              erros.push('Estratégia de contratação é obrigatória.')
  if (!data.parecerTecnico)          erros.push('Parecer técnico é obrigatório para concluir.')

  if (data.criterioJulgamento === 'TECNICA_PRECO' && !data.criterioJustificativa)
    erros.push('Critério técnica e preço exige justificativa.')

  if (data.estrategia === 'SRP' && !data.estrategiaJustificativa)
    erros.push('Uso de SRP exige indicação de demanda recorrente (justificativa).')

  if (data.estrategia === 'PARCELAMENTO' && !data.estrategiaJustificativa)
    erros.push('Parcelamento do objeto exige justificativa.')

  if ((data.modalidade === 'DISPENSA' || data.modalidade === 'INEXIGIBILIDADE') && !data.justificativaLegal)
    erros.push('Dispensa e Inexigibilidade exigem justificativa legal com enquadramento.')

  return erros
}

// ── Obter definição ativa de um pedido ───────────────────────
async function obterDefinicaoAtiva(idPedido: string, idOrganizacao: string) {
  return prisma.definicaoContratacao.findFirst({
    where: { idPedido, idOrganizacao },
    orderBy: { versao: 'desc' },
    include: { responsavel: { select: { id: true, nome: true, email: true } } },
  })
}

// ── Funções exportadas ───────────────────────────────────────

/**
 * Receber pedido aprovado da CPL → inicia Definição da Contratação.
 * Status 5 → 7
 */
export async function receberDefinicao(input: ReceberDefinicaoInput) {
  const { idPedido, idOrganizacao, idResponsavel } = input

  const pedido = await prisma.pedido.findFirst({
    where: { id: idPedido, idOrganizacao },
    select: { id: true, status: true, valorTotal: true },
  })
  if (!pedido) throw new Error('Pedido não encontrado.')
  if (pedido.status !== STATUS.APROVADO_ANALISE)
    throw new Error(`Pedido deve estar com status "Aprovado na análise inicial" (status ${STATUS.APROVADO_ANALISE}). Status atual: ${pedido.status}.`)

  // Verifica se já foi recebido (idempotência)
  const existing = await obterDefinicaoAtiva(idPedido, idOrganizacao)
  if (existing && existing.dataRecebimento)
    throw new Error('Este pedido já foi recebido pela etapa de Definição da Contratação.')

  const modalidadeSugerida = sugerirModalidade({
    valorTotal: pedido.valorTotal ? Number(pedido.valorTotal) : null,
    tipoPedido: null,
  })

  const isComplexo = Number(pedido.valorTotal ?? 0) >= 1_000_000
  const slaPrazo   = calcularSlaPrazo(isComplexo ? SLA_DIAS_UTEIS_COMPLEXO : SLA_DIAS_UTEIS_SIMPLES)

  const [definicao] = await prisma.$transaction([
    prisma.definicaoContratacao.create({
      data: {
        idPedido,
        idOrganizacao,
        idResponsavel,
        versao:            1,
        statusAnterior:    STATUS.APROVADO_ANALISE,
        modalidadeSugerida,
        dataRecebimento:   new Date(),
        slaPrazo,
      },
    }),
    prisma.pedido.update({
      where: { id: idPedido },
      data:  { status: STATUS.EM_DEFINICAO },
    }),
    prisma.auditoriaPedido.create({
      data: {
        idPedido,
        usuarioId:   idResponsavel,
        acao:        'DEFINICAO_RECEBIDA',
        campo:       'status',
        valorAntes:  String(STATUS.APROVADO_ANALISE),
        valorDepois: String(STATUS.EM_DEFINICAO),
      },
    }),
  ])

  return {
    mensagem:          'Pedido recebido. Definição da Contratação iniciada.',
    idDefinicao:       definicao.id,
    statusNovo:        STATUS.EM_DEFINICAO,
    modalidadeSugerida,
    slaPrazo,
  }
}

/**
 * Salvar definição como rascunho (sem alterar status).
 */
export async function salvarDefinicao(input: SalvarDefinicaoInput) {
  const { idPedido, idOrganizacao, idResponsavel, ...campos } = input

  const definicao = await obterDefinicaoAtiva(idPedido, idOrganizacao)
  if (!definicao) throw new Error('Definição não encontrada. Receba o pedido primeiro.')

  const pedido = await prisma.pedido.findFirst({
    where: { id: idPedido, idOrganizacao },
    select: { status: true },
  })
  if (pedido?.status !== STATUS.EM_DEFINICAO && pedido?.status !== STATUS.PENDENTE_AJUSTE_DEFINICAO)
    throw new Error('Pedido não está em etapa de Definição da Contratação.')

  // Validações de consistência (apenas alertas — não bloqueiam o salvar)
  const alertas = validarConsistencia({
    modalidade:         campos.modalidade,
    criterioJulgamento: campos.criterioJulgamento,
    formaExecucao:      campos.formaExecucao,
    tipoPedido:         undefined,
  })

  const updated = await prisma.definicaoContratacao.update({
    where: { id: definicao.id },
    data: {
      idResponsavel,
      ...(campos.modalidade              !== undefined && { modalidade: campos.modalidade }),
      ...(campos.modalidadeJustificativa !== undefined && { modalidadeJustificativa: campos.modalidadeJustificativa }),
      ...(campos.criterioJulgamento      !== undefined && { criterioJulgamento: campos.criterioJulgamento }),
      ...(campos.criterioJustificativa   !== undefined && { criterioJustificativa: campos.criterioJustificativa }),
      ...(campos.estrategia              !== undefined && { estrategia: campos.estrategia }),
      ...(campos.estrategiaJustificativa !== undefined && { estrategiaJustificativa: campos.estrategiaJustificativa }),
      ...(campos.formaExecucao           !== undefined && { formaExecucao: campos.formaExecucao }),
      ...(campos.parametrosEdital        !== undefined && { parametrosEdital: campos.parametrosEdital as any }),
      ...(campos.enquadramentoLegal      !== undefined && { enquadramentoLegal: campos.enquadramentoLegal }),
      ...(campos.justificativaLegal      !== undefined && { justificativaLegal: campos.justificativaLegal }),
      ...(campos.parecerTecnico          !== undefined && { parecerTecnico: campos.parecerTecnico }),
    },
  })

  return { mensagem: 'Definição salva.', idDefinicao: updated.id, alertas }
}

/**
 * Concluir definição → encaminha para M4 (Análise Jurídica).
 * Status 7 → 8
 */
export async function concluirDefinicao(input: ConcluirDefinicaoInput) {
  const { idPedido, idOrganizacao, idResponsavel, ...campos } = input

  const definicao = await obterDefinicaoAtiva(idPedido, idOrganizacao)
  if (!definicao) throw new Error('Definição não encontrada.')

  const pedido = await prisma.pedido.findFirst({
    where: { id: idPedido, idOrganizacao },
    select: { status: true },
  })
  if (pedido?.status !== STATUS.EM_DEFINICAO && pedido?.status !== STATUS.PENDENTE_AJUSTE_DEFINICAO)
    throw new Error('Pedido não está em etapa de Definição da Contratação.')

  // Validação de campos obrigatórios (bloqueia conclusão)
  const erros = validarCamposObrigatorios(campos)
  if (erros.length > 0) throw new Error(`Campos obrigatórios ausentes:\n• ${erros.join('\n• ')}`)

  const agora = new Date()

  await prisma.$transaction([
    prisma.definicaoContratacao.update({
      where: { id: definicao.id },
      data: {
        idResponsavel,
        modalidade:              campos.modalidade,
        modalidadeJustificativa: campos.modalidadeJustificativa,
        criterioJulgamento:      campos.criterioJulgamento,
        criterioJustificativa:   campos.criterioJustificativa,
        estrategia:              campos.estrategia,
        estrategiaJustificativa: campos.estrategiaJustificativa,
        formaExecucao:           campos.formaExecucao,
        parametrosEdital:        campos.parametrosEdital as any,
        enquadramentoLegal:      campos.enquadramentoLegal,
        justificativaLegal:      campos.justificativaLegal,
        parecerTecnico:          campos.parecerTecnico,
        statusAnterior:          pedido!.status,
        statusResultado:         STATUS.DEFINICAO_CONCLUIDA,
        dataConclusao:           agora,
      },
    }),
    prisma.pedido.update({
      where: { id: idPedido },
      data:  { status: STATUS.DEFINICAO_CONCLUIDA },
    }),
    prisma.auditoriaPedido.create({
      data: {
        idPedido,
        usuarioId:   idResponsavel,
        acao:        'DEFINICAO_CONCLUIDA',
        campo:       'status',
        valorAntes:  String(pedido!.status),
        valorDepois: String(STATUS.DEFINICAO_CONCLUIDA),
      },
    }),
  ])

  return {
    mensagem:    'Definição da Contratação concluída. Encaminhado para Análise Jurídica.',
    statusNovo:  STATUS.DEFINICAO_CONCLUIDA,
    dataConclusao: agora,
  }
}

/**
 * Solicitar ajuste interno (sem retornar à etapa anterior).
 * Status 7 → 13
 */
export async function ajusteInterno(input: AjusteInternoInput) {
  const { idPedido, idOrganizacao, idResponsavel, pendencias, motivoTexto } = input

  if (!pendencias?.trim()) throw new Error('Descrição das pendências é obrigatória.')

  const definicao = await obterDefinicaoAtiva(idPedido, idOrganizacao)
  if (!definicao) throw new Error('Definição não encontrada.')

  const pedido = await prisma.pedido.findFirst({
    where: { id: idPedido, idOrganizacao },
    select: { status: true },
  })
  if (pedido?.status !== STATUS.EM_DEFINICAO)
    throw new Error('Pedido deve estar "Em definição da contratação" para solicitar ajuste interno.')

  await prisma.$transaction([
    prisma.definicaoContratacao.update({
      where: { id: definicao.id },
      data:  { pendencias, motivoTexto, statusAnterior: STATUS.EM_DEFINICAO },
    }),
    prisma.pedido.update({
      where: { id: idPedido },
      data:  { status: STATUS.PENDENTE_AJUSTE_DEFINICAO },
    }),
    prisma.auditoriaPedido.create({
      data: {
        idPedido,
        usuarioId:   idResponsavel,
        acao:        'DEFINICAO_AJUSTE_INTERNO',
        campo:       'status',
        valorAntes:  String(STATUS.EM_DEFINICAO),
        valorDepois: String(STATUS.PENDENTE_AJUSTE_DEFINICAO),
      },
    }),
  ])

  return { mensagem: 'Ajuste interno registrado.', statusNovo: STATUS.PENDENTE_AJUSTE_DEFINICAO }
}

/**
 * Reprovar definição (erro grave ou inviabilidade).
 * Status 7|13 → 6
 */
export async function reprovarDefinicao(input: ReprovarDefinicaoInput) {
  const { idPedido, idOrganizacao, idResponsavel, motivoTexto, parecerTecnico } = input

  if (!motivoTexto?.trim())   throw new Error('Motivo da reprovação é obrigatório.')
  if (!parecerTecnico?.trim()) throw new Error('Parecer técnico é obrigatório na reprovação.')

  const definicao = await obterDefinicaoAtiva(idPedido, idOrganizacao)
  if (!definicao) throw new Error('Definição não encontrada.')

  const pedido = await prisma.pedido.findFirst({
    where: { id: idPedido, idOrganizacao },
    select: { status: true },
  })
  const statusValidos = [STATUS.EM_DEFINICAO, STATUS.PENDENTE_AJUSTE_DEFINICAO]
  if (!statusValidos.includes(pedido?.status as any))
    throw new Error('Pedido não está em etapa de Definição da Contratação.')

  const agora = new Date()

  await prisma.$transaction([
    prisma.definicaoContratacao.update({
      where: { id: definicao.id },
      data: {
        motivoTexto,
        parecerTecnico,
        statusAnterior:  pedido!.status,
        statusResultado: STATUS.REPROVADO,
        dataConclusao:   agora,
      },
    }),
    prisma.pedido.update({
      where: { id: idPedido },
      data:  { status: STATUS.REPROVADO },
    }),
    prisma.auditoriaPedido.create({
      data: {
        idPedido,
        usuarioId:   idResponsavel,
        acao:        'DEFINICAO_REPROVADA',
        campo:       'status',
        valorAntes:  String(pedido!.status),
        valorDepois: String(STATUS.REPROVADO),
      },
    }),
  ])

  return { mensagem: 'Definição reprovada. Processo encerrado.', statusNovo: STATUS.REPROVADO }
}

/**
 * Verificar e marcar pedidos em atraso (SLA).
 * Chamado via cron ou sob demanda.
 */
export async function verificarAtrasos(idOrganizacao: string): Promise<number> {
  const agora = new Date()
  const result = await prisma.definicaoContratacao.updateMany({
    where: {
      idOrganizacao,
      emAtraso:   false,
      slaPrazo:   { lt: agora },
      dataConclusao: null,
    },
    data: { emAtraso: true },
  })
  return result.count
}

// ── Consultas ────────────────────────────────────────────────

/**
 * Fila de pedidos no M3 (status 5 e 7 e 13).
 */
export async function obterFilaDefinicao(
  idOrganizacao: string,
  filtros?: { idResponsavel?: string; emAtraso?: boolean; urgente?: boolean }
) {
  const pedidos = await prisma.pedido.findMany({
    where: {
      idOrganizacao,
      status: { in: [STATUS.APROVADO_ANALISE, STATUS.EM_DEFINICAO, STATUS.PENDENTE_AJUSTE_DEFINICAO] }, // 23, 30, 32
      ...(filtros?.urgente && { criticidade: { gte: 2 } }),
    },
    orderBy: [{ criticidade: 'desc' }, { atualizadoEm: 'asc' }],
    include: {
      itens:      { take: 3, select: { quantidade: true, item: { select: { nome: true } } } },
      solicitante: { select: { nome: true } },
      definicoesContratacao: {
        orderBy: { versao: 'desc' },
        take: 1,
        where: filtros?.idResponsavel ? { idResponsavel: filtros.idResponsavel } : undefined,
        include: { responsavel: { select: { nome: true } } },
      },
    },
  })

  // Filtro em memória para emAtraso
  const lista = filtros?.emAtraso
    ? pedidos.filter(p => p.definicoesContratacao[0]?.emAtraso)
    : pedidos

  return lista.map(p => {
    const def = p.definicoesContratacao[0]
    return {
      id:                 p.id,
      numero:             p.numero,
      status:             p.status,
      criticidade:        p.criticidade,
      valorTotal:         Number(p.valorTotal),
      solicitante:        p.solicitante?.nome ?? null,
      responsavel:        def?.responsavel?.nome ?? null,
      modalidadeSugerida: def?.modalidadeSugerida ?? null,
      modalidade:         def?.modalidade ?? null,
      emAtraso:           def?.emAtraso ?? false,
      slaPrazo:           def?.slaPrazo ?? null,
      dataRecebimento:    def?.dataRecebimento ?? null,
      criadoEm:           p.criadoEm,
      atualizadoEm:       p.atualizadoEm,
      resumoItens:        p.itens.slice(0, 3).map(i => i.item?.nome ?? ''),
    }
  })
}

/**
 * Detalhe completo do pedido no M3.
 */
export async function obterDetalheDefinicao(idPedido: string, idOrganizacao: string) {
  const pedido = await prisma.pedido.findFirst({
    where: { id: idPedido, idOrganizacao },
    include: {
      itens:      { select: { quantidade: true, precoUnitario: true, observacao: true, item: { select: { nome: true, unidadeMedida: true } } } },
      solicitante: { select: { id: true, nome: true, email: true } },
      auditorias: {
        where: { acao: { startsWith: 'DEFINICAO' } },
        orderBy: { criadoEm: 'desc' },
        take: 10,
        include: { usuario: { select: { nome: true } } },
      },
      definicoesContratacao: {
        orderBy: { versao: 'desc' },
        take: 1,
        include: { responsavel: { select: { id: true, nome: true, email: true } } },
      },
    },
  })
  if (!pedido) throw new Error('Pedido não encontrado.')

  const def = pedido.definicoesContratacao[0] ?? null
  return { pedido, definicao: def }
}

/**
 * Consulta leve para sugestão automática + alertas de consistência.
 */
export async function consultarSugestao(idPedido: string, idOrganizacao: string) {
  const pedido = await prisma.pedido.findFirst({
    where: { id: idPedido, idOrganizacao },
    select: { valorTotal: true },
  })
  if (!pedido) throw new Error('Pedido não encontrado.')

  const sugestao = sugerirModalidade({
    valorTotal: pedido.valorTotal ? Number(pedido.valorTotal) : null,
    tipoPedido: null,
  })

  return { modalidadeSugerida: sugestao }
}
