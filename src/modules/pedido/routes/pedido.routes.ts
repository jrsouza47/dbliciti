import { FastifyInstance } from 'fastify'
import {
  criarPedidoSchema,
  cadastrarPedidoSchema,
  submeterPedidoSchema,
  decidirPedidoSchema,
  encaminharPedidoSchema,
  cancelarPedidoSchema,
  atualizarPedidoSchema,
} from '../pedido.schema'
import {
  criarPedido,
  listarPedidos,
  buscarPedido,
  cadastrarPedido,
  submeterPedido,
  decidirPedido,
  encaminharPedido,
  cancelarPedido,
  previewNumeroPedido,
  atualizarPedido,
  voltarRascunho,
  copiarPedido,
  devolverPedido,
  uploadDocumento,
  listarDocumentos,
  downloadDocumento,
  excluirDocumento,
} from '../pedido.service'
import prisma from '../../../shared/prisma'

export async function pedidoRoutes(app: FastifyInstance) {

  // GET /centros-custo?idOrganizacao=
  app.get('/centros-custo', async (request, reply) => {
    const { idOrganizacao } = request.query as { idOrganizacao: string }
    if (!idOrganizacao) return reply.status(400).send({ error: 'idOrganizacao obrigatorio' })
    const centros = await prisma.centroCusto.findMany({
      where: { idOrganizacao },
      orderBy: { descricao: 'asc' },
    })
    return reply.send(centros)
  })

  // POST /centros-custo — Criar centro de custo
  app.post('/centros-custo', async (request, reply) => {
    try {
      const { idOrganizacao, codigo, descricao } = request.body as { idOrganizacao: string; codigo: string; descricao: string }
      if (!idOrganizacao || !codigo || !descricao)
        return reply.status(400).send({ error: 'idOrganizacao, codigo e descricao são obrigatórios' })
      const centro = await prisma.centroCusto.create({
        data: { idOrganizacao, codigo: codigo.trim().toUpperCase(), descricao: descricao.trim() },
      })
      return reply.status(201).send(centro)
    } catch (err: any) {
      if (err?.code === 'P2002') return reply.status(400).send({ error: 'Já existe um centro de custo com este código nesta organização' })
      return reply.status(400).send({ error: err?.message ?? 'Erro ao criar centro de custo' })
    }
  })

  // PATCH /centros-custo/:id — Atualizar centro de custo
  app.patch('/centros-custo/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string }
      const { codigo, descricao, ativo } = request.body as { codigo?: string; descricao?: string; ativo?: boolean }
      const centro = await prisma.centroCusto.update({
        where: { id },
        data: {
          ...(codigo    !== undefined ? { codigo:    codigo.trim().toUpperCase() } : {}),
          ...(descricao !== undefined ? { descricao: descricao.trim()            } : {}),
          ...(ativo     !== undefined ? { ativo                                  } : {}),
        },
      })
      return reply.send(centro)
    } catch (err: any) {
      if (err?.code === 'P2002') return reply.status(400).send({ error: 'Já existe um centro de custo com este código nesta organização' })
      if (err?.code === 'P2025') return reply.status(404).send({ error: 'Centro de custo não encontrado' })
      return reply.status(400).send({ error: err?.message ?? 'Erro ao atualizar centro de custo' })
    }
  })

  // DELETE /centros-custo/:id — Excluir centro de custo
  app.delete('/centros-custo/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string }
      // Verifica se tem pedidos vinculados
      const pedidos = await prisma.pedido.count({ where: { idCentroCusto: id } })
      if (pedidos > 0)
        return reply.status(400).send({ error: `Não é possível excluir: ${pedidos} pedido(s) vinculado(s). Desative o centro de custo em vez de excluir.` })
      await prisma.centroCusto.delete({ where: { id } })
      return reply.send({ mensagem: 'Centro de custo excluído com sucesso' })
    } catch (err: any) {
      if (err?.code === 'P2025') return reply.status(404).send({ error: 'Centro de custo não encontrado' })
      return reply.status(400).send({ error: err?.message ?? 'Erro ao excluir centro de custo' })
    }
  })

  // POST /pedidos — Criar pedido (status 1 = Rascunho)
  app.post('/pedidos', async (request, reply) => {
    const data = criarPedidoSchema.parse(request.body)
    const pedido = await criarPedido(data)
    return reply.status(201).send(pedido)
  })

  // GET /pedidos/preview-numero?idOrganizacao= — retorna o próximo número sem criar pedido
  app.get('/pedidos/preview-numero', async (request, reply) => {
    const { idOrganizacao } = request.query as { idOrganizacao: string }
    if (!idOrganizacao) return reply.status(400).send({ error: 'idOrganizacao obrigatorio' })
    const numero = await previewNumeroPedido(idOrganizacao)
    return reply.send({ numero })
  })

  // GET /pedidos?idOrganizacao=
  app.get('/pedidos', async (request, reply) => {
    const { idOrganizacao } = request.query as { idOrganizacao: string }
    if (!idOrganizacao) return reply.status(400).send({ error: 'idOrganizacao obrigatorio' })
    return listarPedidos(idOrganizacao)
  })

  // GET /pedidos/:id
  app.get('/pedidos/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const pedido = await buscarPedido(id)
    if (!pedido) return reply.status(404).send({ error: 'Pedido nao encontrado' })
    return pedido
  })

  // PATCH /pedidos/:id — Atualizar rascunho (status 1)
  app.patch('/pedidos/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    try {
      const data = atualizarPedidoSchema.parse(request.body)
      return reply.send(await atualizarPedido(id, data))
    } catch (err: any) {
      // Zod ZodError — campo inválido
      if (err?.name === 'ZodError') {
        const campo = err.errors?.[0]?.path?.join('.') ?? 'dados'
        const msg = err.errors?.[0]?.message ?? 'Campo inválido'
        return reply.status(400).send({ error: `Campo inválido: ${campo} — ${msg}` })
      }
      return reply.status(400).send({ error: err?.message ?? 'Erro ao atualizar pedido' })
    }
  })

  // PATCH /pedidos/:id/cadastrar — Rascunho (1) → Cadastrado (2)
  app.patch('/pedidos/:id/cadastrar', async (request, reply) => {
    const { id } = request.params as { id: string }
    const data = cadastrarPedidoSchema.parse(request.body)
    return cadastrarPedido(id, data)
  })

  // PATCH /pedidos/:id/submeter — Cadastrado (2) → Em Aprovação (3)
  app.patch('/pedidos/:id/submeter', async (request, reply) => {
    const { id } = request.params as { id: string }
    const data = submeterPedidoSchema.parse(request.body)
    return submeterPedido(id, data)
  })

  // PATCH /pedidos/:id/decidir — Em Aprovação (3) → Aprovado (4) ou Reprovado (5)
  app.patch('/pedidos/:id/decidir', async (request, reply) => {
    const { id } = request.params as { id: string }
    const data = decidirPedidoSchema.parse(request.body)
    return decidirPedido(id, data)
  })

  // PATCH /pedidos/:id/encaminhar — Aprovado (4) → Encaminhado (7)
  app.patch('/pedidos/:id/encaminhar', async (request, reply) => {
    const { id } = request.params as { id: string }
    const data = encaminharPedidoSchema.parse(request.body)
    return encaminharPedido(id, data)
  })

  // PATCH /pedidos/:id/rascunho — Cadastrado (2) → Rascunho (1)
  app.patch('/pedidos/:id/rascunho', async (request, reply) => {
    const { id } = request.params as { id: string }
    const { idUsuario } = request.body as { idUsuario: string }
    return voltarRascunho(id, idUsuario)
  })

  // POST /pedidos/:id/copiar — Clonar pedido
  app.post('/pedidos/:id/copiar', async (request, reply) => {
    const { id } = request.params as { id: string }
    const { idUsuario } = request.body as { idUsuario: string }
    const novo = await copiarPedido(id, idUsuario)
    return reply.status(201).send(novo)
  })

  // PATCH /pedidos/:id/cancelar — (1,2,3) → Cancelado (6)
  app.patch('/pedidos/:id/cancelar', async (request, reply) => {
    const { id } = request.params as { id: string }
    const data = cancelarPedidoSchema.parse(request.body)
    return cancelarPedido(id, data)
  })

  // PATCH /pedidos/:id/devolver — Devolve para ajuste (status 12)
  app.patch('/pedidos/:id/devolver', async (request, reply) => {
    const { id } = request.params as { id: string }
    const { idUsuario, pendencias } = request.body as { idUsuario: string; pendencias: string }
    if (!idUsuario || !pendencias) {
      return reply.status(400).send({ error: 'idUsuario e pendencias sao obrigatorios' })
    }
    try {
      return await devolverPedido(id, { idUsuario, pendencias })
    } catch (err: any) {
      return reply.status(400).send({ error: err.message })
    }
  })

  // GET /pedidos/:id/documentos — Lista documentos do pedido
  app.get('/pedidos/:id/documentos', async (request, reply) => {
    const { id } = request.params as { id: string }
    return listarDocumentos(id)
  })

  // POST /pedidos/:id/documentos — Upload de documento
  app.post('/pedidos/:id/documentos', async (request, reply) => {
    const { id } = request.params as { id: string }
    try {
      const data = await request.file()
      if (!data) return reply.status(400).send({ error: 'Arquivo nao enviado' })

      const { tipo, idUsuario } = request.query as { tipo: string; idUsuario: string }
      if (!tipo || !idUsuario) {
        return reply.status(400).send({ error: 'tipo e idUsuario sao obrigatorios' })
      }

      const buffer = await data.toBuffer()
      const doc = await uploadDocumento({
        idPedido: id,
        tipo,
        nome: data.filename,
        tamanho: buffer.length,
        mimeType: data.mimetype,
        dados: buffer,
        idUsuario,
      })
      return reply.status(201).send(doc)
    } catch (err: any) {
      return reply.status(400).send({ error: err.message ?? 'Erro ao fazer upload' })
    }
  })

  // GET /pedidos/documentos/:idDoc — Download de documento
  app.get('/pedidos/documentos/:idDoc', async (request, reply) => {
    const { idDoc } = request.params as { idDoc: string }
    const doc = await downloadDocumento(idDoc)
    if (!doc) return reply.status(404).send({ error: 'Documento nao encontrado' })
    return reply
      .header('Content-Type', doc.mimeType)
      .header('Content-Disposition', `attachment; filename="${doc.nome}"`)
      .send(doc.dados)
  })

  // DELETE /pedidos/documentos/:idDoc — Excluir documento
  app.delete('/pedidos/documentos/:idDoc', async (request, reply) => {
    const { idDoc } = request.params as { idDoc: string }
    try {
      await excluirDocumento(idDoc)
      return reply.send({ ok: true })
    } catch (err: any) {
      return reply.status(400).send({ error: err.message })
    }
  })
}
