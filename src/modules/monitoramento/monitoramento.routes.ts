import { FastifyInstance } from 'fastify'
import prisma from '../../shared/prisma'

export async function monitoramentoRoutes(app: FastifyInstance) {

  // MT-01 — Detectar fracionamento de compras
  app.post('/monitoramento/fracionamento', async (request, reply) => {
    const { idOrganizacao, idSolicitante } = request.body as {
      idOrganizacao: string
      idSolicitante: string
    }

    const trintaDiasAtras = new Date()
    trintaDiasAtras.setDate(trintaDiasAtras.getDate() - 30)

    const pedidos = await prisma.pedido.findMany({
      where: {
        idOrganizacao,
        idSolicitante,
        status: { in: ['Aprovado', 'Encaminhado'] as any[] },
        criadoEm: { gte: trintaDiasAtras }
      },
      orderBy: { criadoEm: 'asc' }
    })

    if (pedidos.length < 2) {
      return reply.send({
        fracionamentoDetectado: false,
        mensagem: 'Nenhum indício de fracionamento detectado.',
        pedidosAnalisados: pedidos.length
      })
    }

    const valorTotal = pedidos.reduce((acc, p) => acc + Number(p.valorTotal), 0)
    const pedidosIds = pedidos.map(p => p.id)
    const temFracionamento = pedidos.length >= 3 || valorTotal > 10000

    if (!temFracionamento) {
      return reply.send({
        fracionamentoDetectado: false,
        mensagem: 'Nenhum indício de fracionamento detectado.',
        pedidosAnalisados: pedidos.length,
        valorTotal
      })
    }

    const nivelRisco = valorTotal > 50000 ? 'Alto' : valorTotal > 20000 ? 'Medio' : 'Baixo'

    const log = await prisma.logFracionamento.create({
      data: {
        idOrganizacao,
        idSolicitante,
        valorTotal,
        quantidadePedidos: pedidos.length,
        pedidosIds,
        nivelRisco: nivelRisco as any,
        descricao: `${pedidos.length} pedidos totalizando R$ ${valorTotal.toFixed(2)} em 30 dias para o mesmo solicitante.`,
        status: 'Aberto' as any
      }
    })

    return reply.status(201).send({ fracionamentoDetectado: true, nivelRisco, log })
  })

  // MT-01 — Listar logs de fracionamento
  app.get('/monitoramento/fracionamento/:idOrganizacao', async (request, reply) => {
    const { idOrganizacao } = request.params as { idOrganizacao: string }

    const logs = await prisma.logFracionamento.findMany({
      where: { idOrganizacao },
      include: { solicitante: { select: { nome: true, email: true } } },
      orderBy: { criadoEm: 'desc' }
    })

    return reply.send(logs)
  })

  // MT-02 — Registrar alerta de sanção
  app.post('/monitoramento/sancoes', async (request, reply) => {
    const { idOrganizacao, idFornecedor, tipo, descricao, fonte } = request.body as {
      idOrganizacao: string
      idFornecedor: string
      tipo: string
      descricao: string
      fonte: string
    }

    const fornecedor = await prisma.fornecedor.findUnique({ where: { id: idFornecedor } })
    if (!fornecedor) return reply.status(404).send({ erro: 'Fornecedor não encontrado.' })

    const alerta = await prisma.alertaSancao.create({
      data: {
        idOrganizacao,
        idFornecedor,
        tipo,
        descricao,
        fonte,
        status: 'Ativo' as any
      }
    })

    return reply.status(201).send(alerta)
  })

  // MT-02 — Listar alertas de sanção
  app.get('/monitoramento/sancoes/:idOrganizacao', async (request, reply) => {
    const { idOrganizacao } = request.params as { idOrganizacao: string }

    const alertas = await prisma.alertaSancao.findMany({
      where: { idOrganizacao },
      include: { fornecedor: { select: { razaoSocial: true, cnpj: true, status: true } } },
      orderBy: { dataDeteccao: 'desc' }
    })

    return reply.send(alertas)
  })

  // MT-03 — Dashboard operacional
  app.get('/monitoramento/dashboard/:idOrganizacao', async (request, reply) => {
    const { idOrganizacao } = request.params as { idOrganizacao: string }

    const [
      totalPedidos,
      pedidosPendentes,
      totalCotacoes,
      cotacoesAbertas,
      totalContratos,
      contratosAtivos,
      totalFornecedores,
      fornecedoresBloqueados,
      alertasSancaoAtivos,
      logsFracionamentoAbertos
    ] = await Promise.all([
      prisma.pedido.count({ where: { idOrganizacao } }),
      prisma.pedido.count({ where: { idOrganizacao, status: { in: ['Rascunho', 'EmAprovacao'] as any[] } } }),
      prisma.cotacao.count({ where: { idOrganizacao } }),
      prisma.cotacao.count({ where: { idOrganizacao, status: 'Aberta' as any } }),
      prisma.contrato.count({ where: { idOrganizacao } }),
      prisma.contrato.count({ where: { idOrganizacao, status: { in: ['Minuta', 'Vigente'] as any[] } } }),
      prisma.fornecedor.count({ where: { idOrganizacao } }),
      prisma.fornecedor.count({ where: { idOrganizacao, status: { in: ['Suspenso', 'Bloqueado'] as any[] } } }),
      prisma.alertaSancao.count({ where: { idOrganizacao, status: 'Ativo' as any } }),
      prisma.logFracionamento.count({ where: { idOrganizacao, status: 'Aberto' as any } })
    ])

    return reply.send({
      pedidos: { total: totalPedidos, pendentes: pedidosPendentes },
      cotacoes: { total: totalCotacoes, abertas: cotacoesAbertas },
      contratos: { total: totalContratos, ativos: contratosAtivos },
      fornecedores: { total: totalFornecedores, bloqueados: fornecedoresBloqueados },
      alertas: { sancoes: alertasSancaoAtivos, fracionamento: logsFracionamentoAbertos }
    })
  })

  // MT-04 — Dashboard executivo
  app.get('/dashboard/executivo', async (request, reply) => {
    const { idOrganizacao } = request.query as { idOrganizacao: string }
    if (!idOrganizacao) return reply.status(400).send({ erro: 'idOrganizacao obrigatorio' })

    const agora = new Date()
    const inicioMes = new Date(agora.getFullYear(), agora.getMonth(), 1)
    const inicioAno = new Date(agora.getFullYear(), 0, 1)

    const [
      totalPedidosAno, pedidosAprovadosAno, pedidosCanceladosAno,
      totalCotacoesAno, cotacoesHomologadasAno, cotacoesDesertasAno,
      contratosAtivos, contratosVencendo, valorTotalContratos,
      totalFornecedoresAtivos, fornecedoresComAlerta,
      ocorrenciasAbertas, penalidadesAno,
    ] = await Promise.all([
      prisma.pedido.count({ where: { idOrganizacao, criadoEm: { gte: inicioAno } } }),
      prisma.pedido.count({ where: { idOrganizacao, status: 'Aprovado' as any, criadoEm: { gte: inicioAno } } }),
      prisma.pedido.count({ where: { idOrganizacao, status: 'Cancelado' as any, criadoEm: { gte: inicioAno } } }),
      prisma.cotacao.count({ where: { idOrganizacao, criadoEm: { gte: inicioAno } } }),
      prisma.cotacao.count({ where: { idOrganizacao, status: 'Homologada' as any, criadoEm: { gte: inicioAno } } }),
      prisma.cotacao.count({ where: { idOrganizacao, status: 'Deserta' as any, criadoEm: { gte: inicioAno } } }),
      prisma.contrato.count({ where: { idOrganizacao, status: 'Vigente' as any } }),
      prisma.contrato.count({
        where: {
          idOrganizacao,
          status: 'Vigente' as any,
          dataFim: { lte: new Date(agora.getTime() + 30 * 24 * 60 * 60 * 1000) }
        }
      }),
      prisma.contrato.aggregate({
        where: { idOrganizacao, status: 'Vigente' as any },
        _sum: { valorTotal: true }
      }),
      prisma.fornecedor.count({ where: { idOrganizacao, status: 'Ativo' as any } }),
      prisma.alertaSancao.count({ where: { idOrganizacao, status: 'Ativo' as any } }),
      prisma.ocorrenciaContrato.count({ where: { status: 'Aberta' as any, contrato: { idOrganizacao } } }),
      prisma.penalidadeContrato.count({
        where: { dataAplicacao: { gte: inicioAno }, ocorrencia: { contrato: { idOrganizacao } } }
      }),
    ])

    const topFornecedores = await prisma.contrato.groupBy({
      by: ['idFornecedor'],
      where: { idOrganizacao },
      _sum: { valorTotal: true },
      _count: { id: true },
      orderBy: { _sum: { valorTotal: 'desc' } },
      take: 5,
    })

    const idsFornecedores = topFornecedores.map(f => f.idFornecedor)
    const fornecedoresDetalhes = await prisma.fornecedor.findMany({
      where: { id: { in: idsFornecedores } },
      select: { id: true, razaoSocial: true, cnpj: true }
    })

    const ranking = topFornecedores.map(f => {
      const det = fornecedoresDetalhes.find(d => d.id === f.idFornecedor)
      return {
        fornecedor: det?.razaoSocial ?? f.idFornecedor,
        cnpj: det?.cnpj,
        totalContratado: Number(f._sum.valorTotal ?? 0),
        quantidadeContratos: f._count.id
      }
    })

    const seisAtras = new Date()
    seisAtras.setMonth(seisAtras.getMonth() - 5)
    seisAtras.setDate(1)

    const contratosPorMes = await prisma.contrato.findMany({
      where: { idOrganizacao, criadoEm: { gte: seisAtras } },
      select: { criadoEm: true, valorTotal: true }
    })

    const gastosPorMes: Record<string, number> = {}
    for (const c of contratosPorMes) {
      const chave = `${c.criadoEm.getFullYear()}-${String(c.criadoEm.getMonth() + 1).padStart(2, '0')}`
      gastosPorMes[chave] = (gastosPorMes[chave] ?? 0) + Number(c.valorTotal)
    }

    return reply.send({
      periodo: { mes: inicioMes, ano: inicioAno },
      pedidos: {
        totalAno: totalPedidosAno,
        aprovados: pedidosAprovadosAno,
        cancelados: pedidosCanceladosAno,
        taxaAprovacao: totalPedidosAno > 0 ? `${((pedidosAprovadosAno / totalPedidosAno) * 100).toFixed(1)}%` : '0%'
      },
      cotacoes: {
        totalAno: totalCotacoesAno,
        homologadas: cotacoesHomologadasAno,
        desertas: cotacoesDesertasAno,
        taxaSucesso: totalCotacoesAno > 0 ? `${((cotacoesHomologadasAno / totalCotacoesAno) * 100).toFixed(1)}%` : '0%'
      },
      contratos: {
        ativos: contratosAtivos,
        vencendoEm30Dias: contratosVencendo,
        valorTotalAtivo: Number(valorTotalContratos._sum.valorTotal ?? 0)
      },
      fornecedores: { ativos: totalFornecedoresAtivos, comAlertaSancao: fornecedoresComAlerta },
      conformidade: { ocorrenciasAbertas, penalidadesNoAno: penalidadesAno },
      topFornecedores: ranking,
      gastosPorMes
    })
  })

  // MT-05 — Sugestão de consolidação de pedidos
  app.get('/pedidos/consolidacao', async (request, reply) => {
    const { idOrganizacao } = request.query as { idOrganizacao: string }
    if (!idOrganizacao) return reply.status(400).send({ erro: 'idOrganizacao obrigatorio' })

    const trintaDiasAtras = new Date()
    trintaDiasAtras.setDate(trintaDiasAtras.getDate() - 30)

    const itensPedido = await prisma.itemPedido.findMany({
      where: {
        pedido: {
          idOrganizacao,
          status: { in: ['Aprovado', 'Encaminhado'] as any[] },
          criadoEm: { gte: trintaDiasAtras }
        }
      },
      include: {
        pedido: {
          select: {
            id: true,
            numero: true,
            status: true,
            criadoEm: true,
            solicitante: { select: { nome: true } }
          }
        },
        item: { select: { id: true, nome: true, unidadeMedida: true } }
      }
    })

    const grupos: Record<string, {
      idItem: string
      nomeItem: string
      unidade: string
      quantidadeTotal: number
      valorTotal: number
      pedidos: {
        idPedido: string
        numeroPedido: string
        solicitante: string
        quantidade: number
        valorUnitario: number
        subtotal: number
        criadoEm: Date
      }[]
    }> = {}

    for (const ip of itensPedido) {
      const chave = ip.idItem
      if (!grupos[chave]) {
        grupos[chave] = {
          idItem: ip.idItem,
          nomeItem: ip.item.nome,
          unidade: ip.item.unidadeMedida,
          quantidadeTotal: 0,
          valorTotal: 0,
          pedidos: []
        }
      }
      grupos[chave].quantidadeTotal += Number(ip.quantidade)
      grupos[chave].valorTotal += Number(ip.subtotal)
      grupos[chave].pedidos.push({
        idPedido: ip.idPedido,
        numeroPedido: ip.pedido.numero,
        solicitante: ip.pedido.solicitante.nome,
        quantidade: Number(ip.quantidade),
        valorUnitario: Number(ip.precoUnitario),
        subtotal: Number(ip.subtotal),
        criadoEm: ip.pedido.criadoEm
      })
    }

    const sugestoes = Object.values(grupos)
      .filter(g => new Set(g.pedidos.map(p => p.idPedido)).size >= 2)
      .map(g => ({
        ...g,
        quantidadePedidos: new Set(g.pedidos.map(p => p.idPedido)).size,
        economiaEstimada: `Consolidar ${new Set(g.pedidos.map(p => p.idPedido)).size} pedidos pode reduzir custo por volume.`
      }))
      .sort((a, b) => b.valorTotal - a.valorTotal)

    return reply.send({
      periodo: { de: trintaDiasAtras, ate: new Date() },
      totalSugestoes: sugestoes.length,
      sugestoes
    })
  })
}