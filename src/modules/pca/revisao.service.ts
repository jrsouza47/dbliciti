// ============================================================
// SERVICE — Módulo PCA: Revisão e redimensionamento (Tela 10)
// backend/src/modules/pca/revisao.service.ts
//
// Item 9.8 da norma: inclusão, exclusão ou redimensionamento de itens só
// nas janelas previstas, com aprovação da Autoridade Competente e nova
// divulgação da versão atualizada no sítio eletrônico. Decisão registrada
// com o cliente (jul/2026): cada revisão aprovada cria uma NOVA linha em
// plano_contratacao_anual (mesmo ano, versão +1) — histórico completo
// preservado, cada versão consultável separadamente (alimenta a Tela 11).
//
// Limitação conhecida: os itens clonados para a nova versão não carregam
// o vínculo com as demandas de origem (dfdsOrigem) — por isso o centro de
// custo não aparece quebrado por setor em versões >1 (fica em branco nas
// telas que dependem disso, como Monitor PNCP). O valor/situação de
// execução são preservados normalmente.
// ============================================================

import prisma from '../../shared/prisma'
import {
  ITEM_PCA_STATUS, PLANO_STATUS,
  TIPO_ALTERACAO_REVISAO, STATUS_REVISAO, TIPO_JANELA_REVISAO,
  dentroJanelaRevisao,
} from './pca.constants'
import { gerarNumeroItemPca } from './consolidacao.service'

const ITENS_VIGENTES = [ITEM_PCA_STATUS.APROVADO, ITEM_PCA_STATUS.PUBLICADO]

// ── Listar propostas de revisão do plano vigente ──────────────────────────
export async function listarPropostas(idOrganizacao: string, idPlano: string) {
  return prisma.revisaoPca.findMany({
    where: { idOrganizacao, idPlano },
    include: {
      item: { select: { id: true, numero: true, descricaoObjeto: true } },
      solicitante: { select: { id: true, nome: true } },
      aprovador: { select: { id: true, nome: true } },
    },
    orderBy: { criadoEm: 'desc' },
  })
}

function descreverAlteracao(params: {
  tipoAlteracao: string
  descricaoItem: string
  valorAnterior?: number | null
  novoValor?: number | null
}): string {
  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  if (params.tipoAlteracao === TIPO_ALTERACAO_REVISAO.INCLUSAO) {
    return `Inclusão: ${params.descricaoItem} — ${fmt(params.novoValor ?? 0)}`
  }
  if (params.tipoAlteracao === TIPO_ALTERACAO_REVISAO.EXCLUSAO) {
    return `Exclusão: ${params.descricaoItem} (${fmt(params.valorAnterior ?? 0)})`
  }
  return `Redimensionamento: ${params.descricaoItem} de ${fmt(params.valorAnterior ?? 0)} para ${fmt(params.novoValor ?? 0)}`
}

