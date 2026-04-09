import { FastifyInstance } from 'fastify'
import {
  criarOrganizacaoSchema,
  atualizarOrganizacaoSchema,
  statusOrganizacaoSchema,
} from './organizacao.schema'
import {
  criarOrganizacao,
  listarOrganizacoes,
  buscarOrganizacao,
  atualizarOrganizacao,
  alterarStatusOrganizacao,
} from './organizacao.service'

export async function organizacaoRoutes(app: FastifyInstance) {
  // POST /organizacoes — Cadastrar
  app.post('/organizacoes', async (request, reply) => {
    const data = criarOrganizacaoSchema.parse(request.body)
    const org = await criarOrganizacao(data)
    return reply.status(201).send(org)
  })

  // GET /organizacoes — Listar
  app.get('/organizacoes', async (_request, reply) => {
    return reply.send(await listarOrganizacoes())
  })

  // GET /organizacoes/:id — Buscar
  app.get('/organizacoes/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const org = await buscarOrganizacao(id)
    if (!org) return reply.status(404).send({ error: 'Organização não encontrada' })
    return reply.send(org)
  })

  // PATCH /organizacoes/:id — Atualizar dados
  app.patch('/organizacoes/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const data = atualizarOrganizacaoSchema.parse(request.body)
    const org = await atualizarOrganizacao(id, data)
    return reply.send(org)
  })

  // PATCH /organizacoes/:id/status — Ativar/desativar
  app.patch('/organizacoes/:id/status', async (request, reply) => {
    const { id } = request.params as { id: string }
    const data = statusOrganizacaoSchema.parse(request.body)
    const org = await alterarStatusOrganizacao(id, data)
    return reply.send(org)
  })
}