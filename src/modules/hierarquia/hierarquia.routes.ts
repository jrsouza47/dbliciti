import { FastifyInstance } from 'fastify'
import {
  criarEstrutura,
  ativarEstrutura,
  listarEstruturas,
  criarCategoria,
  buscarArvoreCategoria,
  vincularItemCategoria,
  listarItensSemCategoria
} from './hierarquia.service'

export async function hierarquiaRoutes(app: FastifyInstance) {

  // POST /hierarquia/estruturas — criar nova estrutura
  app.post('/hierarquia/estruturas', async (request, reply) => {
    const body = request.body as {
      idOrganizacao: string
      criadoPor: string
      tabela: string
      nome: string
      mascara: string
      dataInicio: string
      dataFim?: string
    }

    if (!body.idOrganizacao || !body.criadoPor || !body.tabela ||
        !body.nome || !body.mascara || !body.dataInicio) {
      return reply.status(400).send({ erro: 'Campos obrigatórios faltando' })
    }

    try {
      const estrutura = await criarEstrutura(body)
      return reply.status(201).send(estrutura)
    } catch (err: any) {
      return reply.status(400).send({ erro: err.message })
    }
  })

  // GET /hierarquia/estruturas/:idOrganizacao — listar estruturas
  app.get('/hierarquia/estruturas/:idOrganizacao', async (request, reply) => {
    const { idOrganizacao } = request.params as { idOrganizacao: string }
    const { tabela } = request.query as { tabela?: string }

    const estruturas = await listarEstruturas(idOrganizacao, tabela)
    return reply.status(200).send(estruturas)
  })

  // PATCH /hierarquia/estruturas/:id/ativar — ativar estrutura
  app.patch('/hierarquia/estruturas/:id/ativar', async (request, reply) => {
    const { id } = request.params as { id: string }
    const body = request.body as { idOrganizacao: string }

    if (!body.idOrganizacao) {
      return reply.status(400).send({ erro: 'idOrganizacao é obrigatório' })
    }

    try {
      const estrutura = await ativarEstrutura(id, body.idOrganizacao)
      return reply.status(200).send({
        mensagem: 'Estrutura ativada. Todos os vínculos de categoria dos itens foram desativados para reclassificação.',
        estrutura
      })
    } catch (err: any) {
      return reply.status(400).send({ erro: err.message })
    }
  })

  // POST /hierarquia/categorias — criar categoria
  app.post('/hierarquia/categorias', async (request, reply) => {
    const body = request.body as {
      idOrganizacao: string
      idEstrutura: string
      nome: string
      codigo?: string
      idPai?: string
    }

    if (!body.idOrganizacao || !body.idEstrutura || !body.nome) {
      return reply.status(400).send({ erro: 'Campos obrigatórios faltando' })
    }

    try {
      const categoria = await criarCategoria(body)
      return reply.status(201).send(categoria)
    } catch (err: any) {
      return reply.status(400).send({ erro: err.message })
    }
  })

  // GET /hierarquia/categorias/:idEstrutura/arvore — buscar árvore
  app.get('/hierarquia/categorias/:idEstrutura/arvore', async (request, reply) => {
    const { idEstrutura } = request.params as { idEstrutura: string }

    const arvore = await buscarArvoreCategoria(idEstrutura)
    return reply.status(200).send(arvore)
  })

  // POST /hierarquia/itens/:idItem/categoria — vincular item a categoria
  app.post('/hierarquia/itens/:idItem/categoria', async (request, reply) => {
    const { idItem } = request.params as { idItem: string }
    const body = request.body as { idCategoria: string }

    if (!body.idCategoria) {
      return reply.status(400).send({ erro: 'idCategoria é obrigatório' })
    }

    try {
      const vinculo = await vincularItemCategoria(idItem, body.idCategoria)
      return reply.status(201).send(vinculo)
    } catch (err: any) {
      return reply.status(400).send({ erro: err.message })
    }
  })

  // GET /hierarquia/itens/sem-categoria/:idOrganizacao — itens aguardando reclassificação
  app.get('/hierarquia/itens/sem-categoria/:idOrganizacao', async (request, reply) => {
    const { idOrganizacao } = request.params as { idOrganizacao: string }

    const itens = await listarItensSemCategoria(idOrganizacao)

    return reply.status(200).send({
      total: itens.length,
      mensagem: itens.length > 0
        ? `${itens.length} item(ns) aguardando reclassificação na nova estrutura.`
        : 'Todos os itens estão classificados.',
      itens
    })
  })
}