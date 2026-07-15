// ============================================================
// SERVICE — Módulo PCA: Gestão de riscos (Tela 5)
// backend/src/modules/pca/risco.service.ts
// Decorre da diretriz 8.1.10 da norma — gestão de riscos por Item PCA.
// ============================================================

import prisma from '../../shared/prisma'
import { ITEM_PCA_STATUS, PROBABILIDADE_RISCO, IMPACTO_RISCO } from './pca.constants'

interface CriarRiscoInput {
  idOrganizacao: string
  idItemPca: string
  hipotese: string
  probabilidade: number
  impacto: number
  medidaPreventiva: string
  medidaMitigadora: string
  idResponsavel?: string
}

const VALORES_VALIDOS = [PROBABILIDADE_RISCO.BAIXA, PROBABILIDADE_RISCO.MEDIA, PROBABILIDADE_RISCO.ALTA]

async function obterItemDaOrganizacao(idItemPca: string, idOrganizacao: string) {
  const item = await prisma.itemPca.findFirst({ where: { id: idItemPca, idOrganizacao } })
  if (!item) throw new Error('Item PCA não encontrado')
  return item
}

// ── Listagem ───────────────────────────────────────────────────
export async function listarRiscosItemPca(idItemPca: string, idOrganizacao: string) {
  await obterItemDaOrganizacao(idItemPca, idOrganizacao)
  return prisma.riscoItemPca.findMany({
    where: { idItemPca },
    include: { responsavel: { select: { id: true, nome: true } } },
    orderBy: { criadoEm: 'asc' },
  })
}

// ── Criação ──────────────────────────────────────────────────
export async function criarRiscoItemPca(input: CriarRiscoInput) {
  if (!input.hipotese?.trim()) throw new Error('Hipótese de risco é obrigatória')
  if (!input.medidaPreventiva?.trim()) throw new Error('Medida preventiva é obrigatória')
  if (!input.medidaMitigadora?.trim()) throw new Error('Medida de mitigação é obrigatória')
  if (!VALORES_VALIDOS.includes(input.probabilidade as any)) throw new Error('Probabilidade inválida')
  if (!VALORES_VALIDOS.includes(input.impacto as any)) throw new Error('Impacto inválido')

  const item = await obterItemDaOrganizacao(input.idItemPca, input.idOrganizacao)

  // Itens já publicados ou rejeitados são estados finais — não faz
  // sentido acrescentar hipótese de risco depois deles.
  if (item.status === ITEM_PCA_STATUS.PUBLICADO || item.status === ITEM_PCA_STATUS.REJEITADO) {
    throw new Error('Não é possível registrar risco para um item publicado ou rejeitado')
  }

  return prisma.riscoItemPca.create({
    data: {
      idItemPca: input.idItemPca,
      hipotese: input.hipotese.trim(),
      probabilidade: input.probabilidade,
      impacto: input.impacto,
      medidaPreventiva: input.medidaPreventiva.trim(),
      medidaMitigadora: input.medidaMitigadora.trim(),
      idResponsavel: input.idResponsavel,
    },
    include: { responsavel: { select: { id: true, nome: true } } },
  })
}

// ── Exclusão ─────────────────────────────────────────────────
// Permitida apenas enquanto o item ainda não foi enviado à aprovação,
// para não desmontar a justificativa de um risco já considerado.
export async function excluirRiscoItemPca(idRisco: string, idOrganizacao: string) {
  const risco = await prisma.riscoItemPca.findUnique({
    where: { id: idRisco },
    include: { itemPca: true },
  })
  if (!risco || risco.itemPca.idOrganizacao !== idOrganizacao) throw new Error('Risco não encontrado')
  if (risco.itemPca.status !== ITEM_PCA_STATUS.EM_ELABORACAO) {
    throw new Error('Só é possível excluir um risco enquanto o item está em elaboração')
  }
  await prisma.riscoItemPca.delete({ where: { id: idRisco } })
  return { excluido: true }
}
