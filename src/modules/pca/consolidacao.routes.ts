// ============================================================
// ROUTES — Módulo PCA: Consolidação (CPLIC)
// backend/src/modules/pca/consolidacao.routes.ts
// ============================================================

import { FastifyInstance } from 'fastify'
import {
  listarCandidatosConsolidacao, consolidarDemandas,
  listarItensPca, obterDetalheItemPca, definirCalendarioItemPca,
} from './consolidacao.service'

export async function consolidacaoRoutes(app: FastifyInstance) {

  // GET /pca/consolidacao/candidatos?idOrganizacao=&idPlano=
  app.get('/pca/consolidacao/candidatos', async (request, reply) => {
    const { idOrganizacao, idPlano } = request.query as { idOrganizacao: string; idPlano: string }
    if (!idOrganizacao || !idPlano) return reply.status(400).send({ erro: 'idOrganizacao e idPlano obrigatorios' })
    try {
      const candidatas = await listarCandidatosConsolidacao(idOrganizacao, idPlano)
      return reply.send({ total: candidatas.length, demandas: candidatas })
    } catch (err: any) { return reply.status(500).send({ erro: err.message }) }
  })

  // POST /pca/consolidacao
  app.post('/pca/consolidacao', async (request, reply) => {
    const body = request.body as any
    if (!body.idOrganizacao || !body.idPlano || !Array.isArray(body.idsDfd) || !body.idUsuarioConsolidador) {
      return reply.status(400).send({ erro: 'idOrganizacao, idPlano, idsDfd[] e idUsuarioConsolidador obrigatorios' })
    }
    try {
      const itemPca = await consolidarDemandas(body)
      return reply.status(201).send({ itemPca, mensagem: 'Demandas consolidadas em Item PCA' })
    } catch (err: any) { return reply.status(400).send({ erro: err.message }) }
  })

  // GET /pca/itens?idOrganizacao=&idPlano=&status=
  app.get('/pca/itens', async (request, reply) => {
    const { idOrganizacao, idPlano, status } = request.query as { idOrganizacao: string; idPlano?: string; status?: string }
    if (!idOrganizacao) return reply.status(400).send({ erro: 'idOrganizacao obrigatorio' })
    try {
      const itens = await listarItensPca(idOrganizacao, { idPlano, status: status ? Number(status) : undefined })
      return reply.send({ total: itens.length, itens })
    } catch (err: any) { return reply.status(500).send({ erro: err.message }) }
  })

  // GET /pca/itens/:id?idOrganizacao=
  app.get('/pca/itens/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const { idOrganizacao } = request.query as { idOrganizacao: string }
    if (!idOrganizacao) return reply.status(400).send({ erro: 'idOrganizacao obrigatorio' })
    try {
      const item = await obterDetalheItemPca(id, idOrganizacao)
      return reply.send(item)
    } catch (err: any) { return reply.status(404).send({ erro: err.message }) }
  })

  // PUT /pca/itens/:id/calendario
  app.put('/pca/itens/:id/calendario', async (request, reply) => {
    const { id } = request.params as { id: string }
    const { idOrganizacao, idItemPcaDependencia, dataPrevistaLicitacao } = request.body as {
      idOrganizacao: string; idItemPcaDependencia?: string; dataPrevistaLicitacao?: string
    }
    if (!idOrganizacao) return reply.status(400).send({ erro: 'idOrganizacao obrigatorio' })
    try {
      const item = await definirCalendarioItemPca(id, { idOrganizacao, idItemPcaDependencia, dataPrevistaLicitacao })
      return reply.send({ item })
    } catch (err: any) { return reply.status(400).send({ erro: err.message }) }
  })
}
