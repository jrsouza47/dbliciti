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
import { verificarToken } from '../auth/auth.routes'

export async function organizacaoRoutes(app: FastifyInstance) {
  // POST /organizacoes — Cadastrar
  app.post('/organizacoes', async (request, reply) => {
    const data = criarOrganizacaoSchema.parse(request.body)
    const org = await criarOrganizacao(data)
    return reply.status(201).send(org)
  })

  // GET /organizacoes — Listar
  // Admin/Administrador/Gestor veem todas; demais veem apenas a sua org
  app.get('/organizacoes', async (request, reply) => {
    const authHeader = request.headers.authorization
    if (!authHeader?.startsWith('Bearer ')) {
      return reply.status(401).send({ error: 'Token nao fornecido' })
    }
    try {
      const payload = verificarToken(authHeader.slice(7))
      const perfisAdmin = ['Admin', 'Administrador', 'Gestor']
      if (perfisAdmin.includes(payload.perfil)) {
        return reply.send(await listarOrganizacoes())
      }
      // Usuarios comuns: apenas a org deles
      const org = await buscarOrganizacao(payload.idOrganizacao)
      return reply.send(org ? [org] : [])
    } catch {
      return reply.status(401).send({ error: 'Token invalido ou expirado' })
    }
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