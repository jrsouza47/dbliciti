// ============================================================
// SERVICE — Módulo PCA: Sugestões de IA
// backend/src/modules/pca/sugestao-ia.service.ts
// Disparado automaticamente no envio da demanda (item 9.2 da spec)
// ============================================================

import prisma from '../../shared/prisma'
import { PERIODO_PADRAO_SUGESTAO_PRECO_DIAS } from './pca.constants'

// ── Similaridade textual simples (sem dependência externa) ───
// Sobreposição de palavras normalizada — suficiente para sinalizar
// candidatos; a decisão final é sempre humana (CPLIC / solicitante).
function similaridade(a: string, b: string): number {
  const normalizar = (t: string) =>
    t.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').split(/\W+/).filter(Boolean)
  const setA = new Set(normalizar(a))
  const setB = new Set(normalizar(b))
  if (setA.size === 0 || setB.size === 0) return 0
  let intersecao = 0
  for (const palavra of setA) if (setB.has(palavra)) intersecao++
  return intersecao / Math.max(setA.size, setB.size)
}

// ── Sugestão de preço com base no histórico ──────────────────
async function sugerirPreco(idDfd: string, idItemCatalogo: string | null) {
  if (!idItemCatalogo) return null

  const desde = new Date()
  desde.setDate(desde.getDate() - PERIODO_PADRAO_SUGESTAO_PRECO_DIAS)

  const precos = await prisma.precoReferencia.findMany({
    where: { idItem: idItemCatalogo, dataReferencia: { gte: desde } },
    orderBy: { dataReferencia: 'desc' },
    take: 20,
  })
  if (precos.length === 0) return null

  const media = precos.reduce((soma, p) => soma + Number(p.valor), 0) / precos.length

  return prisma.sugestaoIaDfd.create({
    data: {
      idDfd,
      tipo: 'PRECO',
      status: 'PENDENTE',
      precoSugerido: media,
      fontePreco: `Média de ${precos.length} preço(s) de referência — últimos ${PERIODO_PADRAO_SUGESTAO_PRECO_DIAS} dias`,
      justificativaIa: 'Valor calculado a partir do histórico de preços de referência do item no Catálogo (M1)',
    },
  })
}

// ── Detecção de duplicidade / possibilidade de agregação ─────
async function detectarDuplicidadeOuAgregacao(dfd: {
  id: string
  idOrganizacao: string
  idPlano: string
  tipoObjeto: string
  idItemCatalogo: string | null
  descricaoObjeto: string
}) {
  const candidatas = await prisma.dfd.findMany({
    where: {
      idOrganizacao: dfd.idOrganizacao,
      idPlano: dfd.idPlano,
      tipoObjeto: dfd.tipoObjeto,
      id: { not: dfd.id },
      status: { in: [1, 2] }, // RASCUNHO ou ENVIADO — ainda não consolidadas
      idItemPca: null,
    },
    select: { id: true, numero: true, descricaoObjeto: true, idItemCatalogo: true },
    take: 200,
  })
  if (candidatas.length === 0) return null

  const relacionadas = candidatas
    .map((c) => ({
      idDfd: c.id,
      numero: c.numero,
      descricaoObjeto: c.descricaoObjeto,
      scoreSimilaridade: c.idItemCatalogo && c.idItemCatalogo === dfd.idItemCatalogo
        ? 1
        : similaridade(c.descricaoObjeto, dfd.descricaoObjeto),
    }))
    .filter((c) => c.scoreSimilaridade >= 0.4)
    .sort((a, b) => b.scoreSimilaridade - a.scoreSimilaridade)
    .slice(0, 10)

  if (relacionadas.length === 0) return null

  const possivelDuplicidade = relacionadas.some((r) => r.scoreSimilaridade >= 0.9)
  const tipo = possivelDuplicidade ? 'DUPLICIDADE' : 'AGREGACAO'

  return prisma.sugestaoIaDfd.create({
    data: {
      idDfd: dfd.id,
      tipo,
      status: 'PENDENTE',
      dfdsRelacionadas: relacionadas,
      justificativaIa: possivelDuplicidade
        ? 'Demanda muito semelhante a outra já lançada — possível duplicidade'
        : 'Demandas de mesma natureza identificadas — candidatas à agregação pela CPLIC',
    },
  })
}

// ── Orquestrador — chamado no envio da demanda ───────────────
export async function gerarSugestoesParaDfd(idDfd: string) {
  const dfd = await prisma.dfd.findUnique({ where: { id: idDfd } })
  if (!dfd) throw new Error('Demanda não encontrada')

  const resultados = await Promise.all([
    sugerirPreco(dfd.id, dfd.idItemCatalogo),
    detectarDuplicidadeOuAgregacao(dfd),
  ])
  return resultados.filter(Boolean)
}

// ── Listagem de sugestões pendentes ──────────────────────────
export async function listarSugestoesPendentes(idOrganizacao: string, filtros: { idPlano?: string; tipo?: string }) {
  return prisma.sugestaoIaDfd.findMany({
    where: {
      status: 'PENDENTE',
      dfd: { idOrganizacao, idPlano: filtros.idPlano },
      tipo: filtros.tipo,
    },
    include: { dfd: { select: { id: true, numero: true, descricaoObjeto: true, valorEstimado: true } } },
    orderBy: { criadoEm: 'desc' },
  })
}

// ── Decisão do usuário responsável ───────────────────────────
// "Sugestão rejeitada não é reaplicada automaticamente" (item 9.2)
export async function decidirSugestao(idSugestao: string, input: {
  idOrganizacao: string
  idUsuario: string
  decisao: 'ACEITA' | 'REJEITADA'
  motivoRejeicao?: string
}) {
  const sugestao = await prisma.sugestaoIaDfd.findFirst({
    where: { id: idSugestao, dfd: { idOrganizacao: input.idOrganizacao } },
    include: { dfd: true },
  })
  if (!sugestao) throw new Error('Sugestão não encontrada')
  if (sugestao.status !== 'PENDENTE') throw new Error('Sugestão já foi decidida')

  if (input.decisao === 'REJEITADA' && !input.motivoRejeicao) {
    throw new Error('Motivo da rejeição é obrigatório')
  }

  const atualizada = await prisma.sugestaoIaDfd.update({
    where: { id: idSugestao },
    data: {
      status: input.decisao,
      idDecisorUsuario: input.idUsuario,
      dataDecisao: new Date(),
      motivoRejeicao: input.decisao === 'REJEITADA' ? input.motivoRejeicao : null,
    },
  })

  // Aceitar sugestão de preço atualiza a estimativa da demanda (preço x quantidade)
  if (input.decisao === 'ACEITA' && sugestao.tipo === 'PRECO' && sugestao.precoSugerido) {
    await prisma.dfd.update({
      where: { id: sugestao.idDfd },
      data: { valorEstimado: Number(sugestao.precoSugerido) * Number(sugestao.dfd.quantidade) },
    })
  }

  // Duplicidade/agregação aceita não funde automaticamente — apenas sinaliza
  // para a tela de Consolidação (CPLIC), que decide como agrupar (item 9.3)

  return atualizada
}
