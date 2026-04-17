import { FastifyInstance } from 'fastify'
import prisma from '../../shared/prisma'

export async function dashboardRoutes(app: FastifyInstance) {
  app.get('/dashboard/resumo', async (request, reply) => {
    const { idOrganizacao } = request.query as { idOrganizacao: string }

    if (!idOrganizacao) {
      return reply.status(400).send({ error: 'idOrganizacao é obrigatório' })
    }

    const [
      totalPedidos,
      pedidosAbertos,
      pedidosEmAprovacao,
      totalFornecedores,
      fornecedoresAtivos,
      totalContratos,
      contratosVigentes,
      contratosVencendo,
      totalCotacoes,
      cotacoesAbertas,
    ] = await Promise.all([
      prisma.pedido.count({ where: { idOrganizacao } }),
      prisma.pedido.count({ where: { idOrganizacao, status: 1 } }),
      prisma.pedido.count({ where: { idOrganizacao, status: 3 } }),
      prisma.fornecedor.count({ where: { idOrganizacao } }),
      prisma.fornecedor.count({ where: { idOrganizacao, status: 1 } }),
      prisma.contrato.count({ where: { idOrganizacao } }),
      prisma.contrato.count({ where: { idOrganizacao, status: 2 } }),
      prisma.contrato.count({
        where: {
          idOrganizacao,
          status: 2,
          dataFim: {
            lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            gte: new Date(),
          },
        },
      }),
      prisma.cotacao.count({ where: { idOrganizacao } }),
      prisma.cotacao.count({ where: { idOrganizacao, status: 1 } }),
    ])

    return {
      pedidos: {
        total: totalPedidos,
        abertos: pedidosAbertos,
        emAprovacao: pedidosEmAprovacao,
      },
      fornecedores: {
        total: totalFornecedores,
        ativos: fornecedoresAtivos,
      },
      contratos: {
        total: totalContratos,
        vigentes: contratosVigentes,
        vencendoEm30d: contratosVencendo,
      },
      cotacoes: {
        total: totalCotacoes,
        abertas: cotacoesAbertas,
      },
    }
  })
}