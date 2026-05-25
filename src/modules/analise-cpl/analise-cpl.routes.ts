// ============================================================
// ROUTES — Módulo 2: Análise Inicial (Compras / CPL)
// backend/src/modules/analise-cpl/analise-cpl.routes.ts
// ============================================================

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { z } from 'zod'
import {
  receberSolicitacao,
  salvarChecklist,
  aprovarAnaliseInicial,
  devolverParaAjuste,
  reprovarSolicitacao,
  obterFilaCpl,
  obterDetalheAnalise,
  listarMotivos,
  verificarAtrasos,
} from './analise-cpl.service'

// ── Schemas de validação (Zod) ───────────────────────────────
const checklistSchema = z.object({
  conformidadeDocumental: z.boolean().nullable().optional(),
  qualidadeTR:            z.boolean().nullable().optional(),
  coerenciaEstimativa:    z.boolean().nullable().optional(),
  enquadramentoLegal:     z.boolean().nullable().optional(),
  viabilidade:            z.boolean().nullable().optional(),
  adequacaoPCA:           z.boolean().nullable().optional(),
  riscoContratacao:       z.enum(['BAIXO', 'MEDIO', 'ALTO']).nullable().optional(),
})

const idParamSchema = z.object({
  id: z.string().uuid('ID do pedido inválido'),
})

const receberSchema = z.object({
  idAnalista: z.string().uuid().optional(), // se omitido, usa o usuário do token
})

const checklistBodySchema = z.object({
  checklist:        checklistSchema,
  riscosObservados: z.string().max(2000).optional(),
})

const aprovarSchema = z.object({
  parecerTecnico: z.string().min(20, 'Parecer técnico deve ter pelo menos 20 caracteres').max(5000),
  checklist:      checklistSchema.optional(),
})

const devolverSchema = z.object({
  idMotivo:    z.number().int().positive(),
  motivoTexto: z.string().max(1000).optional(),
  pendencias:  z.string().min(10, 'Descreva as pendências (mínimo 10 caracteres)').max(5000),
})

const reprovarSchema = z.object({
  idMotivo:      z.number().int().positive(),
  motivoTexto:   z.string().max(1000).optional(),
  justificativa: z.string().min(20, 'Justificativa deve ter pelo menos 20 caracteres').max(5000),
})

const filaQuerySchema = z.object({
  idAnalista: z.string().uuid().optional(),
  emAtraso:   z.coerce.boolean().optional(),
  urgente:    z.coerce.boolean().optional(),
})

// ── Helper: extrai dados do token JWT ───────────────────────
function getTokenData(request: FastifyRequest) {
  const user = (request as any).user as {
    sub:           string
    idOrganizacao: string
    perfil:        string
  }
  return user
}

