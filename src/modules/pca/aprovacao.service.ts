// ============================================================
// SERVICE — Módulo PCA: Aprovação (Tela 6)
// backend/src/modules/pca/aprovacao.service.ts
// Nível único formal de aprovação (item 9.5 da norma), pela
// Autoridade Competente, até 1º de março do ano de elaboração.
// Alçada intermediária adicional é parametrizável por empresa
// (item 10.1) — quando habilitada e o item ultrapassa o valor
// configurado, exige uma aprovação prévia antes da decisão final.
// Segregação de funções (diretriz 8.1.9): quem elabora, consolida
// e aprova precisam ser pessoas distintas.
// ============================================================

import prisma from '../../shared/prisma'
import { ITEM_PCA_STATUS, DFD_STATUS } from './pca.constants'

type Decisao = 'APROVAR' | 'REPROVAR' | 'DEVOLVER'

async function lerAlcadaIntermediaria(idOrganizacao: string): Promise<{ habilitada: boolean; valor: number }> {
  const org = await prisma.organizacao.findUnique({
    where: { id: idOrganizacao },
    select: { configuracoes: true },
  })
  const config = (org?.configuracoes as Record<string, unknown>) ?? {}
  const habilitada = config.pcaAlcadaIntermediariaHabilitada === true
  const valor = typeof config.pcaAlcadaIntermediariaValor === 'number' ? config.pcaAlcadaIntermediariaValor : Infinity
  return { habilitada, valor }
}

async function obterItemDaOrganizacao(idItemPca: string, idOrganizacao: string) {
  const item = await prisma.itemPca.findFirst({
    where: { id: idItemPca, idOrganizacao },
    include: { dfdsOrigem: { select: { idSolicitante: true } } },
  })
  if (!item) throw new Error('Item PCA não encontrado')
  return item
}

function validarSegregacaoFuncoes(idUsuario: string, item: { idConsolidadoPor: string | null; dfdsOrigem: { idSolicitante: string }[] }) {
  if (item.idConsolidadoPor && item.idConsolidadoPor === idUsuario) {
    throw new Error('Segregação de funções: quem consolidou o item não pode decidir sua aprovação')
  }
  if (item.dfdsOrigem.some((d) => d.idSolicitante === idUsuario)) {
    throw new Error('Segregação de funções: quem elaborou uma das demandas de origem não pode decidir a aprovação do item')
  }
}

// ── Envio à fila de aprovação (GECOP → Autoridade Competente) ──
export async function enviarParaAprovacao(idItemPca: string, idOrganizacao: string) {
  const item = await obterItemDaOrganizacao(idItemPca, idOrganizacao)
  if (item.status !== ITEM_PCA_STATUS.EM_ELABORACAO) {
    throw new Error('Só é possível enviar para aprovação itens que ainda estão em elaboração')
  }
  if (item.exigeGestaoRisco) {
    const totalRiscos = await prisma.riscoItemPca.count({ where: { idItemPca } })
    if (totalRiscos === 0) {
      throw new Error('Este item exige ao menos um risco registrado antes de avançar para aprovação (item 9.4 da norma)')
    }
  }
  return prisma.itemPca.update({
    where: { id: idItemPca },
    data: { status: ITEM_PCA_STATUS.EM_APROVACAO },
  })
}

// ── Fila de aprovação ────────────────────────────────────────
export async function listarFilaAprovacao(idOrganizacao: string, idPlano?: string) {
  const itens = await prisma.itemPca.findMany({
    where: { idOrganizacao, idPlano, status: ITEM_PCA_STATUS.EM_APROVACAO },
    include: {
      dfdsOrigem: { include: { solicitante: { select: { id: true, nome: true } }, centroCusto: true } },
      consolidadoPor: { select: { id: true, nome: true } },
      riscos: true,
    },
    orderBy: [{ prioridade: 'desc' }, { valorTotal: 'desc' }],
  })

  const alcada = await lerAlcadaIntermediaria(idOrganizacao)

  return itens.map((item) => ({
    ...item,
    precisaAprovacaoIntermediaria:
      alcada.habilitada && Number(item.valorTotal) >= alcada.valor && !item.idAprovadorIntermediario,
  }))
}

