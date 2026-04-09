import { FastifyInstance } from 'fastify'
import {
  autoCadastroFornecedor,
  visualizarConvite,
  enviarProposta,
  visualizarContratoPortal,
  aceitarContratoPortal,
  registrarEntregaPortal,
} from './portal.controller'
import prisma from '../../shared/prisma'

export async function portalRoutes(app: FastifyInstance) {
  app.post('/portal/fornecedores', autoCadastroFornecedor)
  app.get('/portal/cotacoes/:token', visualizarConvite)
  app.post('/portal/cotacoes/:token/proposta', enviarProposta)
  app.get('/portal/contratos/:token', visualizarContratoPortal)
  app.patch('/portal/contratos/:token/aceitar', aceitarContratoPortal)
  app.post('/portal/contratos/:token/entregas', registrarEntregaPortal)

  // F4a — Fornecedor contesta entrega
  app.post('/portal/entregas/:token/contestar', async (request, reply) => {
    const { token } = request.params as { token: string }
    const { entregaId, motivoContestacao } = request.body as {
      entregaId: string
      motivoContestacao: string
    }

    if (!motivoContestacao) {
      return reply.status(400).send({ erro: 'Motivo da contestação é obrigatório.' })
    }

    const convite = await prisma.conviteCotacao.findUnique({ where: { token } })
    if (!convite) return reply.status(404).send({ erro: 'Token inválido.' })

    const entrega = await prisma.entrega.findUnique({ where: { id: entregaId } })
    if (!entrega) return reply.status(404).send({ erro: 'Entrega não encontrada.' })

    if (entrega.status !== 'Contestado' as any) {
      return reply.status(422).send({ erro: 'Apenas entregas com status Contestado podem ser contestadas.' })
    }

    if (entrega.statusContestacao === 'Contestada') {
      return reply.status(422).send({ erro: 'Esta entrega já foi contestada.' })
    }

    const atualizada = await prisma.entrega.update({
      where: { id: entregaId },
      data: {
        contestadoEm: new Date(),
        motivoContestacao,
        statusContestacao: 'Contestada'
      }
    })

    return reply.status(201).send(atualizada)
  })

  // F4b — Fornecedor consulta status de pagamento
  app.get('/portal/contratos/:token/pagamentos', async (request, reply) => {
    const { token } = request.params as { token: string }

    const convite = await prisma.conviteCotacao.findUnique({
      where: { token },
      include: { fornecedor: true }
    })

    if (!convite) return reply.status(404).send({ erro: 'Token inválido.' })

    const contrato = await prisma.contrato.findFirst({
      where: { idCotacao: convite.idCotacao },
      include: { entregas: { orderBy: { numero: 'asc' } } }
    })

    if (!contrato) return reply.status(404).send({ erro: 'Nenhum contrato encontrado para este token.' })

    return reply.send({
      contrato: {
        id: contrato.id,
        numero: contrato.numero,
        titulo: contrato.titulo,
        valorTotal: contrato.valorTotal,
        status: contrato.status
      },
      entregas: contrato.entregas.map(e => ({
        id: e.id,
        numero: e.numero,
        descricao: e.descricao,
        dataEsperada: e.dataEsperada,
        dataEfetiva: e.dataEfetiva,
        status: e.status,
        statusContestacao: e.statusContestacao
      }))
    })
  })

  // F4c — Fornecedor visualiza licitações abertas
  app.get('/portal/licitacoes/:token', async (request, reply) => {
    const { token } = request.params as { token: string }

    const convite = await prisma.conviteCotacao.findUnique({
      where: { token },
      include: { fornecedor: true }
    })

    if (!convite) return reply.status(404).send({ erro: 'Token inválido.' })

    const licitacoes = await prisma.licitacao.findMany({
      where: {
        idOrganizacao: convite.fornecedor.idOrganizacao,
        status: { in: ['Enviada', 'Aguardando'] as any[] }
      },
      include: {
        contrato: { select: { numero: true, titulo: true, valorTotal: true } }
      },
      orderBy: { dataEnvio: 'desc' }
    })

    return reply.send({
      fornecedor: { id: convite.fornecedor.id, razaoSocial: convite.fornecedor.razaoSocial },
      licitacoes
    })
  })
}