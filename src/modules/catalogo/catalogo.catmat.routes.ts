import { FastifyInstance } from 'fastify'
import { sugerirCatmat } from './catalogo.catmat'

export async function catalogoCatmatRoutes(app: FastifyInstance) {

  // GET /itens/sugestao-catmat?idOrganizacao=...&descricao=...
  app.get('/itens/sugestao-catmat', async (request, reply) => {
    const { idOrganizacao, descricao } = request.query as {
      idOrganizacao: string
      descricao: string
    }

    if (!idOrganizacao) {
      return reply.status(400).send({ erro: 'idOrganizacao é obrigatório' })
    }

    if (!descricao || descricao.trim() === '') {
      return reply.status(400).send({ erro: 'descricao é obrigatória' })
    }

    const resultado = await sugerirCatmat(idOrganizacao, descricao)

    if (!resultado.habilitado) {
      return reply.status(200).send({
        habilitado: false,
        mensagem: 'Sugestão de CATMAT/CATSER não está habilitada para esta organização.',
        sugestoes: []
      })
    }

    if (resultado.sugestoes.length === 0) {
      return reply.status(200).send({
        habilitado: true,
        mensagem: 'Nenhuma sugestão encontrada para a descrição informada.',
        sugestoes: []
      })
    }

    return reply.status(200).send({
      habilitado: true,
      mensagem: `${resultado.sugestoes.length} sugestão(ões) encontrada(s).`,
      sugestoes: resultado.sugestoes
    })
  })
}