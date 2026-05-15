import { FastifyInstance } from 'fastify'
import {
  listarGrupos,
  buscarGrupo,
  organizacoesSemGrupo,
  criarGrupo,
  vincularOrganizacao,
  desvincularOrganizacao,
  excluirGrupo,
} from './grupo.service'

export async function grupoRoutes(app: FastifyInstance) {
  // Listar todos os grupos
  app.get('/grupos', async (_request, reply) => {
    const grupos = await listarGrupos()
    // Adaptar para o formato esperado pelo GruposAba
    const resultado = grupos.map(g => ({
      id: g.id,
      nome: g.nome,
      cnpj: g.cnpj,
      ativo: g.ativo,
      criadoEm: g.criadoEm,
      organizacoes: g.organizacoes.map(o => ({
        id: o.id,
        nome: o.nome,
        cnpj: o.cnpj,
        ativo: o.ativo,
        slug: o.slug,
        isMatriz: false,
        isCentralCompras: false,
        idOrganizacaoPai: null,
      })),
    }))
    return reply.send(resultado)
  })

  // Organizações sem grupo
  app.get('/grupos/sem-grupo', async (_request, reply) => {
    const orgs = await organizacoesSemGrupo()
    return reply.send(orgs)
  })

  // Buscar grupo por ID
  app.get('/grupos/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const grupo = await buscarGrupo(id)
    if (!grupo) return reply.status(404).send({ error: 'Grupo não encontrado' })
    return reply.send({
      id: grupo.id,
      nome: grupo.nome,
      cnpj: grupo.cnpj,
      ativo: grupo.ativo,
      criadoEm: grupo.criadoEm,
      organizacoes: grupo.organizacoes.map(o => ({
        id: o.id,
        nome: o.nome,
        cnpj: o.cnpj,
        ativo: o.ativo,
        slug: o.slug,
        isMatriz: false,
        isCentralCompras: false,
        idOrganizacaoPai: null,
      })),
    })
  })

  // Criar grupo
  app.post('/grupos', async (request, reply) => {
    try {
      const { nome, cnpj } = request.body as { nome: string; cnpj?: string }
      if (!nome?.trim()) return reply.status(400).send({ error: 'Nome é obrigatório' })
      const grupo = await criarGrupo({ nome, cnpj })
      return reply.status(201).send({ ...grupo, organizacoes: [] })
    } catch (err: any) {
      return reply.status(400).send({ error: err.message })
    }
  })

  // Vincular organização ao grupo
  app.post('/grupos/:id/organizacoes', async (request, reply) => {
    try {
      const { id } = request.params as { id: string }
      const { idOrganizacao } = request.body as { idOrganizacao: string }
      if (!idOrganizacao) return reply.status(400).send({ error: 'idOrganizacao é obrigatório' })
      const org = await vincularOrganizacao(id, idOrganizacao)
      return reply.send(org)
    } catch (err: any) {
      return reply.status(400).send({ error: err.message })
    }
  })

  // Desvincular organização do grupo
  app.delete('/grupos/:id/organizacoes/:idOrg', async (request, reply) => {
    try {
      const { id, idOrg } = request.params as { id: string; idOrg: string }
      await desvincularOrganizacao(id, idOrg)
      return reply.status(200).send({ mensagem: 'Organização desvinculada com sucesso' })
    } catch (err: any) {
      return reply.status(400).send({ error: err.message })
    }
  })

  // Excluir grupo (apenas se não tiver organizações vinculadas)
  app.delete('/grupos/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string }
      await excluirGrupo(id)
      return reply.status(200).send({ mensagem: 'Grupo excluído com sucesso' })
    } catch (err: any) {
      return reply.status(400).send({ error: err.message })
    }
  })
}