// ── Criar proposta de alteração ───────────────────────────────────────────
export async function criarProposta(input: {
  idOrganizacao: string
  idPlano: string
  idSolicitante: string
  tipoAlteracao: string
  idItemPca?: string
  descricaoNovoItem?: string
  tipoObjetoNovoItem?: string
  unidadeFornecimentoNovoItem?: string
  quantidadeNovoItem?: number
  novoValor: number
  motivo: string
  justificativaForaJanela?: string
}) {
  if (!Object.values(TIPO_ALTERACAO_REVISAO).includes(input.tipoAlteracao as any)) {
    throw new Error('Tipo de alteração inválido')
  }

  const plano = await prisma.planoContratacaoAnual.findFirst({
    where: { id: input.idPlano, idOrganizacao: input.idOrganizacao },
  })
  if (!plano) throw new Error('Plano não encontrado')

  const dentroJanela = dentroJanelaRevisao()
  if (!dentroJanela && !input.justificativaForaJanela?.trim()) {
    throw new Error(
      'Fora das janelas de revisão (1-30/set ou 16-30/nov) — informe a justificativa ' +
      '(ex.: dentro dos 15 dias após aprovação da LDO) para prosseguir (item 9.8 da norma)'
    )
  }

  let item: { id: string; descricaoObjeto: string; valorTotal: any; status: number } | null = null
  if (input.tipoAlteracao !== TIPO_ALTERACAO_REVISAO.INCLUSAO) {
    if (!input.idItemPca) throw new Error('Selecione o item a alterar')
    item = await prisma.itemPca.findFirst({
      where: { id: input.idItemPca, idOrganizacao: input.idOrganizacao, idPlano: input.idPlano },
    })
    if (!item) throw new Error('Item do PCA não encontrado nesta versão do plano')
    if (!ITENS_VIGENTES.includes(item.status as any)) {
      throw new Error('Só é possível propor alteração em itens já Aprovados ou Publicados')
    }
  } else {
    if (!input.descricaoNovoItem?.trim()) throw new Error('Descreva o novo item')
    if (!input.tipoObjetoNovoItem) throw new Error('Informe o tipo do objeto do novo item')
    if (!input.unidadeFornecimentoNovoItem) throw new Error('Informe a unidade de fornecimento do novo item')
  }

  const descricaoAlteracoes = descreverAlteracao({
    tipoAlteracao: input.tipoAlteracao,
    descricaoItem: item?.descricaoObjeto ?? input.descricaoNovoItem ?? '',
    valorAnterior: item ? Number(item.valorTotal) : null,
    novoValor: input.novoValor,
  })

  return prisma.revisaoPca.create({
    data: {
      idOrganizacao: input.idOrganizacao,
      idPlano: input.idPlano,
      idItemPca: item?.id,
      tipoAlteracao: input.tipoAlteracao,
      tipoJanela: dentroJanela ? TIPO_JANELA_REVISAO.SET_NOV : TIPO_JANELA_REVISAO.POS_LDO,
      motivo: input.motivo,
      descricaoAlteracoes,
      descricaoNovoItem: input.descricaoNovoItem,
      valorAnterior: item ? Number(item.valorTotal) : null,
      novoValor: input.novoValor,
      status: STATUS_REVISAO.EM_APROVACAO,
      foraDaJanela: !dentroJanela,
      justificativaForaJanela: input.justificativaForaJanela,
      idSolicitante: input.idSolicitante,
    },
  })
}

// ── Clonar os itens vigentes do plano antigo para a nova versão ──────────
async function clonarItensParaNovaVersao(params: {
  idOrganizacao: string
  idPlanoAntigo: string
  ano: number
  idPlanoNovo: string
  proposta: {
    tipoAlteracao: string
    idItemPca: string | null
    novoValor: any
    descricaoNovoItem: string | null
    tipoObjetoNovoItem?: string
    unidadeFornecimentoNovoItem?: string
    quantidadeNovoItem?: number
  }
}) {
  const itensAntigos = await prisma.itemPca.findMany({
    where: { idPlano: params.idPlanoAntigo, status: { in: ITENS_VIGENTES } },
  })

  for (const item of itensAntigos) {
    const ehExcluido = params.proposta.tipoAlteracao === TIPO_ALTERACAO_REVISAO.EXCLUSAO && item.id === params.proposta.idItemPca
    if (ehExcluido) continue

    const ehAlvoRedimensionado = params.proposta.tipoAlteracao === TIPO_ALTERACAO_REVISAO.REDIMENSIONAMENTO && item.id === params.proposta.idItemPca
    const novoNumero = await gerarNumeroItemPca(params.idOrganizacao, params.ano)

    await prisma.itemPca.create({
      data: {
        idOrganizacao: params.idOrganizacao,
        idPlano: params.idPlanoNovo,
        numero: novoNumero,
        tipoObjeto: item.tipoObjeto,
        descricaoObjeto: item.descricaoObjeto,
        idItemCatalogo: item.idItemCatalogo,
        unidadeFornecimento: item.unidadeFornecimento,
        quantidadeTotal: item.quantidadeTotal,
        valorTotal: ehAlvoRedimensionado ? params.proposta.novoValor : item.valorTotal,
        prioridade: item.prioridade,
        dataDesejada: item.dataDesejada,
        status: item.status,
        idAprovador: item.idAprovador,
        dataAprovacao: item.dataAprovacao,
        situacaoExecucao: item.situacaoExecucao,
      },
    })
  }

  if (params.proposta.tipoAlteracao === TIPO_ALTERACAO_REVISAO.INCLUSAO) {
    const novoNumero = await gerarNumeroItemPca(params.idOrganizacao, params.ano)
    await prisma.itemPca.create({
      data: {
        idOrganizacao: params.idOrganizacao,
        idPlano: params.idPlanoNovo,
        numero: novoNumero,
        tipoObjeto: params.proposta.tipoObjetoNovoItem ?? 'BEM',
        descricaoObjeto: params.proposta.descricaoNovoItem ?? '',
        unidadeFornecimento: params.proposta.unidadeFornecimentoNovoItem ?? 'UN',
        quantidadeTotal: params.proposta.quantidadeNovoItem ?? 1,
        valorTotal: params.proposta.novoValor,
        prioridade: 2,
        status: ITEM_PCA_STATUS.APROVADO,
        dataAprovacao: new Date(),
      },
    })
  }
}

