import { FastifyInstance } from 'fastify'
import { detectarDuplicatas } from './catalogo.duplicatas'

export async function catalogoDuplicatasRoutes(app: FastifyInstance) {
  app.get('/itens/duplicatas', async (request, reply) => {
    // ID fixo de teste — mesmo usado em toda a API
    const idOrganizacao = '00000000-0000-0000-0000-000000000001'

    const resultado = await detectarDuplicatas(idOrganizacao)

    return reply.status(200).send(resultado)
  })
}