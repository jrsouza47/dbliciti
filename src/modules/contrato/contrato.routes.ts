import { FastifyInstance } from 'fastify'
import {
  criarContratoHandler,
  listarContratosHandler,
  buscarContratoHandler,
  assinarContratoHandler,
  designarFiscalHandler,
  criarEntregaHandler,
  confirmarEntregaHandler
} from './contrato.controller'
import prisma from '../../shared/prisma'

export async function contratoRoutes(app: FastifyInstance) {
  app.post('/contratos', criarContratoHandler)
  app.get('/contratos/organizacao/:idOrganizacao', listarContratosHandler)
  app.get('/contratos/:id', buscarContratoHandler)
  app.patch('/contratos/:id/assinar', assinarContratoHandler)
  app.patch('/contratos/:id/fiscal', designarFiscalHandler)

  app.register(async function entregaRoutes(sub: FastifyInstance) {
    sub.post('/:id/entregas', criarEntregaHandler)
    sub.patch('/:id/entregas/:entregaId/confirmar', confirmarEntregaHandler)
  }, { prefix: '/contratos' })

  app.register(async function encerramentoRoutes(sub: FastifyInstance) {

    // PATCH /contratos/:id/encerrar
    sub.patch('/:id/encerrar', async (request, reply) => {
      const { id } = request.params as { id: string }
      const { dataEncerramento, motivoEncerramento } = request.body as {
        dataEncerramento: string
        motivoEncerramento?: string
      }

      const contrato = await prisma.contrato.findUnique({ where: { id } })
      if (!contrato) return reply.status(404).send({ erro: 'Contrato não encontrado.' })
      if (contrato.status === 'Encerrado' as any) return reply.status(422).send({ erro: 'Contrato já encerrado.' })
      if (contrato.status === 'Rescindido' as any) return reply.status(422).send({ erro: 'Contrato já rescindido.' })

      const atualizado = await prisma.contrato.update({
        where: { id },
        data: {
          status: 'Encerrado' as any,
          dataEncerramento: new Date(dataEncerramento),
          motivoEncerramento: motivoEncerramento ?? 'Encerramento por fim de vigência',
          tipoEncerramento: 'Normal'
        }
      })

      return reply.send(atualizado)
    })

    // PATCH /contratos/:id/rescindir
    sub.patch('/:id/rescindir', async (request, reply) => {
      const { id } = request.params as { id: string }
      const { dataEncerramento, motivoEncerramento } = request.body as {
        dataEncerramento: string
        motivoEncerramento: string
      }

      if (!motivoEncerramento) {
        return reply.status(400).send({ erro: 'Motivo de rescisão é obrigatório.' })
      }

      const contrato = await prisma.contrato.findUnique({ where: { id } })
      if (!contrato) return reply.status(404).send({ erro: 'Contrato não encontrado.' })
      if (contrato.status === 'Encerrado' as any) return reply.status(422).send({ erro: 'Contrato já encerrado.' })
      if (contrato.status === 'Rescindido' as any) return reply.status(422).send({ erro: 'Contrato já rescindido.' })

      const atualizado = await prisma.contrato.update({
        where: { id },
        data: {
          status: 'Rescindido' as any,
          dataEncerramento: new Date(dataEncerramento),
          motivoEncerramento,
          tipoEncerramento: 'Antecipado'
        }
      })

      return reply.send(atualizado)
    })

  }, { prefix: '/contratos' })

  app.register(async function ocorrenciaSubRoutes(sub: FastifyInstance) {

    // POST /contratos/:id/ocorrencias
    sub.post('/:id/ocorrencias', async (request, reply) => {
      const { id } = request.params as { id: string }
      const { tipo, descricao, dataOcorrencia, registradoPor } = request.body as {
        tipo: string
        descricao: string
        dataOcorrencia: string
        registradoPor: string
      }

      const contrato = await prisma.contrato.findUnique({ where: { id } })
      if (!contrato) return reply.status(404).send({ erro: 'Contrato não encontrado.' })
      if (contrato.status === 'Encerrado' as any) return reply.status(422).send({ erro: 'Não é possível registrar ocorrência em contrato encerrado.' })

      const ocorrencia = await prisma.ocorrenciaContrato.create({
        data: {
          idContrato: id,
          tipo,
          descricao,
          dataOcorrencia: new Date(dataOcorrencia),
          registradoPor,
          status: 'Aberta' as any
        },
        include: { penalidades: true }
      })

      return reply.status(201).send(ocorrencia)
    })

    // GET /contratos/:id/ocorrencias
    sub.get('/:id/ocorrencias', async (request, reply) => {
      const { id } = request.params as { id: string }

      const contrato = await prisma.contrato.findUnique({ where: { id } })
      if (!contrato) return reply.status(404).send({ erro: 'Contrato não encontrado.' })

      const ocorrencias = await prisma.ocorrenciaContrato.findMany({
        where: { idContrato: id },
        include: { penalidades: true },
        orderBy: { dataOcorrencia: 'desc' }
      })

      return reply.send(ocorrencias)
    })

    // PATCH /contratos/:id/ocorrencias/:ocorrenciaId/encerrar
    sub.patch('/:id/ocorrencias/:ocorrenciaId/encerrar', async (request, reply) => {
      const { ocorrenciaId } = request.params as { id: string; ocorrenciaId: string }

      const ocorrencia = await prisma.ocorrenciaContrato.findUnique({ where: { id: ocorrenciaId } })
      if (!ocorrencia) return reply.status(404).send({ erro: 'Ocorrência não encontrada.' })
      if (ocorrencia.status === 'Resolvida' as any) return reply.status(422).send({ erro: 'Ocorrência já encerrada.' })

      const atualizada = await prisma.ocorrenciaContrato.update({
        where: { id: ocorrenciaId },
        data: { status: 'Resolvida' as any },
        include: { penalidades: true }
      })

      return reply.send(atualizada)
    })

    // POST /contratos/:id/ocorrencias/:ocorrenciaId/penalidades
    sub.post('/:id/ocorrencias/:ocorrenciaId/penalidades', async (request, reply) => {
      const { ocorrenciaId } = request.params as { id: string; ocorrenciaId: string }
      const { tipo, valor, descricao, aplicadoPor, dataAplicacao } = request.body as {
        tipo: string
        valor?: number
        descricao: string
        aplicadoPor: string
        dataAplicacao: string
      }

      const ocorrencia = await prisma.ocorrenciaContrato.findUnique({ where: { id: ocorrenciaId } })
      if (!ocorrencia) return reply.status(404).send({ erro: 'Ocorrência não encontrada.' })
      if (ocorrencia.status === 'Resolvida' as any) return reply.status(422).send({ erro: 'Não é possível aplicar penalidade em ocorrência encerrada.' })

      const penalidade = await prisma.penalidadeContrato.create({
        data: {
          idOcorrencia: ocorrenciaId,
          tipo,
          valor,
          descricao,
          aplicadoPor,
          dataAplicacao: new Date(dataAplicacao)
        }
      })

      return reply.status(201).send(penalidade)
    })

    // GET /contratos/:id/ocorrencias/:ocorrenciaId/penalidades
    sub.get('/:id/ocorrencias/:ocorrenciaId/penalidades', async (request, reply) => {
      const { ocorrenciaId } = request.params as { id: string; ocorrenciaId: string }

      const ocorrencia = await prisma.ocorrenciaContrato.findUnique({ where: { id: ocorrenciaId } })
      if (!ocorrencia) return reply.status(404).send({ erro: 'Ocorrência não encontrada.' })

      const penalidades = await prisma.penalidadeContrato.findMany({
        where: { idOcorrencia: ocorrenciaId },
        orderBy: { dataAplicacao: 'asc' }
      })

      return reply.send(penalidades)
    })

  }, { prefix: '/contratos' })
}