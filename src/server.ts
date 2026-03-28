import 'dotenv/config'
import Fastify from 'fastify'
import fastifyCors from '@fastify/cors'
import { catalogoRoutes } from './modules/catalogo/catalogo.routes'

const app = Fastify({ logger: true })

app.register(fastifyCors, { origin: '*' })

app.get('/health', async () => {
  return { status: 'ok', projeto: 'Portal de Compras API', versao: '1.0.0' }
})

app.register(catalogoRoutes)

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