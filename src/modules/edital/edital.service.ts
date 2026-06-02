// ============================================================
// SERVICE — Módulos 3.5 (Edital) + 4 (Análise Jurídica)
// src/modules/edital/edital.service.ts
// ============================================================

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export const STATUS_EDITAL = {
  ELABORACAO:           'ELABORACAO',
  AGUARDANDO_JURIDICO:  'AGUARDANDO_JURIDICO',
  DEVOLVIDO:            'DEVOLVIDO',
  APROVADO:             'APROVADO',
} as const

const STATUS_M35 = [31, 33, 34]
const STATUS_M4  = [34, 35]

// ── 1. FILA DO ELABORADOR (M3.5) ─────────────────────────────
export async function listarFilaEdital(idOrganizacao: string, idUsuario: string) {
  const pedidos = await prisma.pedido.findMany({
    where: { idOrganizacao, status: { in: STATUS_M35 } },
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
        select: {
          id: true, texto: true, tipo: true, origem: true, criadoEm: true,
          usuario: { select: { nome: true } },
          leituras: { where: { idUsuario }, select: { id: true } },
        },
      },
    },
    orderBy: { criadoEm: 'asc' },
  })

  // Adiciona flag temMensagemNova: último comentário é do JURIDICO e não foi lido
  return pedidos.map(p => ({
    ...p,
    temMensagemNova: p.editalComentarios[0]?.origem === 'JURIDICO' && p.editalComentarios[0]?.leituras.length === 0,
  }))
}

// ── 2. FILA DO JURÍDICO (M4) ──────────────────────────────────
export async function listarFilaJuridico(idOrganizacao: string, idUsuario: string) {
  const pedidos = await prisma.pedido.findMany({
    where: { idOrganizacao, status: { in: STATUS_M4 } },
    include: {
      solicitante: { select: { nome: true } },
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
        select: {
          id: true, texto: true, tipo: true, origem: true, criadoEm: true,
          usuario: { select: { nome: true } },
          leituras: { where: { idUsuario }, select: { id: true } },
        },
      },
    },
    orderBy: { criadoEm: 'asc' },
  })

  // Adiciona flag temMensagemNova: último comentário é do ELABORADOR e não foi lido
  return pedidos.map(p => ({
    ...p,
    temMensagemNova: p.editalComentarios[0]?.origem === 'ELABORADOR' && p.editalComentarios[0]?.leituras.length === 0,
  }))
}

// ── 3. DETALHE DO PEDIDO ──────────────────────────────────────
export async function obterDetalheEdital(idPedido: string, idOrganizacao: string) {
  const pedido = await prisma.pedido.findFirst({
    where: { id: idPedido, idOrganizacao },
    include: {
      solicitante: { select: { nome: true } },
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
        select: {
          id: true, idUsuario: true, texto: true, tipo: true, origem: true, criadoEm: true,
          usuario: { select: { nome: true } },
          versao: { select: { versao: true, nome: true } },
        },
      },
    },
  })
  if (!pedido) throw new Error('Pedido não encontrado')
  return pedido
}

// ── 4. MARCAR COMENTÁRIOS COMO LIDOS ─────────────────────────
// Chamado ao abrir o drawer — marca todos os comentários do processo como lidos
export async function marcarComentariosLidos(idPedido: string, idUsuario: string) {
  const comentarios = await prisma.editalComentario.findMany({
    where: { idPedido },
    select: { id: true },
  })

  if (comentarios.length === 0) return

  // upsert para não duplicar
  await prisma.$transaction(
    comentarios.map(c =>
      prisma.editalComentarioLeitura.upsert({
        where: { idComentario_idUsuario: { idComentario: c.id, idUsuario } },
        create: { idComentario: c.id, idUsuario },
        update: { lidoEm: new Date() },
      })
    )
  )
}

// ── 5. UPLOAD DE NOVA VERSÃO ──────────────────────────────────
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

  if (pedido.status === 31) {
    await prisma.pedido.update({ where: { id: input.idPedido }, data: { status: 33 } })
  }

  return versao
}

// ── 6. DOWNLOAD DE VERSÃO ─────────────────────────────────────
export async function downloadVersaoEdital(idVersao: string, idOrganizacao: string) {
  const versao = await prisma.editalVersao.findFirst({ where: { id: idVersao, idOrganizacao } })
  if (!versao) throw new Error('Versão não encontrada')
  return versao
}

// ── 7. EXCLUIR VERSÃO ─────────────────────────────────────────
export async function excluirVersaoEdital(idVersao: string, idOrganizacao: string) {
  const versao = await prisma.editalVersao.findFirst({ where: { id: idVersao, idOrganizacao } })
  if (!versao) throw new Error('Versão não encontrada')
  if ([STATUS_EDITAL.AGUARDANDO_JURIDICO, STATUS_EDITAL.APROVADO].includes(versao.status as any))
    throw new Error('Não é possível excluir versão encaminhada ou aprovada')
  await prisma.editalVersao.delete({ where: { id: idVersao } })
}

// ── 8. ENCAMINHAR PARA JURÍDICO ───────────────────────────────
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
    data: {
      idPedido: input.idPedido, idVersao: input.idVersao, idUsuario: input.idUsuario,
      texto: `Edital v${versao.versao} encaminhado para análise jurídica.`,
      tipo: 'COMENTARIO', origem: 'ELABORADOR',
    },
  })

  return versaoAtualizada
}

// ── 9. COMENTÁRIO / DEVOLUÇÃO / APROVAÇÃO / RESSALVA ─────────
export async function adicionarComentario(input: {
  idPedido: string; idVersao?: string; idUsuario: string
  texto: string
  tipo: 'COMENTARIO' | 'DEVOLUCAO' | 'APROVACAO' | 'RESSALVA'
  origem: 'JURIDICO' | 'ELABORADOR'
}) {
  if (input.tipo === 'DEVOLUCAO' && input.idVersao) {
    await prisma.$transaction([
      prisma.editalVersao.update({ where: { id: input.idVersao }, data: { status: STATUS_EDITAL.DEVOLVIDO } }),
      prisma.pedido.update({ where: { id: input.idPedido }, data: { status: 33 } }),
    ])
  }
  if ((input.tipo === 'APROVACAO' || input.tipo === 'RESSALVA') && input.idVersao) {
    await prisma.$transaction([
      prisma.editalVersao.update({ where: { id: input.idVersao }, data: { status: STATUS_EDITAL.APROVADO } }),
      prisma.pedido.update({ where: { id: input.idPedido }, data: { status: 35 } }),
    ])
  }
  return prisma.editalComentario.create({
    data: {
      idPedido: input.idPedido, idVersao: input.idVersao,
      idUsuario: input.idUsuario, texto: input.texto,
      tipo: input.tipo, origem: input.origem,
    },
    include: { usuario: { select: { nome: true } } },
  })
}
