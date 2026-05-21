import { FastifyInstance } from 'fastify'
import prisma from '../../shared/prisma'

export async function tipoDocumentoRoutes(app: FastifyInstance) {

  // GET /tipos-documento?idOrganizacao=
  app.get('/tipos-documento', async (request, reply) => {
    const { idOrganizacao } = request.query as { idOrganizacao: string }
    if (!idOrganizacao) return reply.status(400).send({ error: 'idOrganizacao obrigatorio' })

    const tipos = await prisma.tipoDocumento.findMany({
      where: { idOrganizacao },
      orderBy: [{ ordem: 'asc' }, { nome: 'asc' }],
    })
    return reply.send(tipos)
  })

  // POST /tipos-documento
  app.post('/tipos-documento', async (request, reply) => {
    const { idOrganizacao, nome, sigla, obrigatorio, ordem } = request.body as {
      idOrganizacao: string
      nome: string
      sigla: string
      obrigatorio?: boolean
      ordem?: number
    }

    if (!idOrganizacao || !nome || !sigla) {
      return reply.status(400).send({ error: 'idOrganizacao, nome e sigla sao obrigatorios' })
    }

    try {
      const tipo = await prisma.tipoDocumento.create({
        data: {
          idOrganizacao,
          nome: nome.trim(),
          sigla: sigla.trim().toUpperCase(),
          obrigatorio: obrigatorio ?? false,
          ordem: ordem ?? 0,
        },
      })
      return reply.status(201).send(tipo)
    } catch (err: any) {
      if (err?.code === 'P2002') return reply.status(400).send({ error: 'Sigla ja cadastrada para esta organizacao' })
      return reply.status(400).send({ error: err?.message ?? 'Erro ao criar tipo de documento' })
    }
  })

  // PATCH /tipos-documento/:id
  app.patch('/tipos-documento/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const { nome, sigla, obrigatorio, ativo, ordem } = request.body as {
      nome?: string
      sigla?: string
      obrigatorio?: boolean
      ativo?: boolean
      ordem?: number
    }

    try {
      const tipo = await prisma.tipoDocumento.update({
        where: { id },
        data: {
          ...(nome        !== undefined ? { nome:        nome.trim()               } : {}),
          ...(sigla       !== undefined ? { sigla:       sigla.trim().toUpperCase()} : {}),
          ...(obrigatorio !== undefined ? { obrigatorio                            } : {}),
          ...(ativo       !== undefined ? { ativo                                  } : {}),
          ...(ordem       !== undefined ? { ordem                                  } : {}),
        },
      })
      return reply.send(tipo)
    } catch (err: any) {
      if (err?.code === 'P2002') return reply.status(400).send({ error: 'Sigla ja cadastrada para esta organizacao' })
      if (err?.code === 'P2025') return reply.status(404).send({ error: 'Tipo de documento nao encontrado' })
      return reply.status(400).send({ error: err?.message ?? 'Erro ao atualizar tipo de documento' })
    }
  })

  // DELETE /tipos-documento/:id
  app.delete('/tipos-documento/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    try {
      await prisma.tipoDocumento.delete({ where: { id } })
      return reply.send({ ok: true })
    } catch (err: any) {
      if (err?.code === 'P2025') return reply.status(404).send({ error: 'Tipo de documento nao encontrado' })
      return reply.status(400).send({ error: err?.message ?? 'Erro ao excluir tipo de documento' })
    }
  })
}
