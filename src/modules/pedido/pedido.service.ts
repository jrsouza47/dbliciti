import prisma from '../../shared/prisma'
import {
  CriarPedidoInput,
  SubmeterPedidoInput,
  DecidirPedidoInput,
  EncaminharPedidoInput,
  CancelarPedidoInput,
  CriarAlcadaInput,
} from './pedido.schema'

// Domínio pedido.status: 1=Rascunho, 2=Submetido, 3=EmAprovacao, 4=Aprovado, 5=Reprovado, 6=Cancelado, 7=Encaminhado
// Domínio pedido.destinoPos: 1=Cotacao, 2=Licitacao
// Domínio aprovacao.decisao: 1=Aprovado, 2=Reprovado

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
      status: 1, // Rascunho
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
  if (!pedido) throw new Error('Pedido não encontrado')
  if (pedido.status !== 1) // 1 = Rascunho
    throw new Error('Apenas pedidos em Rascunho podem ser submetidos')

  const pedidoAtualizado = await prisma.pedido.update({
    where: { id },
    data: { status: 3, nivelAtual: 1 }, // 3 = EmAprovacao
  })

  await prisma.auditoriaPedido.create({
    data: {
      idPedido: id,
      acao: 'Submetido',
      valorAntes: '1',
      valorDepois: '3',
      usuarioId: data.idUsuario,
    },
  })

  return pedidoAtualizado
}

export async function decidirPedido(id: string, data: DecidirPedidoInput) {
  const pedido = await prisma.pedido.findUnique({ where: { id } })
  if (!pedido) throw new Error('Pedido não encontrado')
  if (pedido.status !== 3) // 3 = EmAprovacao
    throw new Error('Pedido não está em aprovação')

  const alcadas = await prisma.alcadaAprovacao.findMany({
    where: { ativo: true },
    orderBy: { nivel: 'asc' },
  })

  const alcadaAtual = alcadas.find(a => a.nivel === pedido.nivelAtual)
  if (!alcadaAtual) throw new Error('Alçada não encontrada para o nível atual')

  const decisaoInt = data.decisao === 'Aprovado' ? 1 : 2

  await prisma.aprovacaoPedido.create({
    data: {
      idPedido: id,
      idAlcada: alcadaAtual.id,
      idAprovador: data.idAprovador,
      nivel: pedido.nivelAtual,
      decisao: decisaoInt,
      justificativa: data.justificativa,
    },
  })

  let novoStatus = pedido.status
  let novoNivel = pedido.nivelAtual

  if (decisaoInt === 2) { // Reprovado
    novoStatus = 5
  } else {
    const proximaAlcada = alcadas.find(a => a.nivel === pedido.nivelAtual + 1)
    if (proximaAlcada) {
      novoNivel = pedido.nivelAtual + 1
    } else {
      novoStatus = 4 // Aprovado
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
      valorDepois: String(novoStatus),
    },
  })

  return pedidoAtualizado
}

export async function encaminharPedido(id: string, data: EncaminharPedidoInput) {
  const pedido = await prisma.pedido.findUnique({ where: { id } })
  if (!pedido) throw new Error('Pedido não encontrado')
  if (pedido.status !== 4) // 4 = Aprovado
    throw new Error('Apenas pedidos aprovados podem ser encaminhados')

  const destinoInt = data.destino === 'Cotacao' ? 1 : 2

  const pedidoAtualizado = await prisma.pedido.update({
    where: { id },
    data: { status: 7, destinoPos: destinoInt }, // 7 = Encaminhado
  })

  await prisma.auditoriaPedido.create({
    data: {
      idPedido: id,
      acao: 'Encaminhado',
      valorDepois: String(destinoInt),
      usuarioId: data.idComprador,
    },
  })

  return pedidoAtualizado
}

export async function cancelarPedido(id: string, data: CancelarPedidoInput) {
  const pedido = await prisma.pedido.findUnique({ where: { id } })
  if (!pedido) throw new Error('Pedido não encontrado')

  const statusBloqueados = [4, 7, 6] // Aprovado, Encaminhado, Cancelado
  if (statusBloqueados.includes(pedido.status)) {
    throw new Error('Pedido não pode ser cancelado neste status')
  }

  const pedidoAtualizado = await prisma.pedido.update({
    where: { id },
    data: { status: 6 }, // 6 = Cancelado
  })

  await prisma.auditoriaPedido.create({
    data: {
      idPedido: id,
      acao: 'Cancelado',
      valorAntes: String(pedido.status),
      valorDepois: data.motivo,
      usuarioId: data.idUsuario,
      campo: 'motivo',
    },
  })

  return pedidoAtualizado
}