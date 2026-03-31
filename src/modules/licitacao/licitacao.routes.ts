import { FastifyInstance } from 'fastify'
import prisma from '../../shared/prisma'

export async function licitacaoRoutes(app: FastifyInstance) {

  // POST /licitacoes — Enviar contrato para licitação (M7-01)
  app.post('/licitacoes', async (request, reply) => {
    const { idOrganizacao, idContrato, modalidade, urlSistemaExterno, observacao } = request.body as {
      idOrganizacao: string
      idContrato: string
      modalidade: string
      urlSistemaExterno?: string
      observacao?: string
    }

    // Valida se contrato existe e está assinado
    const contrato = await prisma.contrato.findUnique({
      where: { id: idContrato }
    })

    if (!contrato) {
      return reply.status(404).send({ erro: 'Contrato não encontrado.' })
    }

    if (contrato.status !== 'Assinado') {
      return reply.status(422).send({ erro: 'Apenas contratos com status Assinado podem ser enviados para licitação.' })
    }

    // Gera número sequencial
    const total = await prisma.licitacao.count({ where: { idOrganizacao } })
    const numero = `LIC-${String(total + 1).padStart(5, '0')}`

    const licitacao = await prisma.licitacao.create({
      data: {
        idOrganizacao,
        idContrato,
        numero,
        modalidade,
        urlSistemaExterno,
        observacao,
        status: 'Enviada',
        tentativas: 1,
        logs: {
          create: {
            tentativa: 1,
            status: 'Enviada',
            payload: { idContrato, modalidade }
          }
        }
      },
      include: { logs: true }
    })

    return reply.status(201).send(licitacao)
  })

  // GET /licitacoes/organizacao/:idOrganizacao — Listar licitações
  app.get('/licitacoes/organizacao/:idOrganizacao', async (request, reply) => {
    const { idOrganizacao } = request.params as { idOrganizacao: string }

    const licitacoes = await prisma.licitacao.findMany({
      where: { idOrganizacao },
      include: {
        contrato: { select: { numero: true, titulo: true } }
      },
      orderBy: { criadoEm: 'desc' }
    })

    return reply.send(licitacoes)
  })

  // GET /licitacoes/:id — Buscar licitação
  app.get('/licitacoes/:id', async (request, reply) => {
    const { id } = request.params as { id: string }

    const licitacao = await prisma.licitacao.findUnique({
      where: { id },
      include: {
        contrato: { select: { numero: true, titulo: true, valorTotal: true } },
        logs: { orderBy: { criadoEm: 'asc' } }
      }
    })

    if (!licitacao) {
      return reply.status(404).send({ erro: 'Licitação não encontrada.' })
    }

    return reply.send(licitacao)
  })

  // PATCH /licitacoes/:id/resultado — Registrar resultado (M7-02)
  app.patch('/licitacoes/:id/resultado', async (request, reply) => {
    const { id } = request.params as { id: string }
    const { resultado, observacao } = request.body as {
      resultado: 'Homologada' | 'Deserta' | 'Cancelada'
      observacao?: string
    }

    const licitacao = await prisma.licitacao.findUnique({ where: { id } })

    if (!licitacao) {
      return reply.status(404).send({ erro: 'Licitação não encontrada.' })
    }

    if (licitacao.status !== 'Enviada' && licitacao.status !== 'AguardandoResultado') {
      return reply.status(422).send({ erro: 'Esta licitação já possui resultado registrado.' })
    }

    const atualizada = await prisma.licitacao.update({
      where: { id },
      data: {
        resultado,
        observacao,
        status: 'Concluída',
        dataResultado: new Date(),
        logs: {
          create: {
            tentativa: licitacao.tentativas,
            status: 'Concluída',
            resposta: { resultado }
          }
        }
      },
      include: { logs: { orderBy: { criadoEm: 'asc' } } }
    })

    return reply.send(atualizada)
  })

  // POST /licitacoes/:id/reenviar — Reenviar em caso de falha (M7-03)
  app.post('/licitacoes/:id/reenviar', async (request, reply) => {
    const { id } = request.params as { id: string }
    const { observacao } = request.body as { observacao?: string }

    const licitacao = await prisma.licitacao.findUnique({ where: { id } })

    if (!licitacao) {
      return reply.status(404).send({ erro: 'Licitação não encontrada.' })
    }

    if (licitacao.status === 'Concluída') {
      return reply.status(422).send({ erro: 'Licitação já concluída, não é possível reenviar.' })
    }

    const novaTentativa = licitacao.tentativas + 1

    const atualizada = await prisma.licitacao.update({
      where: { id },
      data: {
        tentativas: novaTentativa,
        status: 'Enviada',
        observacao,
        logs: {
          create: {
            tentativa: novaTentativa,
            status: 'Reenviada',
            payload: { reenvio: true, tentativa: novaTentativa }
          }
        }
      },
      include: { logs: { orderBy: { criadoEm: 'asc' } } }
    })

    return reply.send(atualizada)
  })
}