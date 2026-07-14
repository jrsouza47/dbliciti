import { FastifyInstance } from 'fastify'
import { verificarDuplicataAoCadastrar } from './catalogo.duplicatas'
import { lerConfiguracao } from '../configuracoes/configuracoes.service'
import {
  listarItens,
  buscarItemPorId,
  criarItem,
  atualizarStatusItem,
  registrarPreco
} from './catalogo.service'

export async function catalogoRoutes(app: FastifyInstance) {

  // GET /itens — lista itens ativos
  app.get('/itens', async (request, reply) => {
    const { organizacaoId } = request.query as { organizacaoId: string }
    if (!organizacaoId) {
      return reply.status(400).send({ error: 'organizacaoId é obrigatório' })
    }
    return listarItens(organizacaoId)
  })

  // GET /itens/:id — busca item por ID
  app.get('/itens/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const { organizacaoId } = request.query as { organizacaoId: string }
    if (!organizacaoId) {
      return reply.status(400).send({ error: 'organizacaoId é obrigatório' })
    }
    const item = await buscarItemPorId(id, organizacaoId)
    if (!item) return reply.status(404).send({ error: 'Item não encontrado' })
    return item
  })

  // POST /itens — cadastrar novo item
  app.post('/itens', async (request, reply) => {
    const body = request.body as {
      idOrganizacao: string
      nome: string
      descricaoTecnica: string
      tipo: string
      unidadeMedida: string
      criadoPor: string
      idCategoria?: string
      codigoCatmatCatser?: string
    }

    if (!body.idOrganizacao || !body.nome || !body.descricaoTecnica ||
        !body.tipo || !body.unidadeMedida || !body.criadoPor) {
      return reply.status(400).send({ error: 'Campos obrigatórios faltando' })
    }

    try {
      const alertaAtivo = await lerConfiguracao(body.idOrganizacao, 'alertaDuplicatasItens')

      const { temSimilar, itensSimilares } = alertaAtivo
        ? await verificarDuplicataAoCadastrar(body.idOrganizacao, body.nome)
        : { temSimilar: false, itensSimilares: [] }

      const item = await criarItem(body)

      return reply.status(201).send({
        ...item,
        alerta: temSimilar
          ? {
              mensagem: 'Item cadastrado, mas existem itens com nome similar no catálogo.',
              itensSimilares: itensSimilares.map(s => ({
                id: s.id,
                codigoInterno: s.codigoInterno,
                nome: s.nome
              }))
            }
          : undefined
      })
    } catch (err: any) {
      return reply.status(400).send({ error: err.message })
    }
  })

  // PATCH /itens/:id/status — atualizar status (aprovação)
  app.patch('/itens/:id/status', async (request, reply) => {
    const { id } = request.params as { id: string }
    const body = request.body as {
      status: string
      organizacaoId: string
      usuarioId: string
      justificativa?: string
    }

    const statusValidos = [
      'Rascunho', 'Em revisão', 'Ativo',
      'Ativo com ressalva', 'Inativo', 'Descontinuado', 'Bloqueado'
    ]

    if (!statusValidos.includes(body.status)) {
      return reply.status(400).send({ error: 'Status inválido' })
    }

    const item = await atualizarStatusItem(
      id, body.organizacaoId, body.status, body.usuarioId, body.justificativa
    )
    return item
  })

  // POST /itens/:id/preco — registrar preço de referência
  app.post('/itens/:id/preco', async (request, reply) => {
    const { id } = request.params as { id: string }
    const body = request.body as {
      valor: number
      fonte: string
      dataReferencia: string
      responsavelId: string
    }

    if (!body.valor || !body.fonte || !body.dataReferencia || !body.responsavelId) {
      return reply.status(400).send({ error: 'Campos obrigatórios faltando' })
    }

    const preco = await registrarPreco({ idItem: id, ...body })
    return reply.status(201).send(preco)
  })
}