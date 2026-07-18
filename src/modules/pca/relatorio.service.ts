// ============================================================
// SERVICE — Módulo PCA: Relatórios de execução (Tela 9)
// backend/src/modules/pca/relatorio.service.ts
//
// Item 9.7 da norma: quem acompanha o PCA (GECOP) declara manualmente o
// andamento de cada item — no prazo, atrasado ou executado. Não vem do
// Benner nem é derivado do status do Pedido no M2 (confirmado com a
// Terracap em jul/2026). Este service também gera os dois relatórios
// previstos no item 9.9: o trimestral (interno, GECOP -> Autoridade
// Competente) e o simplificado (público, no sítio eletrônico, em até 15
// dias corridos após a aprovação).
// ============================================================

import PDFDocument from 'pdfkit'
import prisma from '../../shared/prisma'
import { ITEM_PCA_STATUS, SITUACAO_EXECUCAO, TIPO_RELATORIO_PCA } from './pca.constants'

const SITUACAO_LABEL: Record<string, string> = {
  NO_PRAZO: 'No prazo',
  ATRASADO: 'Atrasado',
  EXECUTADO: 'Executado',
}

// ── Itens elegíveis para acompanhamento de execução ───────────────────────
// Só itens já Aprovados ou Publicados entram no relatório — não faz
// sentido "executar" algo que ainda está em elaboração/aprovação.
async function buscarItensExecucao(idOrganizacao: string, idPlano: string) {
  return prisma.itemPca.findMany({
    where: {
      idOrganizacao, idPlano,
      status: { in: [ITEM_PCA_STATUS.APROVADO, ITEM_PCA_STATUS.PUBLICADO] },
    },
    select: {
      id: true, numero: true, descricaoObjeto: true, valorTotal: true,
      situacaoExecucao: true, dataAtualizacaoExecucao: true,
      atualizadoExecucaoPorUsuario: { select: { id: true, nome: true } },
    },
    orderBy: { numero: 'asc' },
  })
}

function calcularResumo(itens: { valorTotal: any; situacaoExecucao: string | null }[]) {
  const itensTotal = itens.length
  const executados = itens.filter(i => i.situacaoExecucao === SITUACAO_EXECUCAO.EXECUTADO)
  const itensExecutados = executados.length
  const valorTotal = itens.reduce((acc, i) => acc + Number(i.valorTotal), 0)
  const valorExecutado = executados.reduce((acc, i) => acc + Number(i.valorTotal), 0)
  const percentual = itensTotal > 0 ? (itensExecutados / itensTotal) * 100 : 0
  return { itensExecutados, itensTotal, valorExecutado, valorTotal, percentual }
}

export async function listarItensExecucao(idOrganizacao: string, idPlano: string) {
  const itens = await buscarItensExecucao(idOrganizacao, idPlano)
  return { itens, resumo: calcularResumo(itens) }
}

// ── Atualizar situação de execução de um item (declaração manual) ────────
export async function atualizarSituacaoExecucao(
  idItemPca: string,
  params: { idOrganizacao: string; idUsuario: string; situacao: string }
) {
  if (!Object.values(SITUACAO_EXECUCAO).includes(params.situacao as any)) {
    throw new Error('Situação de execução inválida')
  }

  const item = await prisma.itemPca.findFirst({ where: { id: idItemPca, idOrganizacao: params.idOrganizacao } })
  if (!item) throw new Error('Item do PCA não encontrado')
  if (![ITEM_PCA_STATUS.APROVADO, ITEM_PCA_STATUS.PUBLICADO].includes(item.status as any)) {
    throw new Error('Só é possível registrar execução em itens já Aprovados ou Publicados')
  }

  return prisma.itemPca.update({
    where: { id: idItemPca },
    data: {
      situacaoExecucao: params.situacao,
      dataAtualizacaoExecucao: new Date(),
      atualizadoExecucaoPor: params.idUsuario,
    },
  })
}

// ── Histórico de relatórios/publicações ───────────────────────────────────
export async function listarHistoricoRelatorios(idOrganizacao: string, idPlano: string) {
  return prisma.relatorioPca.findMany({
    where: { idOrganizacao, idPlano },
    include: { geradoPor: { select: { id: true, nome: true } } },
    orderBy: { criadoEm: 'desc' },
  })
}

// ── Geração dos PDFs ───────────────────────────────────────────────────────
const COR_TITULO = '#1a365d'
const COR_SECAO = '#2b6cb0'
const COR_TEXTO = '#2d3748'
const COR_MUTED = '#718096'

