import { FastifyInstance } from 'fastify'
import prisma from '../../shared/prisma'

// Domínio licitacao.status: 1=Enviada, 2=Aguardando, 3=Concluida, 4=Erro
// Domínio contrato.status:  1=Minuta, 2=Vigente, 3=Encerrado

export async function licitacaoRoutes(app: FastifyInstance) {

  // POST /licitacoes
  app.post('/licitacoes', async (request, reply) => {
    const { idOrganizacao, idContrato, modalidade, urlSistemaExterno, observacao } = request.body as {
      idOrganizacao: string
      idContrato: string
      modalidade: string
      urlSistemaExterno?: string
      observacao?: string
    }

    const contrato = await prisma.contrato.findUnique({ where: { id: idContrato } })
    if (!contrato) return reply.status(404).send({ erro: 'Contrato não encontrado.' })
    if (contrato.status !== 2) { // 2 = Vigente
      return reply.status(422).send({ erro: 'Apenas contratos vigentes podem ser enviados para licitação.' })
    }

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
        status: 1, // Enviada
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

  // GET /licitacoes/organizacao/:idOrganizacao
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

  // GET /licitacoes/:id
  app.get('/licitacoes/:id', async (request, reply) => {
    const { id } = request.params as { id: string }

    const licitacao = await prisma.licitacao.findUnique({
      where: { id },
      include: {
        contrato: { select: { numero: true, titulo: true, valorTotal: true } },
        logs: { orderBy: { criadoEm: 'asc' } }
      }
    })

    if (!licitacao) return reply.status(404).send({ erro: 'Licitação não encontrada.' })

    return reply.send(licitacao)
  })

  // PATCH /licitacoes/:id/resultado
  app.patch('/licitacoes/:id/resultado', async (request, reply) => {
    const { id } = request.params as { id: string }
    const { resultado, observacao } = request.body as {
      resultado: string
      observacao?: string
    }

    const licitacao = await prisma.licitacao.findUnique({ where: { id } })
    if (!licitacao) return reply.status(404).send({ erro: 'Licitação não encontrada.' })

    const statusPermitidos = [1, 2] // Enviada, Aguardando
    if (!statusPermitidos.includes(licitacao.status)) {
      return reply.status(422).send({ erro: 'Esta licitação já possui resultado registrado.' })
    }

    const atualizada = await prisma.licitacao.update({
      where: { id },
      data: {
        resultado,
        observacao,
        status: 3, // Concluida
        dataResultado: new Date(),
        logs: {
          create: {
            tentativa: licitacao.tentativas,
            status: 'Concluida',
            resposta: { resultado }
          }
        }
      },
      include: { logs: { orderBy: { criadoEm: 'asc' } } }
    })

    return reply.send(atualizada)
  })

  // POST /licitacoes/:id/reenviar
  app.post('/licitacoes/:id/reenviar', async (request, reply) => {
    const { id } = request.params as { id: string }
    const { observacao } = request.body as { observacao?: string }

    const licitacao = await prisma.licitacao.findUnique({ where: { id } })
    if (!licitacao) return reply.status(404).send({ erro: 'Licitação não encontrada.' })

    if (licitacao.status === 3) { // 3 = Concluida
      return reply.status(422).send({ erro: 'Licitação já concluída, não é possível reenviar.' })
    }

    const novaTentativa = licitacao.tentativas + 1

    const atualizada = await prisma.licitacao.update({
      where: { id },
      data: {
        tentativas: novaTentativa,
        status: 1, // Enviada
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