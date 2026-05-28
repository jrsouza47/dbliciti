import prisma from '../../../shared/prisma'
import { formatarCnpj } from '../../../shared/cnpj.utils'
import { FastifyInstance } from 'fastify'
import {
  criarFornecedorSchema,
  qualificarFornecedorSchema,
  adicionarDocumentoSchema,
  suspenderFornecedorSchema,
} from '../fornecedor.schema'
import {
  criarFornecedor,
  listarFornecedores,
  buscarFornecedor,
  qualificarFornecedor,
  adicionarDocumento,
  listarDocumentosVencendo,
  suspenderFornecedor,
} from '../fornecedor.service'

export async function fornecedorRoutes(app: FastifyInstance) {

  // ── Consulta CNPJ via BrasilAPI (proxy — evita CORS no frontend) ──
  app.get('/fornecedores/consulta-cnpj/:cnpj', async (request, reply) => {
    const { cnpj } = request.params as { cnpj: string }
    const cnpjLimpo = cnpj.replace(/\D/g, '')
    if (cnpjLimpo.length !== 14) {
      return reply.status(400).send({ error: 'CNPJ deve conter 14 dígitos' })
    }
    try {
      const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpjLimpo}`)
      if (res.status === 404) return reply.status(404).send({ error: 'CNPJ não encontrado na Receita Federal' })
      if (!res.ok)            return reply.status(502).send({ error: 'Erro ao consultar Receita Federal' })
      const dados = await res.json()
      return reply.send(dados)
    } catch (e) {
      return reply.status(502).send({ error: 'Falha ao acessar BrasilAPI' })
    }
  })

  app.post('/fornecedores', async (request, reply) => {
    const data = criarFornecedorSchema.parse(request.body)
    const fornecedor = await criarFornecedor(data)
    return reply.status(201).send(fornecedor)
  })

  app.get('/fornecedores', async (request, reply) => {
    const { idOrganizacao } = request.query as { idOrganizacao: string }
    if (!idOrganizacao) return reply.status(400).send({ error: 'idOrganizacao obrigatorio' })
    return listarFornecedores(idOrganizacao)
  })

  app.get('/fornecedores/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const fornecedor = await buscarFornecedor(id)
    if (!fornecedor) return reply.status(404).send({ error: 'Fornecedor não encontrado' })
    return fornecedor
  })

  app.post('/fornecedores/:id/qualificacoes', async (request, reply) => {
    const { id } = request.params as { id: string }
    const data = qualificarFornecedorSchema.parse(request.body)
    return reply.status(201).send(await qualificarFornecedor(id, data))
  })

  app.post('/fornecedores/:id/documentos', async (request, reply) => {
    const { id } = request.params as { id: string }
    const data = adicionarDocumentoSchema.parse(request.body)
    return reply.status(201).send(await adicionarDocumento(id, data))
  })

  app.get('/fornecedores/documentos/vencendo', async (request, reply) => {
    const { idOrganizacao } = request.query as { idOrganizacao: string }
    if (!idOrganizacao) return reply.status(400).send({ error: 'idOrganizacao obrigatorio' })
    return listarDocumentosVencendo(idOrganizacao)
  })

  app.patch('/fornecedores/:id/status', async (request, reply) => {
    const { id } = request.params as { id: string }
    const data = suspenderFornecedorSchema.parse(request.body)
    return suspenderFornecedor(id, data)
  })

  // M5-05 — Ranking
  app.get('/fornecedores/ranking', async (request, reply) => {
    const { idOrganizacao, idCategoria } = request.query as {
      idOrganizacao: string
      idCategoria?: string
    }
    if (!idOrganizacao) return reply.status(400).send({ erro: 'idOrganizacao obrigatorio' })

    const fornecedores = await prisma.fornecedor.findMany({
      where: { idOrganizacao, status: 1 },
      include: {
        qualificacoes: {
          where: { ativo: true, ...(idCategoria ? { idCategoria } : {}) },
          include: { categoria: { select: { nome: true } } },
        },
        convites: {
          include: {
            propostas: { select: { id: true, homologada: true } },
          },
        },
        contratos: {
          where: { idOrganizacao },
          include: {
            entregas: { select: { status: true } },
            ocorrencias: { select: { status: true } },
          },
        },
        alertasSancao: {
          where: { idOrganizacao, status: 1 },
          select: { id: true },
        },
      },
    })

    const ranking = fornecedores.map(f => {
      const totalConvites = f.convites.length
      const totalPropostas = f.convites.filter(c => c.propostas.length > 0).length
      const propostasHomologadas = f.convites
        .flatMap(c => c.propostas)
        .filter(p => p.homologada).length

      const todasEntregas = f.contratos.flatMap(c => c.entregas)
      const entregasConfirmadas = todasEntregas.filter(e => e.status === 2).length
      const entregasContestadas = todasEntregas.filter(e => e.status === 3).length
      const totalEntregas = todasEntregas.length
      const totalOcorrencias = f.contratos.flatMap(c => c.ocorrencias).length
      const totalContratos = f.contratos.length
      const valorTotalContratado = f.contratos.reduce((acc, c) => acc + Number(c.valorTotal), 0)
      const totalAlertas = f.alertasSancao.length

      const scoreProposta    = totalConvites  > 0 ? (totalPropostas        / totalConvites)  * 25 : 0
      const scoreHomologacao = totalPropostas > 0 ? (propostasHomologadas  / totalPropostas) * 25 : 0
      const scoreEntrega     = totalEntregas  > 0 ? (entregasConfirmadas   / totalEntregas)  * 30 : 0
      const penalidade = totalOcorrencias * 5 + entregasContestadas * 3 + totalAlertas * 10
      const score = Math.max(0, Math.min(100, scoreProposta + scoreHomologacao + scoreEntrega - penalidade))

      return {
        fornecedor: {
          id: f.id,
          razaoSocial: f.razaoSocial,
          cnpj: formatarCnpj(f.cnpj),
          categorias: f.qualificacoes.map(q => q.categoria.nome),
        },
        score: Number(score.toFixed(1)),
        indicadores: {
          convitesRecebidos: totalConvites,
          propostasEnviadas: totalPropostas,
          propostasVencidas: propostasHomologadas,
          taxaResposta:  totalConvites  > 0 ? `${((totalPropostas       / totalConvites)  * 100).toFixed(1)}%` : '0%',
          taxaVitoria:   totalPropostas > 0 ? `${((propostasHomologadas / totalPropostas) * 100).toFixed(1)}%` : '0%',
          contratosAtivos: totalContratos,
          valorTotalContratado,
          entregasConfirmadas,
          entregasContestadas,
          ocorrencias: totalOcorrencias,
          alertasSancao: totalAlertas,
        },
      }
    })

    const rankingOrdenado = ranking
      .sort((a, b) => b.score - a.score)
      .map((item, index) => ({ posicao: index + 1, ...item }))

    return reply.send({
      totalFornecedores: rankingOrdenado.length,
      filtroCategoria: idCategoria ?? 'Todas',
      ranking: rankingOrdenado,
    })
  })
}
