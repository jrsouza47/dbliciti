import { FastifyInstance } from 'fastify'
import {
  criarCotacao,
  encerrarCotacao,
  quadroComparativo,
  homologarCotacao,
  desertarCotacao,
} from './cotacao.controller'

export async function cotacaoRoutes(app: FastifyInstance) {
  app.post('/cotacoes', criarCotacao)
  app.patch('/cotacoes/:id/encerrar', encerrarCotacao)
  app.get('/cotacoes/:id/quadro', quadroComparativo)
  app.patch('/cotacoes/:id/homologar', homologarCotacao)
  app.patch('/cotacoes/:id/desertar', desertarCotacao)
}