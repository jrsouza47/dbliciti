import { FastifyInstance } from 'fastify'
import { processarMensagem, MensagemChat } from './assistente.service'

export async function assistenteRoutes(app: FastifyInstance) {

  // POST /assistente/chat — Conversa com o assistente
  app.post('/assistente/chat', async (request, reply) => {
    const {
      idOrganizacao,
      mensagem,
      historico,
    } = request.body as {
      idOrganizacao: string
      mensagem: string
      historico?: MensagemChat[]
    }

    if (!idOrganizacao) {
      return reply.status(400).send({ erro: 'idOrganizacao é obrigatório' })
    }

    if (!mensagem || mensagem.trim() === '') {
      return reply.status(400).send({ erro: 'mensagem é obrigatória' })
    }

    try {
      const resultado = await processarMensagem(
        idOrganizacao,
        mensagem.trim(),
        historico ?? [],
      )

      return reply.send({
        resposta: resultado.resposta,
        sugestoes: resultado.sugestoes,
        idOrganizacao,
      })
    } catch (err: any) {
      app.log.error(err)
      return reply.status(500).send({ erro: 'Erro ao processar mensagem: ' + err.message })
    }
  })

  // POST /assistente/analisar-contrato — Analise de documento com IA
  app.post('/assistente/analisar-contrato', async (request, reply) => {
    const {
      idOrganizacao,
      mensagem,
      historico,
      documentoBase64,
      tipoDocumento,
    } = request.body as {
      idOrganizacao: string
      mensagem: string
      historico?: MensagemChat[]
      documentoBase64: string
      tipoDocumento: string
    }

    if (!idOrganizacao) {
      return reply.status(400).send({ erro: 'idOrganizacao é obrigatório' })
    }

    if (!documentoBase64) {
      return reply.status(400).send({ erro: 'documentoBase64 é obrigatório' })
    }

    if (!tipoDocumento || !['application/pdf'].includes(tipoDocumento)) {
      return reply.status(400).send({ erro: 'tipoDocumento inválido. Use: application/pdf' })
    }

    const pergunta = mensagem?.trim() || 'Analise este contrato e identifique cláusulas de risco.'

    try {
      const resultado = await processarMensagem(
        idOrganizacao,
        pergunta,
        historico ?? [],
        documentoBase64,
        tipoDocumento,
      )

      return reply.send({
        resposta: resultado.resposta,
        sugestoes: resultado.sugestoes,
        idOrganizacao,
      })
    } catch (err: any) {
      app.log.error(err)
      return reply.status(500).send({ erro: 'Erro ao analisar contrato: ' + err.message })
    }
  })

  // GET /assistente/sugestoes-iniciais — Sugestoes para abrir o chat
  app.get('/assistente/sugestoes-iniciais', async (request, reply) => {
    return reply.send({
      sugestoes: [
        'Qual é o resumo operacional de hoje?',
        'Quantos pedidos estão em aprovação?',
        'Quais contratos vencem nos próximos 30 dias?',
        'Há fornecedores com alertas de sanção?',
        'Qual o status das cotações abertas?',
        'Quais fornecedores têm documentos vencendo?',
        'Há indícios de fracionamento de compras?',
        'Qual fornecedor tem o maior volume contratado?',
      ]
    })
  })
}