// ── Registro das rotas ────────────────────────────────────────
export async function analiseCplRoutes(app: FastifyInstance) {

  // ── GET /analise-cpl/motivos ─────────────────────────────
  // Lista motivos predefinidos de devolução e/ou reprovação
  app.get('/analise-cpl/motivos', async (request: FastifyRequest, reply: FastifyReply) => {
    const { tipo } = request.query as { tipo?: 'DEVOLUCAO' | 'REPROVACAO' }

    const motivos = await listarMotivos(tipo)
    return reply.send({ motivos })
  })

  // ── GET /analise-cpl/fila ────────────────────────────────
  // Fila de pedidos aguardando análise da CPL
  app.get('/analise-cpl/fila', async (request: FastifyRequest, reply: FastifyReply) => {
    const { idOrganizacao } = getTokenData(request)

    const query = filaQuerySchema.safeParse(request.query)
    if (!query.success) {
      return reply.status(400).send({ erro: query.error.issues })
    }

    const fila = await obterFilaCpl(idOrganizacao, query.data)
    return reply.send({ total: fila.length, pedidos: fila })
  })

  // ── GET /analise-cpl/:id ─────────────────────────────────
  // Detalhe completo de um pedido para a tela de análise CPL
  app.get('/analise-cpl/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const { idOrganizacao } = getTokenData(request)

    const param = idParamSchema.safeParse(request.params)
    if (!param.success) {
      return reply.status(400).send({ erro: 'ID de pedido inválido' })
    }

    try {
      const detalhe = await obterDetalheAnalise(param.data.id, idOrganizacao)
      return reply.send(detalhe)
    } catch (err: any) {
      return reply.status(404).send({ erro: err.message })
    }
  })

  // ── POST /analise-cpl/:id/receber ────────────────────────
  // CPL recebe o pedido e inicia análise formal (status 2 → 3)
  app.post('/analise-cpl/:id/receber', async (request: FastifyRequest, reply: FastifyReply) => {
    const { sub, idOrganizacao } = getTokenData(request)

    const param = idParamSchema.safeParse(request.params)
    if (!param.success) {
      return reply.status(400).send({ erro: 'ID de pedido inválido' })
    }

    const body = receberSchema.safeParse(request.body)
    if (!body.success) {
      return reply.status(400).send({ erro: body.error.issues })
    }

    try {
      const resultado = await receberSolicitacao({
        idPedido:      param.data.id,
        idOrganizacao,
        idAnalista:    body.data.idAnalista ?? sub,
      })
      return reply.status(201).send(resultado)
    } catch (err: any) {
      const status = err.message.includes('permissão') ? 403
                   : err.message.includes('não encontrado') ? 404
                   : 400
      return reply.status(status).send({ erro: err.message })
    }
  })

  // ── PUT /analise-cpl/:id/checklist ───────────────────────
  // Salva progresso do checklist de análise (sem encerrar)
  app.put('/analise-cpl/:id/checklist', async (request: FastifyRequest, reply: FastifyReply) => {
    const { sub, idOrganizacao } = getTokenData(request)

    const param = idParamSchema.safeParse(request.params)
    if (!param.success) {
      return reply.status(400).send({ erro: 'ID de pedido inválido' })
    }

    const body = checklistBodySchema.safeParse(request.body)
    if (!body.success) {
      return reply.status(400).send({ erro: body.error.issues })
    }

    try {
      const analise = await salvarChecklist({
        idPedido:         param.data.id,
        idOrganizacao,
        idAnalista:       sub,
        checklist:        body.data.checklist,
        riscosObservados: body.data.riscosObservados,
      })
      return reply.send({ analise })
    } catch (err: any) {
      const status = err.message.includes('permissão') ? 403
                   : err.message.includes('não encontrado') ? 404
                   : 400
      return reply.status(status).send({ erro: err.message })
    }
  })

  // ── POST /analise-cpl/:id/aprovar ────────────────────────
  // Aprova a análise inicial (status 3 → 5), encaminha para M3
  app.post('/analise-cpl/:id/aprovar', async (request: FastifyRequest, reply: FastifyReply) => {
    const { sub, idOrganizacao } = getTokenData(request)

    const param = idParamSchema.safeParse(request.params)
    if (!param.success) {
      return reply.status(400).send({ erro: 'ID de pedido inválido' })
    }

    const body = aprovarSchema.safeParse(request.body)
    if (!body.success) {
      return reply.status(400).send({ erro: body.error.issues })
    }

    try {
      const analise = await aprovarAnaliseInicial({
        idPedido:       param.data.id,
        idOrganizacao,
        idAnalista:     sub,
        parecerTecnico: body.data.parecerTecnico,
        checklist:      body.data.checklist,
      })
      return reply.send({ analise, mensagem: 'Análise aprovada — encaminhada para Definição da Contratação' })
    } catch (err: any) {
      const status = err.message.includes('permissão') ? 403
                   : err.message.includes('não encontrado') ? 404
                   : 400
      return reply.status(status).send({ erro: err.message })
    }
  })

  // ── POST /analise-cpl/:id/devolver ──────────────────────
  // Devolve pedido para ajuste (status 3 → 12)
  app.post('/analise-cpl/:id/devolver', async (request: FastifyRequest, reply: FastifyReply) => {
    const { sub, idOrganizacao } = getTokenData(request)

    const param = idParamSchema.safeParse(request.params)
    if (!param.success) {
      return reply.status(400).send({ erro: 'ID de pedido inválido' })
    }

    const body = devolverSchema.safeParse(request.body)
    if (!body.success) {
      return reply.status(400).send({ erro: body.error.issues })
    }

    try {
      const analise = await devolverParaAjuste({
        idPedido:      param.data.id,
        idOrganizacao,
        idAnalista:    sub,
        idMotivo:      body.data.idMotivo,
        motivoTexto:   body.data.motivoTexto,
        pendencias:    body.data.pendencias,
      })
      return reply.send({ analise, mensagem: 'Pedido devolvido para ajuste — área demandante notificada' })
    } catch (err: any) {
      const status = err.message.includes('permissão') ? 403
                   : err.message.includes('não encontrado') ? 404
                   : 400
      return reply.status(status).send({ erro: err.message })
    }
  })

  // ── POST /analise-cpl/:id/reprovar ──────────────────────
  // Reprova a solicitação (status 3 → 6), encerra o fluxo
  app.post('/analise-cpl/:id/reprovar', async (request: FastifyRequest, reply: FastifyReply) => {
    const { sub, idOrganizacao } = getTokenData(request)

    const param = idParamSchema.safeParse(request.params)
    if (!param.success) {
      return reply.status(400).send({ erro: 'ID de pedido inválido' })
    }

    const body = reprovarSchema.safeParse(request.body)
    if (!body.success) {
      return reply.status(400).send({ erro: body.error.issues })
    }

    try {
      const analise = await reprovarSolicitacao({
        idPedido:      param.data.id,
        idOrganizacao,
        idAnalista:    sub,
        idMotivo:      body.data.idMotivo,
        motivoTexto:   body.data.motivoTexto,
        justificativa: body.data.justificativa,
      })
      return reply.send({ analise, mensagem: 'Solicitação reprovada — fluxo encerrado' })
    } catch (err: any) {
      const status = err.message.includes('permissão') ? 403
                   : err.message.includes('não encontrado') ? 404
                   : 400
      return reply.status(status).send({ erro: err.message })
    }
  })

  // ── POST /analise-cpl/verificar-atrasos ─────────────────
  // Endpoint para cron job: marca análises vencidas como em atraso
  app.post('/analise-cpl/verificar-atrasos', async (request: FastifyRequest, reply: FastifyReply) => {
    const { idOrganizacao, perfil } = getTokenData(request)

    if (!['Admin', 'GestorCompras'].includes(perfil)) {
      return reply.status(403).send({ erro: 'Apenas Admin ou GestorCompras pode executar esta ação' })
    }

    const resultado = await verificarAtrasos(idOrganizacao)
    return reply.send({ mensagem: `${resultado.marcadas} análise(s) marcada(s) como em atraso` })
  })
}
