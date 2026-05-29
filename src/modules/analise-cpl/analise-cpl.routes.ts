import { FastifyInstance } from 'fastify'
import {
  receberSolicitacao, salvarChecklist, aprovarAnaliseInicial,
  devolverParaAjuste, reprovarSolicitacao, obterFilaCpl,
  obterDetalheAnalise, listarMotivos, verificarAtrasos,
  salvarRvc, obterRvc,
} from './analise-cpl.service'

export async function analiseCplRoutes(app: FastifyInstance) {

  // GET /analise-cpl/motivos?tipo=
  app.get('/analise-cpl/motivos', async (request, reply) => {
    const { tipo } = request.query as { tipo?: 'DEVOLUCAO' | 'REPROVACAO' }
    try {
      const motivos = await listarMotivos(tipo)
      return reply.send({ motivos })
    } catch (err: any) { return reply.status(500).send({ erro: err.message }) }
  })

  // GET /analise-cpl/fila?idOrganizacao=&urgente=&emAtraso=&idAnalista=
  app.get('/analise-cpl/fila', async (request, reply) => {
    const { idOrganizacao, urgente, emAtraso, idAnalista } = request.query as {
      idOrganizacao: string; urgente?: string; emAtraso?: string; idAnalista?: string
    }
    if (!idOrganizacao) return reply.status(400).send({ erro: 'idOrganizacao obrigatorio' })
    try {
      const pedidos = await obterFilaCpl(idOrganizacao, {
        idAnalista,
        emAtraso: emAtraso === 'true' ? true : undefined,
        urgente:  urgente  === 'true' ? true : undefined,
      })
      return reply.send({ total: pedidos.length, pedidos })
    } catch (err: any) { return reply.status(500).send({ erro: err.message }) }
  })


  // ── RVC — Roteiro de Verificação de Conformidade ─────────────

  // GET /analise-cpl/:id/rvc?idOrganizacao=
  app.get('/analise-cpl/:id/rvc', async (request, reply) => {
    const { id } = request.params as { id: string }
    const { idOrganizacao } = request.query as { idOrganizacao: string }
    if (!idOrganizacao) return reply.status(400).send({ erro: 'idOrganizacao obrigatorio' })
    try {
      const rvc = await obterRvc(id, idOrganizacao)
      return reply.send({ rvc })
    } catch (err: any) { return reply.status(404).send({ erro: err.message }) }
  })

  // PUT /analise-cpl/:id/rvc
  app.put('/analise-cpl/:id/rvc', async (request, reply) => {
    const { id } = request.params as { id: string }
    const { idOrganizacao, idAnalista, rvcLicitacao } = request.body as {
      idOrganizacao: string
      idAnalista: string
      rvcLicitacao: object[]
    }
    if (!idOrganizacao || !idAnalista) return reply.status(400).send({ erro: 'idOrganizacao e idAnalista obrigatorios' })
    if (!Array.isArray(rvcLicitacao)) return reply.status(400).send({ erro: 'rvcLicitacao deve ser um array' })
    try {
      const analise = await salvarRvc({ idPedido: id, idOrganizacao, idAnalista, rvcLicitacao })
      return reply.send({ analise, mensagem: 'RVC salvo com sucesso' })
    } catch (err: any) { return reply.status(400).send({ erro: err.message }) }
  })

  // GET /analise-cpl/:id?idOrganizacao=
  app.get('/analise-cpl/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const { idOrganizacao } = request.query as { idOrganizacao: string }
    if (!idOrganizacao) return reply.status(400).send({ erro: 'idOrganizacao obrigatorio' })
    try {
      const detalhe = await obterDetalheAnalise(id, idOrganizacao)
      return reply.send(detalhe)
    } catch (err: any) { return reply.status(404).send({ erro: err.message }) }
  })

  // POST /analise-cpl/:id/receber
  app.post('/analise-cpl/:id/receber', async (request, reply) => {
    const { id } = request.params as { id: string }
    const { idOrganizacao, idAnalista } = request.body as { idOrganizacao: string; idAnalista: string }
    if (!idOrganizacao || !idAnalista) return reply.status(400).send({ erro: 'idOrganizacao e idAnalista obrigatorios' })
    try {
      const resultado = await receberSolicitacao({ idPedido: id, idOrganizacao, idAnalista })
      return reply.status(201).send(resultado)
    } catch (err: any) { return reply.status(400).send({ erro: err.message }) }
  })

  // PUT /analise-cpl/:id/checklist
  app.put('/analise-cpl/:id/checklist', async (request, reply) => {
    const { id } = request.params as { id: string }
    const { idOrganizacao, idAnalista, checklist, riscosObservados } = request.body as {
      idOrganizacao: string; idAnalista: string; checklist: object; riscosObservados?: string
    }
    if (!idOrganizacao || !idAnalista) return reply.status(400).send({ erro: 'idOrganizacao e idAnalista obrigatorios' })
    try {
      const analise = await salvarChecklist({ idPedido: id, idOrganizacao, idAnalista, checklist, riscosObservados })
      return reply.send({ analise })
    } catch (err: any) { return reply.status(400).send({ erro: err.message }) }
  })

  // POST /analise-cpl/:id/aprovar
  app.post('/analise-cpl/:id/aprovar', async (request, reply) => {
    const { id } = request.params as { id: string }
    const { idOrganizacao, idAnalista, parecerTecnico, checklist } = request.body as {
      idOrganizacao: string; idAnalista: string; parecerTecnico: string; checklist?: object
    }
    if (!idOrganizacao || !idAnalista || !parecerTecnico) return reply.status(400).send({ erro: 'idOrganizacao, idAnalista e parecerTecnico obrigatorios' })
    try {
      const analise = await aprovarAnaliseInicial({ idPedido: id, idOrganizacao, idAnalista, parecerTecnico, checklist })
      return reply.send({ analise, mensagem: 'Analise aprovada — encaminhada para Definicao da Contratacao' })
    } catch (err: any) { return reply.status(400).send({ erro: err.message }) }
  })

  // POST /analise-cpl/:id/devolver
  app.post('/analise-cpl/:id/devolver', async (request, reply) => {
    const { id } = request.params as { id: string }
    const { idOrganizacao, idAnalista, idMotivo, pendencias, motivoTexto } = request.body as {
      idOrganizacao: string; idAnalista: string; idMotivo: number; pendencias: string; motivoTexto?: string
    }
    if (!idOrganizacao || !idAnalista || !idMotivo || !pendencias) return reply.status(400).send({ erro: 'idOrganizacao, idAnalista, idMotivo e pendencias obrigatorios' })
    try {
      const analise = await devolverParaAjuste({ idPedido: id, idOrganizacao, idAnalista, idMotivo, pendencias, motivoTexto })
      return reply.send({ analise, mensagem: 'Pedido devolvido para ajuste' })
    } catch (err: any) { return reply.status(400).send({ erro: err.message }) }
  })

  // POST /analise-cpl/:id/reprovar
  app.post('/analise-cpl/:id/reprovar', async (request, reply) => {
    const { id } = request.params as { id: string }
    const { idOrganizacao, idAnalista, idMotivo, justificativa, motivoTexto } = request.body as {
      idOrganizacao: string; idAnalista: string; idMotivo: number; justificativa: string; motivoTexto?: string
    }
    if (!idOrganizacao || !idAnalista || !idMotivo || !justificativa) return reply.status(400).send({ erro: 'idOrganizacao, idAnalista, idMotivo e justificativa obrigatorios' })
    try {
      const analise = await reprovarSolicitacao({ idPedido: id, idOrganizacao, idAnalista, idMotivo, justificativa, motivoTexto })
      return reply.send({ analise, mensagem: 'Solicitacao reprovada — fluxo encerrado' })
    } catch (err: any) { return reply.status(400).send({ erro: err.message }) }
  })

  // POST /analise-cpl/verificar-atrasos
  app.post('/analise-cpl/verificar-atrasos', async (request, reply) => {
    const { idOrganizacao } = request.body as { idOrganizacao: string }
    if (!idOrganizacao) return reply.status(400).send({ erro: 'idOrganizacao obrigatorio' })
    try {
      const resultado = await verificarAtrasos(idOrganizacao)
      return reply.send({ mensagem: `${resultado.marcadas} analise(s) marcada(s) como em atraso` })
    } catch (err: any) { return reply.status(500).send({ erro: err.message }) }
  })
}
