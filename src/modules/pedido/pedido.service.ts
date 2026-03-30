import prisma from '../../shared/prisma'
import {
  CriarPedidoInput,
  SubmeterPedidoInput,
  DecidirPedidoInput,
  EncaminharPedidoInput,
  CancelarPedidoInput,
  CriarAlcadaInput,
} from './pedido.schema'

function gerarNumeroPedido(): string {
  const ano = new Date().getFullYear()
  const seq = Math.floor(Math.random() * 900000) + 100000
  return `PED-${ano}-${seq}`
}

export async function criarAlcada(data: CriarAlcadaInput) {
  return prisma.alcadaAprovacao.create({ data })
}

export async function listarAlcadas(idOrganizacao: string) {
  return prisma.alcadaAprovacao.findMany({
    where: { idOrganizacao, ativo: true },
    orderBy: { nivel: 'asc' },
  })
}

export async function criarPedido(data: CriarPedidoInput) {
  const { itens, ...pedidoData } = data

  const valorTotal = itens.reduce(
    (acc: number, i: CriarPedidoInput['itens'][0]) =>
      acc + i.quantidade * i.precoUnitario,
    0
  )

  return prisma.pedido.create({
    data: {
      ...pedidoData,
      numero: gerarNumeroPedido(),
      valorTotal,
      status: 'Rascunho',
      itens: {
        create: itens.map((i: CriarPedidoInput['itens'][0]) => ({
          idItem: i.idItem,
          quantidade: i.quantidade,
          precoUnitario: i.precoUnitario,
          subtotal: i.quantidade * i.precoUnitario,
          observacao: i.observacao,
        })),
      },
    },
    include: { itens: true },
  })
}

export async function listarPedidos(idOrganizacao: string) {
  return prisma.pedido.findMany({
    where: { idOrganizacao },
    include: { itens: true, solicitante: true },
    orderBy: { criadoEm: 'desc' },
  })
}

export async function buscarPedido(id: string) {
  return prisma.pedido.findUnique({
    where: { id },
    include: {
      itens: { include: { item: true } },
      aprovacoes: true,
      solicitante: true,
    },
  })
}

export async function submeterPedido(id: string, data: SubmeterPedidoInput) {
  const pedido = await prisma.pedido.findUnique({ where: { id } })
  if (!pedido) throw new Error('Pedido nao encontrado')
  if (pedido.status !== 'Rascunho') throw new Error('Apenas pedidos em Rascunho podem ser submetidos')

  const pedidoAtualizado = await prisma.pedido.update({
    where: { id },
    data: { status: 'EmAprovacao', nivelAtual: 1 },
  })

  await prisma.auditoriaPedido.create({
    data: {
      idPedido: id,
      acao: 'Submetido',
      valorAntes: 'Rascunho',
      valorDepois: 'EmAprovacao',
      usuarioId: data.idUsuario,
    },
  })

  return pedidoAtualizado
}

export async function decidirPedido(id: string, data: DecidirPedidoInput) {
  const pedido = await prisma.pedido.findUnique({ where: { id } })
  if (!pedido) throw new Error('Pedido nao encontrado')
  if (pedido.status !== 'EmAprovacao') throw new Error('Pedido nao esta em aprovacao')

  const alcadas = await prisma.alcadaAprovacao.findMany({
    where: { ativo: true },
    orderBy: { nivel: 'asc' },
  })

  const alcadaAtual = alcadas.find(
    (a: { nivel: number; id: string }) => a.nivel === pedido.nivelAtual
  )
  if (!alcadaAtual) throw new Error('Alcada nao encontrada para o nivel atual')

  await prisma.aprovacaoPedido.create({
    data: {
      idPedido: id,
      idAlcada: alcadaAtual.id,
      idAprovador: data.idAprovador,
      nivel: pedido.nivelAtual,
      decisao: data.decisao,
      justificativa: data.justificativa,
    },
  })

  let novoStatus = pedido.status
  let novoNivel = pedido.nivelAtual

  if (data.decisao === 'Reprovado') {
    novoStatus = 'Reprovado'
  } else {
    const proximaAlcada = alcadas.find(
      (a: { nivel: number }) => a.nivel === pedido.nivelAtual + 1
    )
    if (proximaAlcada) {
      novoNivel = pedido.nivelAtual + 1
    } else {
      novoStatus = 'Aprovado'
    }
  }

  const pedidoAtualizado = await prisma.pedido.update({
    where: { id },
    data: { status: novoStatus, nivelAtual: novoNivel },
  })

  await prisma.auditoriaPedido.create({
    data: {
      idPedido: id,
      acao: data.decisao,
      usuarioId: data.idAprovador,
      valorDepois: novoStatus,
    },
  })

  return pedidoAtualizado
}

export async function encaminharPedido(id: string, data: EncaminharPedidoInput) {
  const pedido = await prisma.pedido.findUnique({ where: { id } })
  if (!pedido) throw new Error('Pedido nao encontrado')
  if (pedido.status !== 'Aprovado') throw new Error('Apenas pedidos aprovados podem ser encaminhados')

  const pedidoAtualizado = await prisma.pedido.update({
    where: { id },
    data: { status: 'Encaminhado', destinoPos: data.destino },
  })

  await prisma.auditoriaPedido.create({
    data: {
      idPedido: id,
      acao: 'Encaminhado',
      valorDepois: data.destino,
      usuarioId: data.idComprador,
    },
  })

  return pedidoAtualizado
}

export async function cancelarPedido(id: string, data: CancelarPedidoInput) {
  const pedido = await prisma.pedido.findUnique({ where: { id } })
  if (!pedido) throw new Error('Pedido nao encontrado')
  if (['Aprovado', 'Encaminhado', 'Cancelado'].includes(pedido.status)) {
    throw new Error('Pedido nao pode ser cancelado neste status')
  }

  const pedidoAtualizado = await prisma.pedido.update({
    where: { id },
    data: { status: 'Cancelado' },
  })

  await prisma.auditoriaPedido.create({
    data: {
      idPedido: id,
      acao: 'Cancelado',
      valorAntes: pedido.status,
      valorDepois: data.motivo,
      usuarioId: data.idUsuario,
      campo: 'motivo',
    },
  })

  return pedidoAtualizado
}