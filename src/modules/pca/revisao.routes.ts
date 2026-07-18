// ============================================================
// ROUTES — Módulo PCA: Revisão e redimensionamento (Tela 10)
// backend/src/modules/pca/revisao.routes.ts
// ============================================================

import { FastifyInstance } from 'fastify'
import {
  listarPropostas,
  criarProposta,
  decidirProposta,
  publicarRevisaoNoSitio,
  listarHistoricoVersoes,
} from './revisao.service'
import { dentroJanelaRevisao } from './pca.constants'

export async function revisaoRoutes(app: FastifyInstance) {

  // GET /pca/revisao/janela — status atual da janela (pra tela mostrar o badge)
  app.get('/pca/revisao/janela', async (_request, reply) => {
    return reply.send({ dentroJanela: dentroJanelaRevisao() })
  })

  // GET /pca/revisao/propostas?idOrganizacao=&idPlano=
  app.get('/pca/revisao/propostas', async (request, reply) => {
    const { idOrganizacao, idPlano } = request.query as { idOrganizacao: string; idPlano: string }
    if (!idOrganizacao || !idPlano) return reply.status(400).send({ erro: 'idOrganizacao e idPlano são obrigatórios' })
    try {
      return reply.send(await listarPropostas(idOrganizacao, idPlano))
    } catch (err: any) { return reply.status(400).send({ erro: err.message }) }
  })

  // POST /pca/revisao/propostas
  app.post('/pca/revisao/propostas', async (request, reply) => {
    try {
      return reply.status(201).send(await criarProposta(request.body as any))
    } catch (err: any) { return reply.status(400).send({ erro: err.message }) }
  })

  // POST /pca/revisao/propostas/:id/decidir
  app.post('/pca/revisao/propostas/:id/decidir', async (request, reply) => {
    const { id } = request.params as { id: string }
    const { idOrganizacao, idUsuario, decisao, parecer } = request.body as {
      idOrganizacao: string; idUsuario: string; decisao: 'APROVAR' | 'REJEITAR'; parecer?: string
    }
    try {
      return reply.send(await decidirProposta(id, { idOrganizacao, idUsuario, decisao, parecer }))
    } catch (err: any) { return reply.status(400).send({ erro: err.message }) }
  })

  // POST /pca/revisao/propostas/:id/publicar-sitio
  app.post('/pca/revisao/propostas/:id/publicar-sitio', async (request, reply) => {
    const { id } = request.params as { id: string }
    const { idOrganizacao } = request.body as { idOrganizacao: string }
    try {
      return reply.send(await publicarRevisaoNoSitio(id, idOrganizacao))
    } catch (err: any) { return reply.status(400).send({ erro: err.message }) }
  })

  // GET /pca/revisao/historico-versoes?idOrganizacao=&ano= — Tela 11
  app.get('/pca/revisao/historico-versoes', async (request, reply) => {
    const { idOrganizacao, ano } = request.query as { idOrganizacao: string; ano: string }
    if (!idOrganizacao || !ano) return reply.status(400).send({ erro: 'idOrganizacao e ano são obrigatórios' })
    try {
      return reply.send(await listarHistoricoVersoes(idOrganizacao, Number(ano)))
    } catch (err: any) { return reply.status(400).send({ erro: err.message }) }
  })
}
