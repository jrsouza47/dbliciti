import { FastifyInstance } from 'fastify'
import { buscarConfiguracoes, salvarConfiguracoes } from './configuracoes.service'

export async function configuracoesRoutes(app: FastifyInstance) {

  // GET /configuracoes/:idOrganizacao — retorna dicionário com valores atuais
  app.get('/configuracoes/:idOrganizacao', async (request, reply) => {
    const { idOrganizacao } = request.params as { idOrganizacao: string }

    try {
      const resultado = await buscarConfiguracoes(idOrganizacao)
      return reply.status(200).send(resultado)
    } catch (err: any) {
      return reply.status(404).send({ erro: err.message })
    }
  })

  // PATCH /configuracoes/:idOrganizacao — salva configurações da organização
  app.patch('/configuracoes/:idOrganizacao', async (request, reply) => {
    const { idOrganizacao } = request.params as { idOrganizacao: string }
    const body = request.body as Record<string, unknown>

    if (!body || Object.keys(body).length === 0) {
      return reply.status(400).send({ erro: 'Nenhuma configuração informada' })
    }

    try {
      const resultado = await salvarConfiguracoes(idOrganizacao, body)
      return reply.status(200).send(resultado)
    } catch (err: any) {
      return reply.status(400).send({ erro: err.message })
    }
  })
}