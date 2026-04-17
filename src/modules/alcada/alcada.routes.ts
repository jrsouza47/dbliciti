import { FastifyInstance } from 'fastify'
import {
  criarAlcadaSchema,
  atualizarAlcadaSchema,
  criarUsuarioAlcadaSchema,
  atualizarUsuarioAlcadaSchema,
} from './alcada.schema'
import {
  listarAlcadas,
  buscarAlcada,
  criarAlcada,
  atualizarAlcada,
  adicionarUsuario,
  atualizarUsuario,
  removerUsuario,
} from './alcada.service'

export async function alcadaRoutes(app: FastifyInstance) {

  // GET /alcadas?idOrganizacao=
  app.get('/alcadas', async (request, reply) => {
    const { idOrganizacao } = request.query as { idOrganizacao: string }
    if (!idOrganizacao) return reply.status(400).send({ error: 'idOrganizacao obrigatorio' })
    return reply.send(await listarAlcadas(idOrganizacao))
  })

  // GET /alcadas/:id
  app.get('/alcadas/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const alcada = await buscarAlcada(id)
    if (!alcada) return reply.status(404).send({ error: 'Alcada nao encontrada' })
    return reply.send(alcada)
  })

  // POST /alcadas
  app.post('/alcadas', async (request, reply) => {
    try {
      const data = criarAlcadaSchema.parse(request.body)
      const alcada = await criarAlcada(data)
      return reply.status(201).send(alcada)
    } catch (err: any) {
      return reply.status(400).send({ error: err.message })
    }
  })

  // PATCH /alcadas/:id
  app.patch('/alcadas/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    try {
      const data = atualizarAlcadaSchema.parse(request.body)
      return reply.send(await atualizarAlcada(id, data))
    } catch (err: any) {
      return reply.status(400).send({ error: err.message })
    }
  })

  // POST /alcadas/:id/usuarios — adicionar usuário
  app.post('/alcadas/:id/usuarios', async (request, reply) => {
    const { id } = request.params as { id: string }
    try {
      const data = criarUsuarioAlcadaSchema.parse(request.body)
      return reply.status(201).send(await adicionarUsuario(id, data))
    } catch (err: any) {
      return reply.status(400).send({ error: err.message })
    }
  })

  // PATCH /alcadas/:id/usuarios/:idUsuarioAlcada — atualizar status
  app.patch('/alcadas/:id/usuarios/:idUsuarioAlcada', async (request, reply) => {
    const { idUsuarioAlcada } = request.params as { id: string; idUsuarioAlcada: string }
    const data = atualizarUsuarioAlcadaSchema.parse(request.body)
    return reply.send(await atualizarUsuario(idUsuarioAlcada, data))
  })

  // DELETE /alcadas/:id/usuarios/:idUsuarioAlcada — bloquear usuário
  app.delete('/alcadas/:id/usuarios/:idUsuarioAlcada', async (request, reply) => {
    const { idUsuarioAlcada } = request.params as { id: string; idUsuarioAlcada: string }
    await removerUsuario(idUsuarioAlcada)
    return reply.status(204).send()
  })
}
