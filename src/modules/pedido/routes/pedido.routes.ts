import { FastifyInstance } from 'fastify'
import {
  criarPedidoSchema,
  cadastrarPedidoSchema,
  submeterPedidoSchema,
  decidirPedidoSchema,
  encaminharPedidoSchema,
  cancelarPedidoSchema,
  atualizarPedidoSchema,
} from '../pedido.schema'
import {
  criarPedido,
  listarPedidos,
  buscarPedido,
  cadastrarPedido,
  submeterPedido,
  decidirPedido,
  encaminharPedido,
  cancelarPedido,
  previewNumeroPedido,
  atualizarPedido,
  voltarRascunho,
  copiarPedido,
} from '../pedido.service'
import prisma from '../../../shared/prisma'

export async function pedidoRoutes(app: FastifyInstance) {

  // GET /centros-custo?idOrganizacao=
  app.get('/centros-custo', async (request, reply) => {
    const { idOrganizacao } = request.query as { idOrganizacao: string }
    if (!idOrganizacao) return reply.status(400).send({ error: 'idOrganizacao obrigatorio' })
    const centros = await prisma.centroCusto.findMany({
      where: { idOrganizacao, ativo: true },
      orderBy: { descricao: 'asc' },
    })
    return reply.send(centros)
  })

  // POST /pedidos — Criar pedido (status 1 = Rascunho)
  app.post('/pedidos', async (request, reply) => {
    const data = criarPedidoSchema.parse(request.body)
    const pedido = await criarPedido(data)
    return reply.status(201).send(pedido)
  })

  // GET /pedidos/preview-numero?idOrganizacao= — retorna o próximo número sem criar pedido
  app.get('/pedidos/preview-numero', async (request, reply) => {
    const { idOrganizacao } = request.query as { idOrganizacao: string }
    if (!idOrganizacao) return reply.status(400).send({ error: 'idOrganizacao obrigatorio' })
    const numero = await previewNumeroPedido(idOrganizacao)
    return reply.send({ numero })
  })

  // GET /pedidos?idOrganizacao=
  app.get('/pedidos', async (request, reply) => {
    const { idOrganizacao } = request.query as { idOrganizacao: string }
    if (!idOrganizacao) return reply.status(400).send({ error: 'idOrganizacao obrigatorio' })
    return listarPedidos(idOrganizacao)
  })

  // GET /pedidos/:id
  app.get('/pedidos/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const pedido = await buscarPedido(id)
    if (!pedido) return reply.status(404).send({ error: 'Pedido nao encontrado' })
    return pedido
  })

  // PATCH /pedidos/:id — Atualizar rascunho (status 1)
  app.patch('/pedidos/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const data = atualizarPedidoSchema.parse(request.body)
    return atualizarPedido(id, data)
  })

  // PATCH /pedidos/:id/cadastrar — Rascunho (1) → Cadastrado (2)
  app.patch('/pedidos/:id/cadastrar', async (request, reply) => {
    const { id } = request.params as { id: string }
    const data = cadastrarPedidoSchema.parse(request.body)
    return cadastrarPedido(id, data)
  })

  // PATCH /pedidos/:id/submeter — Cadastrado (2) → Em Aprovação (3)
  app.patch('/pedidos/:id/submeter', async (request, reply) => {
    const { id } = request.params as { id: string }
    const data = submeterPedidoSchema.parse(request.body)
    return submeterPedido(id, data)
  })

  // PATCH /pedidos/:id/decidir — Em Aprovação (3) → Aprovado (4) ou Reprovado (5)
  app.patch('/pedidos/:id/decidir', async (request, reply) => {
    const { id } = request.params as { id: string }
    const data = decidirPedidoSchema.parse(request.body)
    return decidirPedido(id, data)
  })

  // PATCH /pedidos/:id/encaminhar — Aprovado (4) → Encaminhado (7)
  app.patch('/pedidos/:id/encaminhar', async (request, reply) => {
    const { id } = request.params as { id: string }
    const data = encaminharPedidoSchema.parse(request.body)
    return encaminharPedido(id, data)
  })

  // PATCH /pedidos/:id/rascunho — Cadastrado (2) → Rascunho (1)
  app.patch('/pedidos/:id/rascunho', async (request, reply) => {
    const { id } = request.params as { id: string }
    const { idUsuario } = request.body as { idUsuario: string }
    return voltarRascunho(id, idUsuario)
  })

  // POST /pedidos/:id/copiar — Clonar pedido
  app.post('/pedidos/:id/copiar', async (request, reply) => {
    const { id } = request.params as { id: string }
    const { idUsuario } = request.body as { idUsuario: string }
    const novo = await copiarPedido(id, idUsuario)
    return reply.status(201).send(novo)
  })

  // PATCH /pedidos/:id/cancelar — (1,2,3) → Cancelado (6)
  app.patch('/pedidos/:id/cancelar', async (request, reply) => {
    const { id } = request.params as { id: string }
    const data = cancelarPedidoSchema.parse(request.body)
    return cancelarPedido(id, data)
  })
}
