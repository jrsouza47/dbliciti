// ============================================================
// SERVICE — Módulo PCA: Plano de Contratações Anual
// backend/src/modules/pca/plano.service.ts
// ============================================================

import prisma from '../../shared/prisma'
import { PLANO_STATUS } from './pca.constants'

// ── Criar (ou obter) o plano do exercício — versão 1, EM_ELABORACAO ─
export async function obterOuCriarPlanoDoAno(idOrganizacao: string, ano: number) {
  const existente = await prisma.planoContratacaoAnual.findFirst({
    where: { idOrganizacao, ano },
    orderBy: { versao: 'desc' },
  })
  if (existente) return existente

  return prisma.planoContratacaoAnual.create({
    data: { idOrganizacao, ano, versao: 1, status: PLANO_STATUS.EM_ELABORACAO },
  })
}

export async function listarPlanos(idOrganizacao: string) {
  return prisma.planoContratacaoAnual.findMany({
    where: { idOrganizacao },
    orderBy: [{ ano: 'desc' }, { versao: 'desc' }],
  })
}

export async function obterDetalhePlano(idPlano: string, idOrganizacao: string) {
  const plano = await prisma.planoContratacaoAnual.findFirst({
    where: { id: idPlano, idOrganizacao },
    include: {
      _count: { select: { dfds: true, itens: true } },
    },
  })
  if (!plano) throw new Error('Plano não encontrado')
  return plano
}

// ── Painel do PCA — números consolidados por unidade e corporativo ─
export async function obterPainel(idOrganizacao: string, idPlano: string) {
  const [totalDfds, dfdsPorStatus, totalItens, itensPorStatus, valorTotalItens] = await Promise.all([
    prisma.dfd.count({ where: { idOrganizacao, idPlano } }),
    prisma.dfd.groupBy({ by: ['status'], where: { idOrganizacao, idPlano }, _count: true }),
    prisma.itemPca.count({ where: { idOrganizacao, idPlano } }),
    prisma.itemPca.groupBy({ by: ['status'], where: { idOrganizacao, idPlano }, _count: true }),
    prisma.itemPca.aggregate({ where: { idOrganizacao, idPlano }, _sum: { valorTotal: true } }),
  ])

  return {
    totalDemandas: totalDfds,
    demandasPorStatus: dfdsPorStatus,
    totalItens,
    itensPorStatus,
    valorTotalPlanejado: valorTotalItens._sum.valorTotal ?? 0,
  }
}
