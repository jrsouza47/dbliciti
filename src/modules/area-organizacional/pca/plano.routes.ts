// ============================================================
// ROUTES — Módulo PCA: Plano de Contratações Anual
// backend/src/modules/pca/plano.routes.ts
// ============================================================

import { FastifyInstance } from 'fastify'
import { obterOuCriarPlanoDoAno, listarPlanos, obterDetalhePlano, obterPainel } from './plano.service'

export async function planoRoutes(app: FastifyInstance) {

  // GET /pca/planos?idOrganizacao=
  app.get('/pca/planos', async (request, reply) => {
    const { idOrganizacao } = request.query as { idOrganizacao: string }
    if (!idOrganizacao) return reply.status(400).send({ erro: 'idOrganizacao obrigatorio' })
    try {
      const planos = await listarPlanos(idOrganizacao)
      return reply.send({ total: planos.length, planos })
    } catch (err: any) { return reply.status(500).send({ erro: err.message }) }
  })

  // POST /pca/planos — cria (ou retorna) o plano do exercicio informado
  app.post('/pca/planos', async (request, reply) => {
    const { idOrganizacao, ano } = request.body as { idOrganizacao: string; ano: number }
    if (!idOrganizacao || !ano) return reply.status(400).send({ erro: 'idOrganizacao e ano obrigatorios' })
    try {
      const plano = await obterOuCriarPlanoDoAno(idOrganizacao, ano)
      return reply.status(201).send({ plano })
    } catch (err: any) { return reply.status(400).send({ erro: err.message }) }
  })

  // GET /pca/planos/:id?idOrganizacao=
  app.get('/pca/planos/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const { idOrganizacao } = request.query as { idOrganizacao: string }
    if (!idOrganizacao) return reply.status(400).send({ erro: 'idOrganizacao obrigatorio' })
    try {
      const plano = await obterDetalhePlano(id, idOrganizacao)
      return reply.send(plano)
    } catch (err: any) { return reply.status(404).send({ erro: err.message }) }
  })

  // GET /pca/planos/:id/painel?idOrganizacao= — Tela 1: Painel do PCA
  app.get('/pca/planos/:id/painel', async (request, reply) => {
    const { id } = request.params as { id: string }
    const { idOrganizacao } = request.query as { idOrganizacao: string }
    if (!idOrganizacao) return reply.status(400).send({ erro: 'idOrganizacao obrigatorio' })
    try {
      const painel = await obterPainel(idOrganizacao, id)
      return reply.send(painel)
    } catch (err: any) { return reply.status(500).send({ erro: err.message }) }
  })
}
