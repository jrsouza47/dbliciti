// ============================================================
// SERVICE — Módulo 3.5: Elaboração do Edital
// backend/src/modules/edital/edital.service.ts
// ============================================================

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export const STATUS_EDITAL = {
  ELABORACAO:           'ELABORACAO',
  AGUARDANDO_JURIDICO:  'AGUARDANDO_JURIDICO',
  DEVOLVIDO:            'DEVOLVIDO',
  APROVADO:             'APROVADO',
} as const

// Status do pedido que permite trabalhar no edital
const STATUS_PEDIDO_VALIDOS = [31, 33, 34] // DEFINICAO_CONCLUIDA, EM_ELABORACAO_EDITAL, AGUARDANDO_JURIDICO_EDITAL

// ── 1. LISTAR FILA DO EDITAL ──────────────────────────────────
export async function listarFilaEdital(idOrganizacao: string) {
  return prisma.pedido.findMany({
    where: { idOrganizacao, status: { in: STATUS_PEDIDO_VALIDOS } },
    include: {
      editalVersoes: {
        orderBy: { versao: 'desc' },
        select: {
          id: true, versao: true, nome: true, tamanho: true,
          mimeType: true, status: true, observacao: true,
          idUsuario: true, criadoEm: true,
          usuario: { select: { nome: true } },
        },
      },
      editalComentarios: {
        orderBy: { criadoEm: 'desc' },
        take: 1,
        select: { id: true, texto: true, tipo: true, criadoEm: true, usuario: { select: { nome: true } } },
      },
    },
    orderBy: { criadoEm: 'asc' },
  })
}

// ── 2. DETALHE DO PEDIDO COM EDITAL ──────────────────────────
export async function obterDetalheEdital(idPedido: string, idOrganizacao: string) {
  const pedido = await prisma.pedido.findFirst({
    where: { id: idPedido, idOrganizacao },
    include: {
      editalVersoes: {
        orderBy: { versao: 'desc' },
        select: {
          id: true, versao: true, nome: true, tamanho: true,
          mimeType: true, status: true, observacao: true,
          idUsuario: true, criadoEm: true, atualizadoEm: true,
          usuario: { select: { nome: true } },
        },
      },
      editalComentarios: {
        orderBy: { criadoEm: 'desc' },
        include: {
          usuario: { select: { nome: true } },
          versao: { select: { versao: true, nome: true } },
        },
      },
    },
  })
  if (!pedido) throw new Error('Pedido não encontrado')
  return pedido
}

// ── 3. UPLOAD DE NOVA VERSÃO ──────────────────────────────────
export async function uploadVersaoEdital(input: {
  idPedido: string; idOrganizacao: string; idUsuario: string
  nome: string; tamanho: number; mimeType: string; dados: Buffer; observacao?: string
}) {
  const pedido = await prisma.pedido.findFirst({
    where: { id: input.idPedido, idOrganizacao: input.idOrganizacao },
    select: { id: true, status: true },
  })
  if (!pedido) throw new Error('Pedido não encontrado')

  const totalVersoes = await prisma.editalVersao.count({ where: { idPedido: input.idPedido } })

  const versao = await prisma.editalVersao.create({
    data: {
      idPedido: input.idPedido, idOrganizacao: input.idOrganizacao,
      versao: totalVersoes + 1, nome: input.nome, tamanho: input.tamanho,
      mimeType: input.mimeType, dados: input.dados,
      observacao: input.observacao, idUsuario: input.idUsuario,
      status: STATUS_EDITAL.ELABORACAO,
    },
    select: { id: true, versao: true, nome: true, tamanho: true, mimeType: true, status: true, observacao: true, idUsuario: true, criadoEm: true },
  })

  // Se pedido estava em DEFINICAO_CONCLUIDA (31), avança para EM_ELABORACAO_EDITAL (33)
  if (pedido.status === 31) {
    await prisma.pedido.update({ where: { id: input.idPedido }, data: { status: 33 } })
  }

  return versao
}

// ── 4. DOWNLOAD DE VERSÃO ─────────────────────────────────────
export async function downloadVersaoEdital(idVersao: string, idOrganizacao: string) {
  const versao = await prisma.editalVersao.findFirst({ where: { id: idVersao, idOrganizacao } })
  if (!versao) throw new Error('Versão não encontrada')
  return versao
}

// ── 5. EXCLUIR VERSÃO ─────────────────────────────────────────
export async function excluirVersaoEdital(idVersao: string, idOrganizacao: string) {
  const versao = await prisma.editalVersao.findFirst({ where: { id: idVersao, idOrganizacao } })
  if (!versao) throw new Error('Versão não encontrada')
  if ([STATUS_EDITAL.AGUARDANDO_JURIDICO, STATUS_EDITAL.APROVADO].includes(versao.status as any))
    throw new Error('Não é possível excluir versão encaminhada ou aprovada')
  await prisma.editalVersao.delete({ where: { id: idVersao } })
}

// ── 6. ENCAMINHAR PARA JURÍDICO ───────────────────────────────
export async function encaminharParaJuridico(input: {
  idPedido: string; idOrganizacao: string; idUsuario: string; idVersao: string
}) {
  const versao = await prisma.editalVersao.findFirst({ where: { id: input.idVersao, idPedido: input.idPedido } })
  if (!versao) throw new Error('Versão não encontrada')
  if (versao.status === STATUS_EDITAL.AGUARDANDO_JURIDICO) throw new Error('Versão já encaminhada')

  const [versaoAtualizada] = await prisma.$transaction([
    prisma.editalVersao.update({ where: { id: input.idVersao }, data: { status: STATUS_EDITAL.AGUARDANDO_JURIDICO } }),
    prisma.pedido.update({ where: { id: input.idPedido }, data: { status: 34 } }),
  ])

  await prisma.editalComentario.create({
    data: { idPedido: input.idPedido, idVersao: input.idVersao, idUsuario: input.idUsuario, texto: `Edital v${versao.versao} encaminhado para análise jurídica.`, tipo: 'COMENTARIO' },
  })

  return versaoAtualizada
}

// ── 7. COMENTÁRIO / DEVOLUÇÃO / APROVAÇÃO ────────────────────
export async function adicionarComentario(input: {
  idPedido: string; idVersao?: string; idUsuario: string
  texto: string; tipo: 'COMENTARIO' | 'DEVOLUCAO' | 'APROVACAO'
  origem: 'JURIDICO' | 'ELABORADOR'
}) {
  if (input.tipo === 'DEVOLUCAO' && input.idVersao) {
    await prisma.$transaction([
      prisma.editalVersao.update({ where: { id: input.idVersao }, data: { status: STATUS_EDITAL.DEVOLVIDO } }),
      prisma.pedido.update({ where: { id: input.idPedido }, data: { status: 33 } }),
    ])
  }
  if (input.tipo === 'APROVACAO' && input.idVersao) {
    await prisma.$transaction([
      prisma.editalVersao.update({ where: { id: input.idVersao }, data: { status: STATUS_EDITAL.APROVADO } }),
      prisma.pedido.update({ where: { id: input.idPedido }, data: { status: 35 } }),
    ])
  }
  return prisma.editalComentario.create({
    data: { idPedido: input.idPedido, idVersao: input.idVersao, idUsuario: input.idUsuario, texto: input.texto, tipo: input.tipo, origem: input.origem },
    include: { usuario: { select: { nome: true } } },
  })
}
