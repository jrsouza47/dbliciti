import { FastifyRequest, FastifyReply } from 'fastify'
import {
  criarContrato,
  listarContratos,
  buscarContrato,
  assinarContrato,
  designarFiscal,
  criarEntrega,
  confirmarEntrega
} from './contrato.service'

export async function criarContratoHandler(req: FastifyRequest, reply: FastifyReply) {
  try {
    return reply.status(201).send(await criarContrato(req.body as any))
  } catch (e: any) {
    return reply.status(e.statusCode ?? 500).send({ error: e.message })
  }
}

export async function listarContratosHandler(req: FastifyRequest, reply: FastifyReply) {
  try {
    const { idOrganizacao } = req.params as { idOrganizacao: string }
    return reply.send(await listarContratos(idOrganizacao))
  } catch (e: any) {
    return reply.status(e.statusCode ?? 500).send({ error: e.message })
  }
}

export async function buscarContratoHandler(req: FastifyRequest, reply: FastifyReply) {
  try {
    const { id } = req.params as { id: string }
    return reply.send(await buscarContrato(id))
  } catch (e: any) {
    return reply.status(e.statusCode ?? 500).send({ error: e.message })
  }
}

export async function assinarContratoHandler(req: FastifyRequest, reply: FastifyReply) {
  try {
    const { id } = req.params as { id: string }
    return reply.send(await assinarContrato(id))
  } catch (e: any) {
    return reply.status(e.statusCode ?? 500).send({ error: e.message })
  }
}

export async function designarFiscalHandler(req: FastifyRequest, reply: FastifyReply) {
  try {
    const { id } = req.params as { id: string }
    const { idFiscal } = req.body as { idFiscal: string }
    return reply.send(await designarFiscal(id, idFiscal))
  } catch (e: any) {
    return reply.status(e.statusCode ?? 500).send({ error: e.message })
  }
}

export async function criarEntregaHandler(req: FastifyRequest, reply: FastifyReply) {
  try {
    const { id } = req.params as { id: string }
    return reply.status(201).send(await criarEntrega(id, req.body as any))
  } catch (e: any) {
    return reply.status(e.statusCode ?? 500).send({ error: e.message })
  }
}

export async function confirmarEntregaHandler(req: FastifyRequest, reply: FastifyReply) {
  try {
    const { id, entregaId } = req.params as { id: string, entregaId: string }
    const { confirmadoPor } = req.body as { confirmadoPor: string }
    return reply.send(await confirmarEntrega(id, entregaId, confirmadoPor))
  } catch (e: any) {
    return reply.status(e.statusCode ?? 500).send({ error: e.message })
  }
}