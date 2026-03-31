import { FastifyInstance } from 'fastify'
import { processarImportacao } from './catalogo.importacao'

export async function catalogoImportacaoRoutes(app: FastifyInstance) {
  app.post('/itens/importar', async (request, reply) => {
    const data = await request.file()

    if (!data) {
      return reply.status(400).send({ erro: 'Nenhum arquivo enviado' })
    }

    const extensaoPermitida = ['.csv', '.xlsx']
    const nomeArquivo = data.filename.toLowerCase()
    const extensaoValida = extensaoPermitida.some(ext => nomeArquivo.endsWith(ext))

    if (!extensaoValida) {
      return reply.status(400).send({ erro: 'Formato inválido. Envie um arquivo .csv ou .xlsx' })
    }

    // IDs fixos de teste — mesmos usados em toda a API
    const idOrganizacao = '00000000-0000-0000-0000-000000000001'
    const criadoPor = '00000000-0000-0000-0000-000000000002'

    const chunks: Buffer[] = []
    for await (const chunk of data.file) {
      chunks.push(chunk)
    }
    const buffer = Buffer.concat(chunks)

    const resultado = await processarImportacao(buffer, idOrganizacao, criadoPor)

    return reply.status(200).send(resultado)
  })
}