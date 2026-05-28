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

  // ── ATENÇÃO: rotas específicas SEMPRE antes de /:id ──────────

  // Consulta CNPJ proxy
  app.get('/fornecedores/consulta-cnpj/:cnpj', async (request, reply) => {
    const { cnpj } = request.params as { cnpj: string }
    const cnpjLimpo = cnpj.replace(/\D/g, '')
    if (cnpjLimpo.length !== 14) {
      return reply.status(400).send({ error: 'CNPJ deve conter 14 dígitos' })
    }
    const fontes = [
      `https://brasilapi.com.br/api/cnpj/v1/${cnpjLimpo}`,
      `https://publica.cnpj.ws/cnpj/${cnpjLimpo}`,
    ]
    for (const url of fontes) {
      try {
        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), 8000)
        const res = await fetch(url, { signal: controller.signal })
        clearTimeout(timeout)
        if (res.status === 404) return reply.status(404).send({ error: 'CNPJ não encontrado na Receita Federal' })
        if (!res.ok) continue
        const raw = await res.json() as any
        const dados = raw.estabelecimento ? {
          razao_social:                 raw.razao_social,
          nome_fantasia:                raw.estabelecimento.nome_fantasia,
          situacao_cadastral:           raw.estabelecimento.situacao_cadastral === 'Ativa' ? 2
                                        : raw.estabelecimento.situacao_cadastral === 'Baixada' ? 8
                                        : raw.estabelecimento.situacao_cadastral === 'Suspensa' ? 3 : 4,
          descricao_situacao_cadastral: raw.estabelecimento.situacao_cadastral,
          data_situacao_cadastral:      raw.estabelecimento.data_situacao_cadastral,
          data_inicio_atividade:        raw.estabelecimento.data_inicio_atividade,
          natureza_juridica:            raw.natureza_juridica?.descricao,
          descricao_porte:              raw.porte?.descricao,
          capital_social:               raw.capital_social,
          cnae_fiscal:                  raw.estabelecimento.atividade_principal?.subclasse,
          cnae_fiscal_descricao:        raw.estabelecimento.atividade_principal?.descricao,
          logradouro:                   raw.estabelecimento.logradouro,
          numero:                       raw.estabelecimento.numero,
          complemento:                  raw.estabelecimento.complemento,
          bairro:                       raw.estabelecimento.bairro,
          municipio:                    raw.estabelecimento.cidade?.nome,
          uf:                           raw.estabelecimento.estado?.sigla,
          cep:                          raw.estabelecimento.cep,
          ddd_telefone_1:               raw.estabelecimento.ddd1 ? `${raw.estabelecimento.ddd1}${raw.estabelecimento.telefone1}` : undefined,
          email:                        raw.estabelecimento.email,
        } : raw
        return reply.send(dados)
      } catch (e: any) {
        continue
      }
    }
    return reply.status(502).send({ error: 'Serviço de consulta indisponível. Preencha os dados manualmente.' })
  })

  // Documentos vencendo — ANTES de /:id
  app.get('/fornecedores/documentos/vencendo', async (request, reply) => {
    const { idOrganizacao } = request.query as { idOrganizacao: string }
    if (!idOrganizacao) return reply.status(400).send({ error: 'idOrganizacao obrigatorio' })
    return listarDocumentosVencendo(idOrganizacao)
  })

  // Ranking — ANTES de /:id
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
          include: { propostas: { select: { id: true, homologada: true } } },
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
      const totalConvites        = f.convites.length
      const totalPropostas       = f.convites.filter(c => c.propostas.length > 0).length
      const propostasHomologadas = f.convites.flatMap(c => c.propostas).filter(p => p.homologada).length
      const todasEntregas        = f.contratos.flatMap(c => c.entregas)
      const entregasConfirmadas  = todasEntregas.filter(e => e.status === 2).length
      const entregasContestadas  = todasEntregas.filter(e => e.status === 3).length
      const totalEntregas        = todasEntregas.length
      const totalOcorrencias     = f.contratos.flatMap(c => c.ocorrencias).length
      const totalContratos       = f.contratos.length
      const valorTotalContratado = f.contratos.reduce((acc, c) => acc + Number(c.valorTotal), 0)
      const totalAlertas         = f.alertasSancao.length

      const scoreProposta    = totalConvites  > 0 ? (totalPropostas       / totalConvites)  * 25 : 0
      const scoreHomologacao = totalPropostas > 0 ? (propostasHomologadas / totalPropostas) * 25 : 0
      const scoreEntrega     = totalEntregas  > 0 ? (entregasConfirmadas  / totalEntregas)  * 30 : 0
      const penalidade = totalOcorrencias * 5 + entregasContestadas * 3 + totalAlertas * 10
      const score = Math.max(0, Math.min(100, scoreProposta + scoreHomologacao + scoreEntrega - penalidade))

      return {
        fornecedor: {
          id: f.id, razaoSocial: f.razaoSocial,
          cnpj: formatarCnpj(f.cnpj),
          categorias: f.qualificacoes.map(q => q.categoria.nome),
        },
        score: Number(score.toFixed(1)),
        indicadores: {
          convitesRecebidos: totalConvites, propostasEnviadas: totalPropostas,
          propostasVencidas: propostasHomologadas,
          taxaResposta:  totalConvites  > 0 ? `${((totalPropostas       / totalConvites)  * 100).toFixed(1)}%` : '0%',
          taxaVitoria:   totalPropostas > 0 ? `${((propostasHomologadas / totalPropostas) * 100).toFixed(1)}%` : '0%',
          contratosAtivos: totalContratos, valorTotalContratado,
          entregasConfirmadas, entregasContestadas,
          ocorrencias: totalOcorrencias, alertasSancao: totalAlertas,
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

  // Listar todos
  app.get('/fornecedores', async (request, reply) => {
    const { idOrganizacao } = request.query as { idOrganizacao: string }
    if (!idOrganizacao) return reply.status(400).send({ error: 'idOrganizacao obrigatorio' })
    return listarFornecedores(idOrganizacao)
  })

  // Criar
  app.post('/fornecedores', async (request, reply) => {
    const data = criarFornecedorSchema.parse(request.body)
    const fornecedor = await criarFornecedor(data)
    return reply.status(201).send(fornecedor)
  })

  // Buscar por ID — DEPOIS das rotas específicas
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

  app.patch('/fornecedores/:id/status', async (request, reply) => {
    const { id } = request.params as { id: string }
    const data = suspenderFornecedorSchema.parse(request.body)
    return suspenderFornecedor(id, data)
  })
}
