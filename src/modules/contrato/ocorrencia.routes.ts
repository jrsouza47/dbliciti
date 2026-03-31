import { FastifyInstance } from 'fastify'
import prisma from '../../shared/prisma'

export async function ocorrenciaRoutes(app: FastifyInstance) {

  // POST /contratos/:id/ocorrencias — Registrar ocorrência
  app.post('/contratos/:id/ocorrencias', async (request, reply) => {
    const { id } = request.params as { id: string }
    const { tipo, descricao, dataOcorrencia, registradoPor } = request.body as {
      tipo: string
      descricao: string
      dataOcorrencia: string
      registradoPor: string
    }

    const contrato = await prisma.contrato.findUnique({ where: { id } })

    if (!contrato) {
      return reply.status(404).send({ erro: 'Contrato não encontrado.' })
    }

    if (contrato.status === 'Encerrado') {
      return reply.status(422).send({ erro: 'Não é possível registrar ocorrência em contrato encerrado.' })
    }

    const ocorrencia = await prisma.ocorrenciaContrato.create({
      data: {
        idContrato: id,
        tipo,
        descricao,
        dataOcorrencia: new Date(dataOcorrencia),
        registradoPor,
        status: 'Aberta'
      },
      include: { penalidades: true }
    })

    return reply.status(201).send(ocorrencia)
  })

  // GET /contratos/:id/ocorrencias — Listar ocorrências do contrato
  app.get('/contratos/:id/ocorrencias', async (request, reply) => {
    const { id } = request.params as { id: string }

    const contrato = await prisma.contrato.findUnique({ where: { id } })

    if (!contrato) {
      return reply.status(404).send({ erro: 'Contrato não encontrado.' })
    }

    const ocorrencias = await prisma.ocorrenciaContrato.findMany({
      where: { idContrato: id },
      include: { penalidades: true },
      orderBy: { dataOcorrencia: 'desc' }
    })

    return reply.send(ocorrencias)
  })

  // POST /ocorrencias/:id/penalidades — Aplicar penalidade
  app.post('/ocorrencias/:id/penalidades', async (request, reply) => {
    const { id } = request.params as { id: string }
    const { tipo, valor, descricao, aplicadoPor, dataAplicacao } = request.body as {
      tipo: string
      valor?: number
      descricao: string
      aplicadoPor: string
      dataAplicacao: string
    }

    const ocorrencia = await prisma.ocorrenciaContrato.findUnique({ where: { id } })

    if (!ocorrencia) {
      return reply.status(404).send({ erro: 'Ocorrência não encontrada.' })
    }

    if (ocorrencia.status === 'Encerrada') {
      return reply.status(422).send({ erro: 'Não é possível aplicar penalidade em ocorrência encerrada.' })
    }

    const penalidade = await prisma.penalidadeContrato.create({
      data: {
        idOcorrencia: id,
        tipo,
        valor,
        descricao,
        aplicadoPor,
        dataAplicacao: new Date(dataAplicacao)
      }
    })

    return reply.status(201).send(penalidade)
  })

  // GET /ocorrencias/:id/penalidades — Listar penalidades da ocorrência
  app.get('/ocorrencias/:id/penalidades', async (request, reply) => {
    const { id } = request.params as { id: string }

    const ocorrencia = await prisma.ocorrenciaContrato.findUnique({ where: { id } })

    if (!ocorrencia) {
      return reply.status(404).send({ erro: 'Ocorrência não encontrada.' })
    }

    const penalidades = await prisma.penalidadeContrato.findMany({
      where: { idOcorrencia: id },
      orderBy: { dataAplicacao: 'asc' }
    })

    return reply.send(penalidades)
  })

  // PATCH /ocorrencias/:id/encerrar — Encerrar ocorrência
  app.patch('/ocorrencias/:id/encerrar', async (request, reply) => {
    const { id } = request.params as { id: string }

    const ocorrencia = await prisma.ocorrenciaContrato.findUnique({ where: { id } })

    if (!ocorrencia) {
      return reply.status(404).send({ erro: 'Ocorrência não encontrada.' })
    }

    if (ocorrencia.status === 'Encerrada') {
      return reply.status(422).send({ erro: 'Ocorrência já encerrada.' })
    }

    const atualizada = await prisma.ocorrenciaContrato.update({
      where: { id },
      data: { status: 'Encerrada' },
      include: { penalidades: true }
    })

    return reply.send(atualizada)
  })
}