// ── Aprovação intermediária (opcional, parametrizável por empresa) ──
export async function decidirAprovacaoIntermediaria(idItemPca: string, input: { idOrganizacao: string; idUsuario: string }) {
  const item = await obterItemDaOrganizacao(idItemPca, input.idOrganizacao)
  if (item.status !== ITEM_PCA_STATUS.EM_APROVACAO) {
    throw new Error('Item não está na fila de aprovação')
  }
  validarSegregacaoFuncoes(input.idUsuario, item)

  const alcada = await lerAlcadaIntermediaria(input.idOrganizacao)
  if (!alcada.habilitada || Number(item.valorTotal) < alcada.valor) {
    throw new Error('Este item não exige aprovação intermediária')
  }
  if (item.idAprovadorIntermediario) {
    throw new Error('Aprovação intermediária já registrada para este item')
  }

  return prisma.itemPca.update({
    where: { id: idItemPca },
    data: { idAprovadorIntermediario: input.idUsuario, dataAprovacaoIntermediaria: new Date() },
  })
}

// ── Decisão final — Autoridade Competente ────────────────────
export async function decidirAprovacao(idItemPca: string, input: {
  idOrganizacao: string; idUsuario: string; decisao: Decisao; motivo?: string
}) {
  const item = await obterItemDaOrganizacao(idItemPca, input.idOrganizacao)
  if (item.status !== ITEM_PCA_STATUS.EM_APROVACAO) {
    throw new Error('Item não está na fila de aprovação')
  }
  validarSegregacaoFuncoes(input.idUsuario, item)

  const alcada = await lerAlcadaIntermediaria(input.idOrganizacao)
  const exigeIntermediaria = alcada.habilitada && Number(item.valorTotal) >= alcada.valor
  if (exigeIntermediaria && !item.idAprovadorIntermediario) {
    throw new Error('Este item exige aprovação intermediária antes da decisão da Autoridade Competente')
  }

  if (input.decisao === 'APROVAR') {
    return prisma.itemPca.update({
      where: { id: idItemPca },
      data: {
        status: ITEM_PCA_STATUS.APROVADO,
        idAprovador: input.idUsuario,
        dataAprovacao: new Date(),
        parecerAprovacao: input.motivo?.trim() || null,
      },
    })
  }

  // Reprovar e devolver exigem motivo (o formulário sempre pede;
  // aqui é a validação de servidor equivalente).
  if (!input.motivo?.trim()) {
    throw new Error('Informe o motivo para reprovar ou devolver o item')
  }

  if (input.decisao === 'REPROVAR') {
    // A demanda também precisa saber que foi reprovada — diferente do
    // "devolver", aqui é definitivo: fica visível com o motivo, mas não
    // volta a ser editável (não tem "reenviar" nesse status).
    await prisma.dfd.updateMany({
      where: { idItemPca },
      data: { status: DFD_STATUS.REJEITADO, motivoDevolucao: input.motivo.trim(), idItemPca: null },
    })
    await prisma.riscoItemPca.deleteMany({ where: { idItemPca } })
    await prisma.itemPca.delete({ where: { id: idItemPca } })
    return { reprovado: true }
  }

  // SOLICITAR AJUSTE — a demanda de origem volta para Rascunho (não é
  // um status à parte), com o comentário anexado, para quem elaborou
  // ajustar e reenviar pelo mesmo fluxo de sempre.
  await prisma.dfd.updateMany({
    where: { idItemPca },
    data: { status: DFD_STATUS.RASCUNHO, motivoDevolucao: input.motivo.trim(), idItemPca: null },
  })
  await prisma.riscoItemPca.deleteMany({ where: { idItemPca } })
  await prisma.itemPca.delete({ where: { id: idItemPca } })
  return { ajusteSolicitado: true }
}
