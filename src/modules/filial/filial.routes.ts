import { FastifyInstance } from 'fastify'
import { criarFilialSchema, atualizarFilialSchema } from './filial.schema'
import {
  criarFilial,
  listarFiliais,
  buscarFilial,
  atualizarFilial,
  ativarDesativarFilial,
  deletarFilial,
} from './filial.service'

export async function filialRoutes(app: FastifyInstance) {
  // Listar filiais de uma organização
  app.get('/filiais', async (request, reply) => {
    const { idOrganizacao } = request.query as { idOrganizacao: string }
    if (!idOrganizacao)
      return reply.status(400).send({ error: 'idOrganizacao obrigatorio' })
    return listarFiliais(idOrganizacao)
  })

  // Buscar filial por ID
  app.get('/filiais/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const filial = await buscarFilial(id)
    if (!filial) return reply.status(404).send({ error: 'Filial não encontrada' })
    return filial
  })

  // Criar filial
  app.post('/filiais', async (request, reply) => {
    try {
      const data = criarFilialSchema.parse(request.body)
      const filial = await criarFilial(data)
      return reply.status(201).send(filial)
    } catch (err: any) {
      return reply.status(400).send({ error: err.message })
    }
  })

  // Atualizar filial
  app.put('/filiais/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string }
      const data = atualizarFilialSchema.parse(request.body)
      const filial = await atualizarFilial(id, data)
      return reply.send(filial)
    } catch (err: any) {
      return reply.status(400).send({ error: err.message })
    }
  })

  // Ativar / desativar filial
  app.patch('/filiais/:id/status', async (request, reply) => {
    try {
      const { id } = request.params as { id: string }
      const { ativo } = request.body as { ativo: boolean }
      if (typeof ativo !== 'boolean')
        return reply.status(400).send({ error: 'Campo "ativo" (boolean) obrigatorio' })
      const filial = await ativarDesativarFilial(id, ativo)
      return reply.send(filial)
    } catch (err: any) {
      return reply.status(400).send({ error: err.message })
    }
  })

  // Deletar filial
  app.delete('/filiais/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string }
      const resultado = await deletarFilial(id)
      return reply.status(200).send(resultado)
    } catch (err: any) {
      return reply.status(400).send({ error: err.message })
    }
  })
}
