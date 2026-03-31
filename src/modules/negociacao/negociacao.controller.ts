import { FastifyRequest, FastifyReply } from 'fastify'
import { iniciarNegociacao, enviarMensagem, buscarNegociacao, concluirNegociacao } from './negociacao.service'

export async function iniciarNegociacaoHandler(req: FastifyRequest, reply: FastifyReply) {
  try {
    return reply.status(201).send(await iniciarNegociacao(req.body as any))
  } catch (e: any) {
    return reply.status(e.statusCode ?? 500).send({ error: e.message })
  }
}

export async function enviarMensagemHandler(req: FastifyRequest, reply: FastifyReply) {
  try {
    const { id } = req.params as { id: string }
    return reply.status(201).send(await enviarMensagem(id, req.body as any))
  } catch (e: any) {
    return reply.status(e.statusCode ?? 500).send({ error: e.message })
  }
}

export async function buscarNegociacaoHandler(req: FastifyRequest, reply: FastifyReply) {
  try {
    const { id } = req.params as { id: string }
    return reply.send(await buscarNegociacao(id))
  } catch (e: any) {
    return reply.status(e.statusCode ?? 500).send({ error: e.message })
  }
}

export async function concluirNegociacaoHandler(req: FastifyRequest, reply: FastifyReply) {
  try {
    const { id } = req.params as { id: string }
    return reply.send(await concluirNegociacao(id))
  } catch (e: any) {
    return reply.status(e.statusCode ?? 500).send({ error: e.message })
  }
}