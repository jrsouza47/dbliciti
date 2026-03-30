import 'dotenv/config'
import Fastify from 'fastify'
import fastifyCors from '@fastify/cors'
import { catalogoRoutes } from './modules/catalogo/catalogo.routes'
import { pedidoRoutes } from './modules/pedido/routes/pedido.routes'
import { fornecedorRoutes } from './modules/fornecedor/routes/fornecedor.routes'

const app = Fastify({ logger: true })

app.register(fastifyCors, { origin: '*' })
app.addContentTypeParser('application/json', { parseAs: 'string' }, function (req, body, done) {
  try {
    done(null, JSON.parse(body as string))
  } catch (err) {
    done(err as Error, undefined)
  }
})

app.get('/health', async () => {
  return { status: 'ok', projeto: 'Portal de Compras API', versao: '2.0.0' }
})

app.register(catalogoRoutes)
app.register(pedidoRoutes)
app.register(fornecedorRoutes)

const start = async () => {
  try {
    await app.listen({ port: 3333, host: '0.0.0.0' })
    console.log('Servidor rodando em http://localhost:3333')
  } catch (err) {
    app.log.error(err)
    process.exit(1)
  }
}

start()