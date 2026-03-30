import { FastifyInstance } from 'fastify'
import {
  criarFornecedorSchema,
  qualificarFornecedorSchema,
  adicionarDocumentoSchema,
  suspenderFornecedorSchema,
} from '../fornecedor.schema'
import {
  criarFornecedor,
  listarFornecedores,
  buscarFornecedor,
  qualificarFornecedor,
  adicionarDocumento,
  listarDocumentosVencendo,
  suspenderFornecedor,
} from '../fornecedor.service'

export async function fornecedorRoutes(app: FastifyInstance) {
  // M5-01 — Cadastrar fornecedor
  app.post('/fornecedores', async (request, reply) => {
    const data = criarFornecedorSchema.parse(request.body)
    const fornecedor = await criarFornecedor(data)
    return reply.status(201).send(fornecedor)
  })

  app.get('/fornecedores', async (request, reply) => {
    const { idOrganizacao } = request.query as { idOrganizacao: string }
    if (!idOrganizacao) return reply.status(400).send({ error: 'idOrganizacao obrigatorio' })
    return listarFornecedores(idOrganizacao)
  })

  app.get('/fornecedores/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const fornecedor = await buscarFornecedor(id)
    if (!fornecedor) return reply.status(404).send({ error: 'Fornecedor nao encontrado' })
    return fornecedor
  })

  // M5-02 — Qualificar fornecedor
  app.post('/fornecedores/:id/qualificacoes', async (request, reply) => {
    const { id } = request.params as { id: string }
    const data = qualificarFornecedorSchema.parse(request.body)
    return reply.status(201).send(await qualificarFornecedor(id, data))
  })

  // M5-03 — Documentos
  app.post('/fornecedores/:id/documentos', async (request, reply) => {
    const { id } = request.params as { id: string }
    const data = adicionarDocumentoSchema.parse(request.body)
    return reply.status(201).send(await adicionarDocumento(id, data))
  })

  app.get('/fornecedores/documentos/vencendo', async (request, reply) => {
    const { idOrganizacao } = request.query as { idOrganizacao: string }
    if (!idOrganizacao) return reply.status(400).send({ error: 'idOrganizacao obrigatorio' })
    return listarDocumentosVencendo(idOrganizacao)
  })

  // M5-04 — Suspender/bloquear
  app.patch('/fornecedores/:id/status', async (request, reply) => {
    const { id } = request.params as { id: string }
    const data = suspenderFornecedorSchema.parse(request.body)
    return suspenderFornecedor(id, data)
  })
}