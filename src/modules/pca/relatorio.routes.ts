// ============================================================
// ROUTES — Módulo PCA: Relatórios de execução (Tela 9)
// backend/src/modules/pca/relatorio.routes.ts
// ============================================================

import { FastifyInstance } from 'fastify'
import {
  listarItensExecucao,
  atualizarSituacaoExecucao,
  listarHistoricoRelatorios,
  gerarRelatorioTrimestral,
  gerarRelatorioSimplificado,
} from './relatorio.service'

export async function relatorioRoutes(app: FastifyInstance) {

  // GET /pca/execucao/itens?idOrganizacao=&idPlano=
  app.get('/pca/execucao/itens', async (request, reply) => {
    const { idOrganizacao, idPlano } = request.query as { idOrganizacao: string; idPlano: string }
    if (!idOrganizacao || !idPlano) return reply.status(400).send({ erro: 'idOrganizacao e idPlano são obrigatórios' })
    try {
      return reply.send(await listarItensExecucao(idOrganizacao, idPlano))
    } catch (err: any) { return reply.status(400).send({ erro: err.message }) }
  })

  // PATCH /pca/execucao/itens/:id — atualizar situação de execução (declaração manual)
  app.patch('/pca/execucao/itens/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const { idOrganizacao, idUsuario, situacao } = request.body as { idOrganizacao: string; idUsuario: string; situacao: string }
    try {
      return reply.send(await atualizarSituacaoExecucao(id, { idOrganizacao, idUsuario, situacao }))
    } catch (err: any) { return reply.status(400).send({ erro: err.message }) }
  })

  // GET /pca/execucao/historico?idOrganizacao=&idPlano=
  app.get('/pca/execucao/historico', async (request, reply) => {
    const { idOrganizacao, idPlano } = request.query as { idOrganizacao: string; idPlano: string }
    if (!idOrganizacao || !idPlano) return reply.status(400).send({ erro: 'idOrganizacao e idPlano são obrigatórios' })
    try {
      return reply.send(await listarHistoricoRelatorios(idOrganizacao, idPlano))
    } catch (err: any) { return reply.status(400).send({ erro: err.message }) }
  })

  // POST /pca/execucao/relatorio-trimestral — gera o PDF e registra no histórico
  app.post('/pca/execucao/relatorio-trimestral', async (request, reply) => {
    const { idOrganizacao, idPlano, trimestre, idUsuario } = request.body as {
      idOrganizacao: string; idPlano: string; trimestre: number; idUsuario: string
    }
    try {
      const pdf = await gerarRelatorioTrimestral({ idOrganizacao, idPlano, trimestre, idUsuario })
      reply.header('Content-Type', 'application/pdf')
      reply.header('Content-Disposition', `attachment; filename=relatorio-trimestral-${trimestre}tri.pdf`)
      return reply.send(pdf)
    } catch (err: any) { return reply.status(400).send({ erro: err.message }) }
  })

  // POST /pca/execucao/relatorio-simplificado — gera o PDF, publica no sítio e registra no histórico
  app.post('/pca/execucao/relatorio-simplificado', async (request, reply) => {
    const { idOrganizacao, idPlano, idUsuario } = request.body as { idOrganizacao: string; idPlano: string; idUsuario: string }
    try {
      const pdf = await gerarRelatorioSimplificado({ idOrganizacao, idPlano, idUsuario })
      reply.header('Content-Type', 'application/pdf')
      reply.header('Content-Disposition', 'attachment; filename=relatorio-simplificado-pca.pdf')
      return reply.send(pdf)
    } catch (err: any) { return reply.status(400).send({ erro: err.message }) }
  })
}
