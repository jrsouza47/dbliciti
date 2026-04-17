import { FastifyInstance } from 'fastify'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import prisma from '../../shared/prisma'

// ─── Segredo JWT ──────────────────────────────────────────────────────────────
// Em produção: mova para variável de ambiente JWT_SECRET
const JWT_SECRET = process.env.JWT_SECRET ?? 'dbliciti-dev-secret-troque-em-producao'
const JWT_EXPIRES = '8h'

export interface JwtPayload {
  sub: string          // id do usuário
  nome: string
  email: string
  perfil: string
  idOrganizacao: string
  nomeOrganizacao: string
}

// Helper — assina token
function assinarToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES })
}

// Helper — verifica token (usado por outras rotas protegidas futuramente)
export function verificarToken(token: string): JwtPayload {
  return jwt.verify(token, JWT_SECRET) as JwtPayload
}

export async function authRoutes(app: FastifyInstance) {

  // ── POST /auth/login ────────────────────────────────────────────────────────
  app.post('/auth/login', async (request, reply) => {
    const { email, senha } = request.body as { email: string; senha: string }

    if (!email || !senha) {
      return reply.status(400).send({ error: 'Email e senha são obrigatórios' })
    }

    const usuario = await prisma.usuario.findUnique({
      where: { email: email.toLowerCase().trim() },
      include: { organizacao: { select: { id: true, nome: true, ativo: true } } },
    })

    if (!usuario || !usuario.senhaHash) {
      return reply.status(401).send({ error: 'Credenciais inválidas' })
    }

    if (!usuario.ativo) {
      return reply.status(403).send({ error: 'Usuário inativo. Contate o administrador.' })
    }

    if (!usuario.organizacao.ativo) {
      return reply.status(403).send({ error: 'Organização inativa. Contate o administrador.' })
    }

    const senhaValida = await bcrypt.compare(senha, usuario.senhaHash)
    if (!senhaValida) {
      return reply.status(401).send({ error: 'Credenciais inválidas' })
    }

    const payload: JwtPayload = {
      sub: usuario.id,
      nome: usuario.nome,
      email: usuario.email,
      perfil: usuario.perfil,
      idOrganizacao: usuario.idOrganizacao,
      nomeOrganizacao: usuario.organizacao.nome,
    }

    const token = assinarToken(payload)

    return reply.send({
      token,
      usuario: payload,
    })
  })

  // ── GET /auth/me ────────────────────────────────────────────────────────────
  // Retorna dados do usuário logado a partir do token Authorization: Bearer <token>
  app.get('/auth/me', async (request, reply) => {
    const authHeader = request.headers.authorization
    if (!authHeader?.startsWith('Bearer ')) {
      return reply.status(401).send({ error: 'Token não fornecido' })
    }

    try {
      const token = authHeader.slice(7)
      const payload = verificarToken(token)

      // Busca dados frescos do banco (perfil pode ter mudado)
      const usuario = await prisma.usuario.findUnique({
        where: { id: payload.sub },
        include: { organizacao: { select: { id: true, nome: true, modelo: true } } },
      })

      if (!usuario || !usuario.ativo) {
        return reply.status(401).send({ error: 'Usuário não encontrado ou inativo' })
      }

      return reply.send({
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        perfil: usuario.perfil,
        alcadaValor: usuario.alcadaValor,
        idOrganizacao: usuario.idOrganizacao,
        nomeOrganizacao: usuario.organizacao.nome,
        modeloOrganizacao: usuario.organizacao.modelo,
      })
    } catch {
      return reply.status(401).send({ error: 'Token inválido ou expirado' })
    }
  })

  // ── PATCH /auth/senha ───────────────────────────────────────────────────────
  // Troca senha do usuário autenticado
  app.patch('/auth/senha', async (request, reply) => {
    const authHeader = request.headers.authorization
    if (!authHeader?.startsWith('Bearer ')) {
      return reply.status(401).send({ error: 'Token não fornecido' })
    }

    const { senhaAtual, novaSenha } = request.body as {
      senhaAtual: string
      novaSenha: string
    }

    if (!senhaAtual || !novaSenha) {
      return reply.status(400).send({ error: 'senhaAtual e novaSenha são obrigatórios' })
    }

    if (novaSenha.length < 6) {
      return reply.status(400).send({ error: 'A nova senha deve ter ao menos 6 caracteres' })
    }

    try {
      const token = authHeader.slice(7)
      const payload = verificarToken(token)

      const usuario = await prisma.usuario.findUnique({ where: { id: payload.sub } })
      if (!usuario || !usuario.senhaHash) {
        return reply.status(404).send({ error: 'Usuário não encontrado' })
      }

      const senhaValida = await bcrypt.compare(senhaAtual, usuario.senhaHash)
      if (!senhaValida) {
        return reply.status(401).send({ error: 'Senha atual incorreta' })
      }

      const novoHash = await bcrypt.hash(novaSenha, 10)
      await prisma.usuario.update({
        where: { id: payload.sub },
        data: { senhaHash: novoHash },
      })

      return reply.send({ ok: true })
    } catch {
      return reply.status(401).send({ error: 'Token inválido ou expirado' })
    }
  })

  // ── POST /auth/admin/set-senha ──────────────────────────────────────────────
  // Admin define senha de qualquer usuário (sem exigir senha atual)
  // BACKLOG: proteger com verificação de perfil Admin quando middleware global existir
  app.post('/auth/admin/set-senha', async (request, reply) => {
    const authHeader = request.headers.authorization
    if (!authHeader?.startsWith('Bearer ')) {
      return reply.status(401).send({ error: 'Token não fornecido' })
    }

    try {
      const token = authHeader.slice(7)
      const payload = verificarToken(token)

      if (payload.perfil !== 'Admin') {
        return reply.status(403).send({ error: 'Apenas administradores podem redefinir senhas' })
      }

      const { idUsuario, novaSenha } = request.body as {
        idUsuario: string
        novaSenha: string
      }

      if (!idUsuario || !novaSenha || novaSenha.length < 6) {
        return reply.status(400).send({ error: 'idUsuario e novaSenha (mín. 6 chars) são obrigatórios' })
      }

      const hash = await bcrypt.hash(novaSenha, 10)
      await prisma.usuario.update({
        where: { id: idUsuario },
        data: { senhaHash: hash },
      })

      return reply.send({ ok: true })
    } catch {
      return reply.status(401).send({ error: 'Token inválido ou expirado' })
    }
  })
}
