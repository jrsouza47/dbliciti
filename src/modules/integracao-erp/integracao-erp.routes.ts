// ============================================================
// ROUTES — Integração com ERP externo
// backend/src/modules/integracao-erp/integracao-erp.routes.ts
// ============================================================

import { FastifyInstance } from 'fastify'
import {
  buscarIntegracaoErp, salvarIntegracaoErp,
  sincronizarItensErp, sincronizarTodasIntegracoesAtivas,
} from './integracao-erp.service'
import { SISTEMAS_ERP, TIPOS_AUTENTICACAO } from './integracao-erp.constants'

// Segredo simples para proteger o gatilho da rotina diária — não é uma
// rota de usuário, é chamada pelo agendador externo (Render Cron Job ou
// equivalente). Defina CRON_SECRET em produção.
const CRON_SECRET = process.env.CRON_SECRET ?? 'dbliciti-cron-dev-troque-em-producao'

export async function integracaoErpRoutes(app: FastifyInstance) {

  // GET /integracao-erp/opcoes — listas para os selects da Tela 7
  app.get('/integracao-erp/opcoes', async (_request, reply) => {
    return reply.send({ sistemasErp: SISTEMAS_ERP, tiposAutenticacao: TIPOS_AUTENTICACAO })
  })

  // GET /integracao-erp/:idOrganizacao
  app.get('/integracao-erp/:idOrganizacao', async (request, reply) => {
    const { idOrganizacao } = request.params as { idOrganizacao: string }
    try {
      const integracao = await buscarIntegracaoErp(idOrganizacao)
      return reply.send({ integracao })
    } catch (err: any) { return reply.status(500).send({ erro: err.message }) }
  })

  // PUT /integracao-erp/:idOrganizacao
  app.put('/integracao-erp/:idOrganizacao', async (request, reply) => {
    const { idOrganizacao } = request.params as { idOrganizacao: string }
    const body = request.body as any
    try {
      const integracao = await salvarIntegracaoErp(idOrganizacao, body)
      return reply.send({ integracao })
    } catch (err: any) { return reply.status(400).send({ erro: err.message }) }
  })

  // POST /integracao-erp/:idOrganizacao/sincronizar — disparo manual (botão na Tela 7)
  app.post('/integracao-erp/:idOrganizacao/sincronizar', async (request, reply) => {
    const { idOrganizacao } = request.params as { idOrganizacao: string }
    try {
      const resultado = await sincronizarItensErp(idOrganizacao)
      return reply.send({ ...resultado, mensagem: 'Sincronização concluída' })
    } catch (err: any) { return reply.status(400).send({ erro: err.message }) }
  })

  // POST /integracao-erp/sincronizar-todas — gatilho da rotina diária (agendador externo)
  app.post('/integracao-erp/sincronizar-todas', async (request, reply) => {
    const segredo = request.headers['x-cron-secret']
    if (segredo !== CRON_SECRET) {
      return reply.status(401).send({ erro: 'Não autorizado' })
    }
    const resultados = await sincronizarTodasIntegracoesAtivas()
    return reply.send({ resultados })
  })
}
