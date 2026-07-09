// ============================================================
// ROUTES — Módulo PCA: Sugestões de IA
// backend/src/modules/pca/sugestao-ia.routes.ts
// ============================================================

import { FastifyInstance } from 'fastify'
import { listarSugestoesPendentes, decidirSugestao, gerarSugestoesParaDfd } from './sugestao-ia.service'

export async function sugestaoIaRoutes(app: FastifyInstance) {

  // GET /pca/sugestoes-ia?idOrganizacao=&idPlano=&tipo=
  app.get('/pca/sugestoes-ia', async (request, reply) => {
    const { idOrganizacao, idPlano, tipo } = request.query as { idOrganizacao: string; idPlano?: string; tipo?: string }
    if (!idOrganizacao) return reply.status(400).send({ erro: 'idOrganizacao obrigatorio' })
    try {
      const sugestoes = await listarSugestoesPendentes(idOrganizacao, { idPlano, tipo })
      return reply.send({ total: sugestoes.length, sugestoes })
    } catch (err: any) { return reply.status(500).send({ erro: err.message }) }
  })

  // POST /pca/sugestoes-ia/:id/decidir
  app.post('/pca/sugestoes-ia/:id/decidir', async (request, reply) => {
    const { id } = request.params as { id: string }
    const { idOrganizacao, idUsuario, decisao, motivoRejeicao } = request.body as {
      idOrganizacao: string; idUsuario: string; decisao: 'ACEITA' | 'REJEITADA'; motivoRejeicao?: string
    }
    if (!idOrganizacao || !idUsuario || !decisao) {
      return reply.status(400).send({ erro: 'idOrganizacao, idUsuario e decisao obrigatorios' })
    }
    try {
      const sugestao = await decidirSugestao(id, { idOrganizacao, idUsuario, decisao, motivoRejeicao })
      return reply.send({ sugestao })
    } catch (err: any) { return reply.status(400).send({ erro: err.message }) }
  })

  // POST /pca/sugestoes-ia/gerar/:idDfd — reprocessamento manual (ex.: apos atualizar precos de referencia)
  app.post('/pca/sugestoes-ia/gerar/:idDfd', async (request, reply) => {
    const { idDfd } = request.params as { idDfd: string }
    try {
      const sugestoes = await gerarSugestoesParaDfd(idDfd)
      return reply.send({ sugestoes })
    } catch (err: any) { return reply.status(400).send({ erro: err.message }) }
  })
}
