// ============================================================
// ROUTES — Módulo PCA: Aprovação (Tela 6)
// backend/src/modules/pca/aprovacao.routes.ts
// ============================================================

import { FastifyInstance } from 'fastify'
import {
  enviarParaAprovacao, listarFilaAprovacao, decidirAprovacaoIntermediaria, decidirAprovacao,
} from './aprovacao.service'

export async function aprovacaoRoutes(app: FastifyInstance) {

  // POST /pca/itens/:id/enviar-aprovacao
  app.post('/pca/itens/:id/enviar-aprovacao', async (request, reply) => {
    const { id } = request.params as { id: string }
    const { idOrganizacao } = request.body as { idOrganizacao: string }
    if (!idOrganizacao) return reply.status(400).send({ erro: 'idOrganizacao obrigatorio' })
    try {
      const item = await enviarParaAprovacao(id, idOrganizacao)
      return reply.send({ item })
    } catch (err: any) { return reply.status(400).send({ erro: err.message }) }
  })

  // GET /pca/aprovacao/fila?idOrganizacao=&idPlano=
  app.get('/pca/aprovacao/fila', async (request, reply) => {
    const { idOrganizacao, idPlano } = request.query as { idOrganizacao: string; idPlano?: string }
    if (!idOrganizacao) return reply.status(400).send({ erro: 'idOrganizacao obrigatorio' })
    try {
      const itens = await listarFilaAprovacao(idOrganizacao, idPlano)
      return reply.send({ total: itens.length, itens })
    } catch (err: any) { return reply.status(500).send({ erro: err.message }) }
  })

  // POST /pca/itens/:id/aprovacao-intermediaria
  app.post('/pca/itens/:id/aprovacao-intermediaria', async (request, reply) => {
    const { id } = request.params as { id: string }
    const { idOrganizacao, idUsuario } = request.body as { idOrganizacao: string; idUsuario: string }
    if (!idOrganizacao || !idUsuario) return reply.status(400).send({ erro: 'idOrganizacao e idUsuario obrigatorios' })
    try {
      const item = await decidirAprovacaoIntermediaria(id, { idOrganizacao, idUsuario })
      return reply.send({ item })
    } catch (err: any) { return reply.status(400).send({ erro: err.message }) }
  })

  // POST /pca/itens/:id/decidir-aprovacao
  app.post('/pca/itens/:id/decidir-aprovacao', async (request, reply) => {
    const { id } = request.params as { id: string }
    const { idOrganizacao, idUsuario, decisao, motivo } = request.body as {
      idOrganizacao: string; idUsuario: string; decisao: 'APROVAR' | 'REPROVAR' | 'DEVOLVER'; motivo?: string
    }
    if (!idOrganizacao || !idUsuario || !decisao) {
      return reply.status(400).send({ erro: 'idOrganizacao, idUsuario e decisao obrigatorios' })
    }
    try {
      const resultado = await decidirAprovacao(id, { idOrganizacao, idUsuario, decisao, motivo })
      return reply.send(resultado)
    } catch (err: any) { return reply.status(400).send({ erro: err.message }) }
  })
}
