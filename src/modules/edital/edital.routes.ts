// ============================================================
// ROUTES — Módulo 3.5: Elaboração do Edital
// backend/src/modules/edital/edital.routes.ts
// ============================================================

import { FastifyInstance } from 'fastify'
import {
  listarFilaEdital, obterDetalheEdital, uploadVersaoEdital,
  downloadVersaoEdital, excluirVersaoEdital,
  encaminharParaJuridico, adicionarComentario,
} from './edital.service'

export async function editalRoutes(app: FastifyInstance) {

  // GET /edital/fila?idOrganizacao=
  app.get('/edital/fila', async (request, reply) => {
    const { idOrganizacao } = request.query as { idOrganizacao: string }
    if (!idOrganizacao) return reply.status(400).send({ erro: 'idOrganizacao obrigatorio' })
    try {
      const pedidos = await listarFilaEdital(idOrganizacao)
      return reply.send({ total: pedidos.length, pedidos })
    } catch (err: any) { return reply.status(500).send({ erro: err.message }) }
  })

  // GET /edital/:idPedido?idOrganizacao=
  app.get('/edital/:idPedido', async (request, reply) => {
    const { idPedido } = request.params as { idPedido: string }
    const { idOrganizacao } = request.query as { idOrganizacao: string }
    if (!idOrganizacao) return reply.status(400).send({ erro: 'idOrganizacao obrigatorio' })
    try {
      const detalhe = await obterDetalheEdital(idPedido, idOrganizacao)
      return reply.send(detalhe)
    } catch (err: any) { return reply.status(404).send({ erro: err.message }) }
  })

  // POST /edital/:idPedido/upload?idOrganizacao=&idUsuario=&observacao=
  app.post('/edital/:idPedido/upload', async (request, reply) => {
    const { idPedido } = request.params as { idPedido: string }
    const { idOrganizacao, idUsuario, observacao } = request.query as {
      idOrganizacao: string; idUsuario: string; observacao?: string
    }
    if (!idOrganizacao || !idUsuario) return reply.status(400).send({ erro: 'idOrganizacao e idUsuario obrigatorios' })
    try {
      const data = await request.file()
      if (!data) return reply.status(400).send({ erro: 'Arquivo não enviado' })
      const buffer = await data.toBuffer()
      const versao = await uploadVersaoEdital({
        idPedido, idOrganizacao, idUsuario,
        nome: data.filename, tamanho: buffer.length,
        mimeType: data.mimetype, dados: buffer, observacao,
      })
      return reply.status(201).send(versao)
    } catch (err: any) { return reply.status(400).send({ erro: err.message }) }
  })

  // GET /edital/versao/:idVersao/download?idOrganizacao=
  app.get('/edital/versao/:idVersao/download', async (request, reply) => {
    const { idVersao } = request.params as { idVersao: string }
    const { idOrganizacao } = request.query as { idOrganizacao: string }
    if (!idOrganizacao) return reply.status(400).send({ erro: 'idOrganizacao obrigatorio' })
    try {
      const versao = await downloadVersaoEdital(idVersao, idOrganizacao)
      reply.header('Content-Type', versao.mimeType)
      reply.header('Content-Disposition', `attachment; filename="${encodeURIComponent(versao.nome)}"`)
      reply.header('Content-Length', versao.tamanho)
      return reply.send(versao.dados)
    } catch (err: any) { return reply.status(404).send({ erro: err.message }) }
  })

  // DELETE /edital/versao/:idVersao?idOrganizacao=
  app.delete('/edital/versao/:idVersao', async (request, reply) => {
    const { idVersao } = request.params as { idVersao: string }
    const { idOrganizacao } = request.query as { idOrganizacao: string }
    if (!idOrganizacao) return reply.status(400).send({ erro: 'idOrganizacao obrigatorio' })
    try {
      await excluirVersaoEdital(idVersao, idOrganizacao)
      return reply.send({ mensagem: 'Versão excluída' })
    } catch (err: any) { return reply.status(400).send({ erro: err.message }) }
  })

  // POST /edital/:idPedido/encaminhar
  app.post('/edital/:idPedido/encaminhar', async (request, reply) => {
    const { idPedido } = request.params as { idPedido: string }
    const { idOrganizacao, idUsuario, idVersao } = request.body as {
      idOrganizacao: string; idUsuario: string; idVersao: string
    }
    if (!idOrganizacao || !idUsuario || !idVersao) return reply.status(400).send({ erro: 'idOrganizacao, idUsuario e idVersao obrigatorios' })
    try {
      const versao = await encaminharParaJuridico({ idPedido, idOrganizacao, idUsuario, idVersao })
      return reply.send({ versao, mensagem: 'Edital encaminhado para análise jurídica' })
    } catch (err: any) { return reply.status(400).send({ erro: err.message }) }
  })

  // POST /edital/:idPedido/comentario
  app.post('/edital/:idPedido/comentario', async (request, reply) => {
    const { idPedido } = request.params as { idPedido: string }
    const { idUsuario, idVersao, texto, tipo } = request.body as {
      idUsuario: string; idVersao?: string; texto: string
      tipo: 'COMENTARIO' | 'DEVOLUCAO' | 'APROVACAO'
    }
    if (!idUsuario || !texto || !tipo) return reply.status(400).send({ erro: 'idUsuario, texto e tipo obrigatorios' })
    try {
      const comentario = await adicionarComentario({ idPedido, idVersao, idUsuario, texto, tipo })
      return reply.status(201).send(comentario)
    } catch (err: any) { return reply.status(400).send({ erro: err.message }) }
  })
}
