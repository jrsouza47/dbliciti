// ============================================================
// ROUTES — Áreas Organizacionais
// src/modules/area-organizacional/area-organizacional.routes.ts
// ============================================================

import { FastifyInstance } from 'fastify'
import {
  listarArvore,
  listarPlana,
  buscarPorApelido,
  criarArea,
  atualizarArea,
  toggleAtivo,
  importarAreas,
} from './area-organizacional.service'

export async function areaOrganizacionalRoutes(app: FastifyInstance) {

  // GET /areas?idOrganizacao= — lista em árvore
  app.get('/areas', async (request, reply) => {
    const { idOrganizacao } = request.query as { idOrganizacao: string }
    if (!idOrganizacao) return reply.status(400).send({ erro: 'idOrganizacao obrigatorio' })
    try {
      const arvore = await listarArvore(idOrganizacao)
      return reply.send({ total: arvore.length, arvore })
    } catch (err: any) { return reply.status(500).send({ erro: err.message }) }
  })

  // GET /areas/plana?idOrganizacao=&nivel=&busca= — lista plana com filtros
  app.get('/areas/plana', async (request, reply) => {
    const { idOrganizacao, nivel, busca, apenasAtivos } = request.query as {
      idOrganizacao: string; nivel?: string; busca?: string; apenasAtivos?: string
    }
    if (!idOrganizacao) return reply.status(400).send({ erro: 'idOrganizacao obrigatorio' })
    try {
      const areas = await listarPlana(idOrganizacao, {
        nivel: nivel ? parseInt(nivel) : undefined,
        busca,
        apenasAtivos: apenasAtivos !== 'false',
      })
      return reply.send({ total: areas.length, areas })
    } catch (err: any) { return reply.status(500).send({ erro: err.message }) }
  })

  // GET /areas/apelido/:apelido?idOrganizacao= — buscar por sigla ex: CPLIC
  app.get('/areas/apelido/:apelido', async (request, reply) => {
    const { apelido } = request.params as { apelido: string }
    const { idOrganizacao } = request.query as { idOrganizacao: string }
    if (!idOrganizacao) return reply.status(400).send({ erro: 'idOrganizacao obrigatorio' })
    try {
      const area = await buscarPorApelido(idOrganizacao, apelido.toUpperCase())
      if (!area) return reply.status(404).send({ erro: 'Área não encontrada' })
      return reply.send(area)
    } catch (err: any) { return reply.status(500).send({ erro: err.message }) }
  })

  // POST /areas — criar área
  app.post('/areas', async (request, reply) => {
    const body = request.body as {
      idOrganizacao: string; codigo: string; apelido?: string
      nome: string; idPai?: string
    }
    if (!body.idOrganizacao || !body.codigo || !body.nome)
      return reply.status(400).send({ erro: 'idOrganizacao, codigo e nome obrigatorios' })
    try {
      const area = await criarArea(body)
      return reply.status(201).send(area)
    } catch (err: any) { return reply.status(400).send({ erro: err.message }) }
  })

  // PATCH /areas/:id — atualizar nome/apelido
  app.patch('/areas/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const body = request.body as { apelido?: string; nome?: string; idOrganizacao: string }
    if (!body.idOrganizacao) return reply.status(400).send({ erro: 'idOrganizacao obrigatorio' })
    try {
      const area = await atualizarArea(id, body)
      return reply.send(area)
    } catch (err: any) { return reply.status(400).send({ erro: err.message }) }
  })

  // PATCH /areas/:id/toggle — ativar/desativar
  app.patch('/areas/:id/toggle', async (request, reply) => {
    const { id } = request.params as { id: string }
    const { idOrganizacao } = request.body as { idOrganizacao: string }
    if (!idOrganizacao) return reply.status(400).send({ erro: 'idOrganizacao obrigatorio' })
    try {
      const area = await toggleAtivo(id, idOrganizacao)
      return reply.send(area)
    } catch (err: any) { return reply.status(400).send({ erro: err.message }) }
  })

  // POST /areas/importar — importar lote (usado pelo seed/admin)
  // Body: { idOrganizacao, areas: [{ codigo, apelido, nome, codigoPai? }] }
  app.post('/areas/importar', async (request, reply) => {
    const { idOrganizacao, areas } = request.body as {
      idOrganizacao: string
      areas: { codigo: string; apelido?: string; nome: string; codigoPai?: string }[]
    }
    if (!idOrganizacao || !areas?.length)
      return reply.status(400).send({ erro: 'idOrganizacao e areas obrigatorios' })
    try {
      const resultado = await importarAreas(idOrganizacao, areas)
      return reply.status(201).send(resultado)
    } catch (err: any) { return reply.status(400).send({ erro: err.message }) }
  })
}
