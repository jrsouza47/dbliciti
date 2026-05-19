import { FastifyInstance } from 'fastify'
import { criarFilialSchema, atualizarFilialSchema } from './filial.schema'
import {
  criarFilial,
  listarFiliais,
  listarFiliaisUsuario,
  buscarFilial,
  atualizarFilial,
  ativarDesativarFilial,
  deletarFilial,
} from './filial.service'
import { verificarToken } from '../auth/auth.routes'

export async function filialRoutes(app: FastifyInstance) {

  // GET /filiais — lista filiais reais (sem virtuais) de uma organizacao
  app.get('/filiais', async (request, reply) => {
    const { idOrganizacao } = request.query as { idOrganizacao: string }
    if (!idOrganizacao)
      return reply.status(400).send({ error: 'idOrganizacao obrigatorio' })
    return listarFiliais(idOrganizacao)
  })

  // GET /filiais/usuario — lista filiais vinculadas ao usuario logado
  // Usado pelo Topbar para exibir o seletor de troca de filial
  app.get('/filiais/usuario', async (request, reply) => {
    const authHeader = request.headers.authorization
    if (!authHeader?.startsWith('Bearer ')) {
      return reply.status(401).send({ error: 'Token nao fornecido' })
    }
    try {
      const payload = verificarToken(authHeader.slice(7))
      if (!payload.usaFiliais) {
        return reply.send({ filiais: [] })
      }
      const filiais = await listarFiliaisUsuario(payload.sub, payload.idOrganizacao)
      return reply.send({ filiais })
    } catch {
      return reply.status(401).send({ error: 'Token invalido ou expirado' })
    }
  })

  // GET /filiais/:id
  app.get('/filiais/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const filial = await buscarFilial(id)
    if (!filial) return reply.status(404).send({ error: 'Filial nao encontrada' })
    return filial
  })

  // POST /filiais
  app.post('/filiais', async (request, reply) => {
    try {
      const data = criarFilialSchema.parse(request.body)
      const filial = await criarFilial(data)
      return reply.status(201).send(filial)
    } catch (err: any) {
      return reply.status(400).send({ error: err.message })
    }
  })

  // PUT /filiais/:id
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

  // PATCH /filiais/:id/status
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

  // DELETE /filiais/:id
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
