import { FastifyInstance } from 'fastify'
import {
  iniciarNegociacaoHandler,
  enviarMensagemHandler,
  buscarNegociacaoHandler,
  concluirNegociacaoHandler
} from './negociacao.controller'

export async function negociacaoRoutes(app: FastifyInstance) {
  app.post('/negociacoes', iniciarNegociacaoHandler)
  app.get('/negociacoes/:id', buscarNegociacaoHandler)
  app.patch('/negociacoes/:id/concluir', concluirNegociacaoHandler)

  app.register(async function mensagemRoutes(sub: FastifyInstance) {
    sub.post('/:id/mensagens', enviarMensagemHandler)
  }, { prefix: '/negociacoes' })
}