// ── Decidir proposta (Autoridade Competente) ──────────────────────────────
export async function decidirProposta(id: string, params: {
  idOrganizacao: string; idUsuario: string; decisao: 'APROVAR' | 'REJEITAR'; parecer?: string
}) {
  const proposta = await prisma.revisaoPca.findFirst({
    where: { id, idOrganizacao: params.idOrganizacao },
    include: { plano: true },
  })
  if (!proposta) throw new Error('Proposta não encontrada')
  if (proposta.status !== STATUS_REVISAO.EM_APROVACAO) {
    throw new Error('Esta proposta já foi decidida')
  }

  // Segregação de funções: quem propôs não pode decidir a própria proposta
  if (proposta.idSolicitante === params.idUsuario) {
    throw new Error('Segregação de funções: quem propôs a alteração não pode decidir a própria aprovação')
  }

  if (params.decisao === 'REJEITAR') {
    return prisma.revisaoPca.update({
      where: { id },
      data: { status: STATUS_REVISAO.REJEITADO, idAprovador: params.idUsuario, dataAprovacao: new Date() },
    })
  }

  // APROVAR — cria a nova versão do plano e clona os itens
  const planoAntigo = proposta.plano
  const novaVersao = planoAntigo.versao + 1

  const planoNovo = await prisma.planoContratacaoAnual.create({
    data: {
      idOrganizacao: params.idOrganizacao,
      ano: planoAntigo.ano,
      versao: novaVersao,
      status: planoAntigo.status,
      idAprovador: params.idUsuario,
      dataAprovacao: new Date(),
    },
  })

  await clonarItensParaNovaVersao({
    idOrganizacao: params.idOrganizacao,
    idPlanoAntigo: planoAntigo.id,
    ano: planoAntigo.ano,
    idPlanoNovo: planoNovo.id,
    proposta: {
      tipoAlteracao: proposta.tipoAlteracao,
      idItemPca: proposta.idItemPca,
      novoValor: proposta.novoValor,
      descricaoNovoItem: proposta.descricaoNovoItem,
    },
  })

  return prisma.revisaoPca.update({
    where: { id },
    data: {
      status: STATUS_REVISAO.APROVADO,
      idAprovador: params.idUsuario,
      dataAprovacao: new Date(),
      versaoResultante: novaVersao,
    },
  })
}

// ── Publicar a versão revisada no sítio (item 9.8 — nova divulgação obrigatória) ─
export async function publicarRevisaoNoSitio(id: string, idOrganizacao: string) {
  const revisao = await prisma.revisaoPca.findFirst({ where: { id, idOrganizacao } })
  if (!revisao) throw new Error('Revisão não encontrada')
  if (revisao.status !== STATUS_REVISAO.APROVADO) throw new Error('Só é possível publicar revisões aprovadas')

  return prisma.revisaoPca.update({
    where: { id },
    data: { dataPublicacaoSitio: new Date() },
  })
}

// ── Histórico de versões do plano (Tela 11) ───────────────────────────────
export async function listarHistoricoVersoes(idOrganizacao: string, ano: number) {
  const versoes = await prisma.planoContratacaoAnual.findMany({
    where: { idOrganizacao, ano },
    orderBy: { versao: 'asc' },
    include: { _count: { select: { itens: true } } },
  })

  const revisoes = await prisma.revisaoPca.findMany({
    where: { idOrganizacao, versaoResultante: { not: null }, plano: { ano } },
    include: { item: { select: { numero: true, descricaoObjeto: true } } },
  })

  return versoes.map((v) => ({
    ...v,
    revisaoOrigem: revisoes.find((r) => r.versaoResultante === v.versao) ?? null,
  }))
}