function formatarBRL(v: number): string {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

async function gerarPdfBuffer(desenhar: (doc: InstanceType<typeof PDFDocument>) => void): Promise<Buffer> {
  const doc = new PDFDocument({ margin: 50 })
  const chunks: Buffer[] = []
  doc.on('data', (chunk: Buffer) => chunks.push(chunk))
  desenhar(doc)
  await new Promise<void>((resolve) => {
    doc.on('end', resolve)
    doc.end()
  })
  return Buffer.concat(chunks)
}

export async function gerarRelatorioTrimestral(params: {
  idOrganizacao: string; idPlano: string; trimestre: number; idUsuario: string
}) {
  if (params.trimestre < 1 || params.trimestre > 4) throw new Error('Trimestre inválido (use 1 a 4)')

  const plano = await prisma.planoContratacaoAnual.findFirst({
    where: { id: params.idPlano, idOrganizacao: params.idOrganizacao },
    include: { organizacao: { select: { nome: true } } },
  })
  if (!plano) throw new Error('Plano não encontrado')

  const itens = await buscarItensExecucao(params.idOrganizacao, params.idPlano)
  const resumo = calcularResumo(itens)

  const pdfBuffer = await gerarPdfBuffer((doc) => {
    doc.fontSize(18).fillColor(COR_TITULO).text('Relatório Trimestral de Execução do PCA', { align: 'center' })
    doc.moveDown(0.2)
    doc.fontSize(11).fillColor(COR_MUTED).text(
      `${plano.organizacao.nome} — Exercício ${plano.ano} · v${plano.versao} — ${params.trimestre}º trimestre`,
      { align: 'center' }
    )
    doc.fontSize(9).fillColor(COR_MUTED).text(`Gerado em ${new Date().toLocaleString('pt-BR')}`, { align: 'center' })
    doc.moveDown(1)

    doc.fontSize(10).fillColor(COR_MUTED).text(
      'Relatório circunstanciado da execução do Plano de Contratações Anual, elaborado pela GECOP para envio à ' +
      'Autoridade Competente, conforme item 9.9 da norma organizacional. A situação de execução de cada item é ' +
      'declarada manualmente por quem acompanha o plano.'
    )
    doc.moveDown(1)

    doc.fontSize(13).fillColor(COR_SECAO).text('Resumo do exercício')
    doc.moveDown(0.3)
    doc.fontSize(10).fillColor(COR_TEXTO)
    doc.text(`Itens executados: ${resumo.itensExecutados} de ${resumo.itensTotal} (${resumo.percentual.toFixed(1)}%)`)
    doc.text(`Valor executado: ${formatarBRL(resumo.valorExecutado)} de ${formatarBRL(resumo.valorTotal)}`)
    doc.moveDown(1)

    doc.fontSize(13).fillColor(COR_SECAO).text('Itens do plano')
    doc.moveDown(0.3)
    doc.fontSize(9).fillColor(COR_TEXTO)
    if (itens.length === 0) {
      doc.text('Nenhum item aprovado/publicado neste exercício.')
    }
    itens.forEach((item) => {
      const situacao = item.situacaoExecucao ? SITUACAO_LABEL[item.situacaoExecucao] : 'Não avaliado'
      doc.text(`${item.numero} — ${item.descricaoObjeto}`)
      doc.fillColor(COR_MUTED).text(`  ${formatarBRL(Number(item.valorTotal))} · Situação: ${situacao}`)
      doc.fillColor(COR_TEXTO)
      doc.moveDown(0.3)
    })
  })

  await prisma.relatorioPca.create({
    data: {
      idOrganizacao: params.idOrganizacao,
      idPlano: params.idPlano,
      tipo: TIPO_RELATORIO_PCA.TRIMESTRAL,
      trimestre: params.trimestre,
      itensExecutados: resumo.itensExecutados,
      itensTotal: resumo.itensTotal,
      valorExecutado: resumo.valorExecutado,
      valorTotal: resumo.valorTotal,
      idGeradoPor: params.idUsuario,
    },
  })

  return pdfBuffer
}

export async function gerarRelatorioSimplificado(params: {
  idOrganizacao: string; idPlano: string; idUsuario: string
}) {
  const plano = await prisma.planoContratacaoAnual.findFirst({
    where: { id: params.idPlano, idOrganizacao: params.idOrganizacao },
    include: { organizacao: { select: { nome: true } } },
  })
  if (!plano) throw new Error('Plano não encontrado')

  const itens = await buscarItensExecucao(params.idOrganizacao, params.idPlano)
  const resumo = calcularResumo(itens)

  const pdfBuffer = await gerarPdfBuffer((doc) => {
    doc.fontSize(18).fillColor(COR_TITULO).text('Plano de Contratações Anual — Relatório Simplificado', { align: 'center' })
    doc.moveDown(0.2)
    doc.fontSize(11).fillColor(COR_MUTED).text(
      `${plano.organizacao.nome} — Exercício ${plano.ano} · v${plano.versao}`,
      { align: 'center' }
    )
    doc.fontSize(9).fillColor(COR_MUTED).text(`Divulgado em ${new Date().toLocaleString('pt-BR')}`, { align: 'center' })
    doc.moveDown(1)

    doc.fontSize(10).fillColor(COR_MUTED).text(
      'Divulgação pública do andamento do Plano de Contratações Anual, conforme item 9.9 da norma organizacional ' +
      '(publicação obrigatória no sítio eletrônico em até 15 dias corridos após a aprovação).'
    )
    doc.moveDown(1)

    doc.fontSize(13).fillColor(COR_SECAO).text('Indicadores de execução')
    doc.moveDown(0.3)
    doc.fontSize(11).fillColor(COR_TEXTO)
    doc.text(`${resumo.itensExecutados} de ${resumo.itensTotal} itens executados (${resumo.percentual.toFixed(1)}%)`)
    doc.text(`Valor executado: ${formatarBRL(resumo.valorExecutado)} de ${formatarBRL(resumo.valorTotal)} previstos`)
  })

  await prisma.$transaction([
    prisma.relatorioPca.create({
      data: {
        idOrganizacao: params.idOrganizacao,
        idPlano: params.idPlano,
        tipo: TIPO_RELATORIO_PCA.SIMPLIFICADO,
        itensExecutados: resumo.itensExecutados,
        itensTotal: resumo.itensTotal,
        valorExecutado: resumo.valorExecutado,
        valorTotal: resumo.valorTotal,
        idGeradoPor: params.idUsuario,
      },
    }),
    prisma.planoContratacaoAnual.update({
      where: { id: params.idPlano },
      data: { dataPublicacaoSitio: new Date() },
    }),
  ])

  return pdfBuffer
}
