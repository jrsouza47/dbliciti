// ============================================================
// ROUTES — Módulo 3: Definição da Contratação
// backend/src/modules/definicao-contratacao/definicao-contratacao.routes.ts
// ============================================================

import { FastifyInstance } from 'fastify'
import {
  receberDefinicao,
  salvarDefinicao,
  concluirDefinicao,
  ajusteInterno,
  reprovarDefinicao,
  obterFilaDefinicao,
  obterDetalheDefinicao,
  consultarSugestao,
  verificarAtrasos,
} from './definicao-contratacao.service'

export async function definicaoContratacaoRoutes(app: FastifyInstance) {

  // ── GET /definicao-contratacao/fila?idOrganizacao=&emAtraso=&urgente=&idResponsavel=
  app.get('/definicao-contratacao/fila', async (request, reply) => {
    const { idOrganizacao, emAtraso, urgente, idResponsavel } = request.query as {
      idOrganizacao: string
      emAtraso?:     string
      urgente?:      string
      idResponsavel?: string
    }
    if (!idOrganizacao) return reply.status(400).send({ erro: 'idOrganizacao obrigatorio' })
    try {
      const pedidos = await obterFilaDefinicao(idOrganizacao, {
        idResponsavel,
        emAtraso: emAtraso === 'true' ? true : undefined,
        urgente:  urgente  === 'true' ? true : undefined,
      })
      return reply.send({ total: pedidos.length, pedidos })
    } catch (err: any) { return reply.status(500).send({ erro: err.message }) }
  })

  // ── GET /definicao-contratacao/verificar-atrasos?idOrganizacao=
  app.get('/definicao-contratacao/verificar-atrasos', async (request, reply) => {
    const { idOrganizacao } = request.query as { idOrganizacao: string }
    if (!idOrganizacao) return reply.status(400).send({ erro: 'idOrganizacao obrigatorio' })
    try {
      const count = await verificarAtrasos(idOrganizacao)
      return reply.send({ atualizados: count })
    } catch (err: any) { return reply.status(500).send({ erro: err.message }) }
  })

  // ── GET /definicao-contratacao/:id/sugestao?idOrganizacao=
  app.get('/definicao-contratacao/:id/sugestao', async (request, reply) => {
    const { id } = request.params as { id: string }
    const { idOrganizacao } = request.query as { idOrganizacao: string }
    if (!idOrganizacao) return reply.status(400).send({ erro: 'idOrganizacao obrigatorio' })
    try {
      const sugestao = await consultarSugestao(id, idOrganizacao)
      return reply.send(sugestao)
    } catch (err: any) { return reply.status(404).send({ erro: err.message }) }
  })

  // ── GET /definicao-contratacao/:id?idOrganizacao=
  app.get('/definicao-contratacao/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const { idOrganizacao } = request.query as { idOrganizacao: string }
    if (!idOrganizacao) return reply.status(400).send({ erro: 'idOrganizacao obrigatorio' })
    try {
      const detalhe = await obterDetalheDefinicao(id, idOrganizacao)
      return reply.send(detalhe)
    } catch (err: any) { return reply.status(404).send({ erro: err.message }) }
  })

  // ── POST /definicao-contratacao/:id/receber
  // Body: { idOrganizacao, idResponsavel }
  app.post('/definicao-contratacao/:id/receber', async (request, reply) => {
    const { id } = request.params as { id: string }
    const { idOrganizacao, idResponsavel } = request.body as {
      idOrganizacao: string
      idResponsavel: string
    }
    if (!idOrganizacao || !idResponsavel)
      return reply.status(400).send({ erro: 'idOrganizacao e idResponsavel obrigatorios' })
    try {
      const resultado = await receberDefinicao({ idPedido: id, idOrganizacao, idResponsavel })
      return reply.status(201).send(resultado)
    } catch (err: any) { return reply.status(400).send({ erro: err.message }) }
  })

  // ── PUT /definicao-contratacao/:id/definicao
  // Salva rascunho sem alterar status
  app.put('/definicao-contratacao/:id/definicao', async (request, reply) => {
    const { id } = request.params as { id: string }
    const body = request.body as {
      idOrganizacao:            string
      idResponsavel:            string
      modalidade?:              string
      modalidadeJustificativa?: string
      criterioJulgamento?:      string
      criterioJustificativa?:   string
      estrategia?:              string
      estrategiaJustificativa?: string
      formaExecucao?:           string
      parametrosEdital?:        any
      enquadramentoLegal?:      string
      justificativaLegal?:      string
    }
    if (!body.idOrganizacao || !body.idResponsavel)
      return reply.status(400).send({ erro: 'idOrganizacao e idResponsavel obrigatorios' })
    try {
      const resultado = await salvarDefinicao({ idPedido: id, ...body } as any)
      return reply.send(resultado)
    } catch (err: any) { return reply.status(400).send({ erro: err.message }) }
  })

  // ── POST /definicao-contratacao/:id/concluir
  // Conclui a definição → status 8 → encaminha para M4
  app.post('/definicao-contratacao/:id/concluir', async (request, reply) => {
    const { id } = request.params as { id: string }
    const body = request.body as {
      idOrganizacao:            string
      idResponsavel:            string
      parecerTecnico:           string
      modalidade:               string
      modalidadeJustificativa:  string
      criterioJulgamento:       string
      estrategia:               string
      criterioJustificativa?:   string
      estrategiaJustificativa?: string
      formaExecucao?:           string
      parametrosEdital?:        any
      enquadramentoLegal?:      string
      justificativaLegal?:      string
    }
    if (!body.idOrganizacao || !body.idResponsavel)
      return reply.status(400).send({ erro: 'idOrganizacao e idResponsavel obrigatorios' })
    try {
      const resultado = await concluirDefinicao({ idPedido: id, ...body } as any)
      return reply.status(200).send(resultado)
    } catch (err: any) { return reply.status(400).send({ erro: err.message }) }
  })

  // ── POST /definicao-contratacao/:id/ajuste-interno
  // Ajuste interno sem retornar à etapa anterior → status 13
  app.post('/definicao-contratacao/:id/ajuste-interno', async (request, reply) => {
    const { id } = request.params as { id: string }
    const { idOrganizacao, idResponsavel, pendencias, motivoTexto } = request.body as {
      idOrganizacao: string
      idResponsavel: string
      pendencias:    string
      motivoTexto?:  string
    }
    if (!idOrganizacao || !idResponsavel || !pendencias)
      return reply.status(400).send({ erro: 'idOrganizacao, idResponsavel e pendencias obrigatorios' })
    try {
      const resultado = await ajusteInterno({ idPedido: id, idOrganizacao, idResponsavel, pendencias, motivoTexto })
      return reply.send(resultado)
    } catch (err: any) { return reply.status(400).send({ erro: err.message }) }
  })

  // ── POST /definicao-contratacao/:id/reprovar
  app.post('/definicao-contratacao/:id/reprovar', async (request, reply) => {
    const { id } = request.params as { id: string }
    const { idOrganizacao, idResponsavel, motivoTexto, parecerTecnico } = request.body as {
      idOrganizacao:  string
      idResponsavel:  string
      motivoTexto:    string
      parecerTecnico: string
    }
    if (!idOrganizacao || !idResponsavel || !motivoTexto || !parecerTecnico)
      return reply.status(400).send({ erro: 'idOrganizacao, idResponsavel, motivoTexto e parecerTecnico obrigatorios' })
    try {
      const resultado = await reprovarDefinicao({ idPedido: id, idOrganizacao, idResponsavel, motivoTexto, parecerTecnico })
      return reply.send(resultado)
    } catch (err: any) { return reply.status(400).send({ erro: err.message }) }
  })
}
