import { FastifyInstance } from 'fastify'
import {
  criarAlcadaSchema,
  criarPedidoSchema,
  submeterPedidoSchema,
  decidirPedidoSchema,
  encaminharPedidoSchema,
  cancelarPedidoSchema,
} from '../pedido.schema'
import {
  criarAlcada,
  listarAlcadas,
  criarPedido,
  listarPedidos,
  buscarPedido,
  submeterPedido,
  decidirPedido,
  encaminharPedido,
  cancelarPedido,
} from '../pedido.service'

export async function pedidoRoutes(app: FastifyInstance) {
  // M2-06 — Alçadas
  app.post('/alcadas', async (request, reply) => {
    const data = criarAlcadaSchema.parse(request.body)
    const alcada = await criarAlcada(data)
    return reply.status(201).send(alcada)
  })

  app.get('/alcadas/:idOrganizacao', async (request, reply) => {
    const { idOrganizacao } = request.params as { idOrganizacao: string }
    return listarAlcadas(idOrganizacao)
  })

  // M2-01 — Criar pedido
  app.post('/pedidos', async (request, reply) => {
    const data = criarPedidoSchema.parse(request.body)
    const pedido = await criarPedido(data)
    return reply.status(201).send(pedido)
  })

  // GET /pedidos?idOrganizacao=xxx
  app.get('/pedidos', async (request, reply) => {
    const { idOrganizacao } = request.query as { idOrganizacao: string }
    if (!idOrganizacao) return reply.status(400).send({ error: 'idOrganizacao obrigatório' })
    return listarPedidos(idOrganizacao)
  })

  // GET /pedidos/:id
  app.get('/pedidos/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const pedido = await buscarPedido(id)
    if (!pedido) return reply.status(404).send({ error: 'Pedido não encontrado' })
    return pedido
  })

  // M2-02 — Submeter
  app.patch('/pedidos/:id/submeter', async (request, reply) => {
    const { id } = request.params as { id: string }
    const data = submeterPedidoSchema.parse(request.body)
    return submeterPedido(id, data)
  })

  // M2-03 — Decidir (aprovar/reprovar)
  app.patch('/pedidos/:id/decidir', async (request, reply) => {
    const { id } = request.params as { id: string }
    const data = decidirPedidoSchema.parse(request.body)
    return decidirPedido(id, data)
  })

  // M2-04 — Encaminhar
  app.patch('/pedidos/:id/encaminhar', async (request, reply) => {
    const { id } = request.params as { id: string }
    const data = encaminharPedidoSchema.parse(request.body)
    return encaminharPedido(id, data)
  })

  // M2-05 — Cancelar
  app.patch('/pedidos/:id/cancelar', async (request, reply) => {
    const { id } = request.params as { id: string }
    const data = cancelarPedidoSchema.parse(request.body)
    return cancelarPedido(id, data)
  })
}