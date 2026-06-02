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

  // ── ÁREAS ORGANIZACIONAIS ──────────────────────────────────────────────────
  // Usadas no fluxo de licitação para identificar área demandante

  // GET /areas/arvore?idOrganizacao=
  app.get('/areas/arvore', async (request, reply) => {
    const { idOrganizacao } = request.query as { idOrganizacao: string }
    if (!idOrganizacao) return reply.status(400).send({ erro: 'idOrganizacao obrigatorio' })
    try {
      const lista = await prisma.$queryRaw<any[]>`
        SELECT id, codigo, descricao, apelido, nivel, empresa,
               id_pai as "idPai", ativo
        FROM centro_custo
        WHERE id_organizacao = ${idOrganizacao}
        ORDER BY codigo ASC
      `
      const mapa = new Map<string, any>()
      lista.forEach(c => mapa.set(c.id, { ...c, filhos: [] }))
      const raizes: any[] = []
      mapa.forEach(no => {
        if (no.idPai && mapa.has(no.idPai)) mapa.get(no.idPai).filhos.push(no)
        else raizes.push(no)
      })
      return reply.send({ total: raizes.length, arvore: raizes })
    } catch (err: any) { return reply.status(500).send({ erro: err.message }) }
  })

  // POST /areas/importar — importação em lote (upsert idempotente)
  app.post('/areas/importar', async (request, reply) => {
    const { idOrganizacao, centros } = request.body as {
      idOrganizacao: string
      centros: { codigo: string; apelido?: string; nome: string }[]
    }
    if (!idOrganizacao || !centros?.length)
      return reply.status(400).send({ erro: 'idOrganizacao e centros obrigatorios' })
    const ordenados = [...centros].sort((a, b) =>
      a.codigo.split('.').length - b.codigo.split('.').length
    )
    const codigoToId = new Map<string, string>()
    let criados = 0, atualizados = 0, erros = 0
    for (const c of ordenados) {
      const nivel   = c.codigo.split('.').length
      const empresa = ({ '1': 'TERRACAP', '2': 'BIOTIC', '3': 'ETR' } as Record<string,string>)[c.codigo.split('.')[0]] ?? ''
      const codigoPai = c.codigo.includes('.') ? c.codigo.split('.').slice(0, -1).join('.') : null
      const idPai    = codigoPai ? (codigoToId.get(codigoPai) ?? null) : null
      const apelido  = (c.apelido ?? '').trim()
      try {
        const r = await prisma.$queryRaw<{ id: string; xmax: string }[]>`
          INSERT INTO centro_custo
            (id_organizacao, codigo, descricao, apelido, nivel, empresa, id_pai, ativo)
          VALUES (
            ${idOrganizacao}, ${c.codigo}, ${c.nome},
            ${apelido}, ${nivel}, ${empresa}, ${idPai}, true
          )
          ON CONFLICT (id_organizacao, codigo) DO UPDATE SET
            descricao     = EXCLUDED.descricao,
            apelido       = EXCLUDED.apelido,
            nivel         = EXCLUDED.nivel,
            empresa       = EXCLUDED.empresa,
            id_pai        = EXCLUDED.id_pai,
            atualizado_em = NOW()
          RETURNING id, xmax::text
        `
        if (r[0]) {
          codigoToId.set(c.codigo, r[0].id)
          r[0].xmax === '0' ? criados++ : atualizados++
        }
      } catch { erros++ }
    }
    return reply.status(201).send({ criados, atualizados, erros, total: centros.length })
  })

  // GET /areas/plano?idOrganizacao=&busca= — lista plana para selects
  app.get('/areas/plano', async (request, reply) => {
    const { idOrganizacao, busca } = request.query as { idOrganizacao: string; busca?: string }
    if (!idOrganizacao) return reply.status(400).send({ erro: 'idOrganizacao obrigatorio' })
    try {
      const lista = await prisma.$queryRaw<any[]>`
        SELECT id, codigo, descricao, apelido, nivel, empresa, ativo
        FROM centro_custo
        WHERE id_organizacao = ${idOrganizacao}
          AND ativo = true
          AND (${busca ?? null} IS NULL OR
               descricao ILIKE ${'%' + (busca ?? '') + '%'} OR
               apelido   ILIKE ${'%' + (busca ?? '') + '%'} OR
               codigo    ILIKE ${'%' + (busca ?? '') + '%'})
        ORDER BY codigo ASC
      `
      return reply.send({ total: lista.length, areas: lista })
    } catch (err: any) { return reply.status(500).send({ erro: err.message }) }
  })

}