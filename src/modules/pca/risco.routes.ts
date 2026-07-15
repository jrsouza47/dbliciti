// ============================================================
// ROUTES — Módulo PCA: Gestão de riscos (Tela 5)
// backend/src/modules/pca/risco.routes.ts
// ============================================================

import { FastifyInstance } from 'fastify'
import { listarRiscosItemPca, criarRiscoItemPca, excluirRiscoItemPca } from './risco.service'

export async function riscoRoutes(app: FastifyInstance) {

  // GET /pca/itens/:idItemPca/riscos?idOrganizacao=
  app.get('/pca/itens/:idItemPca/riscos', async (request, reply) => {
    const { idItemPca } = request.params as { idItemPca: string }
    const { idOrganizacao } = request.query as { idOrganizacao: string }
    if (!idOrganizacao) return reply.status(400).send({ erro: 'idOrganizacao obrigatorio' })
    try {
      const riscos = await listarRiscosItemPca(idItemPca, idOrganizacao)
      return reply.send({ total: riscos.length, riscos })
    } catch (err: any) { return reply.status(404).send({ erro: err.message }) }
  })

  // POST /pca/itens/:idItemPca/riscos
  app.post('/pca/itens/:idItemPca/riscos', async (request, reply) => {
    const { idItemPca } = request.params as { idItemPca: string }
    const body = request.body as any
    if (!body.idOrganizacao || !body.hipotese || !body.probabilidade || !body.impacto || !body.medidaPreventiva || !body.medidaMitigadora) {
      return reply.status(400).send({
        erro: 'idOrganizacao, hipotese, probabilidade, impacto, medidaPreventiva e medidaMitigadora obrigatorios',
      })
    }
    try {
      const risco = await criarRiscoItemPca({ ...body, idItemPca })
      return reply.status(201).send({ risco })
    } catch (err: any) { return reply.status(400).send({ erro: err.message }) }
  })

  // DELETE /pca/riscos/:id?idOrganizacao=
  app.delete('/pca/riscos/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const { idOrganizacao } = request.query as { idOrganizacao: string }
    if (!idOrganizacao) return reply.status(400).send({ erro: 'idOrganizacao obrigatorio' })
    try {
      const resultado = await excluirRiscoItemPca(id, idOrganizacao)
      return reply.send(resultado)
    } catch (err: any) { return reply.status(400).send({ erro: err.message }) }
  })
}
