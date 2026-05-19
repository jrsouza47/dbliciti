import { FastifyInstance } from 'fastify'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import prisma from '../../shared/prisma'
import { lerConfiguracao } from '../configuracoes/configuracoes.service'
import { getFilialVirtual } from '../filial/filial.service'

const JWT_SECRET = process.env.JWT_SECRET ?? 'dbliciti-dev-secret-troque-em-producao'
const JWT_EXPIRES = '8h'

export interface JwtPayload {
  sub: string
  nome: string
  email: string
  login: string | null
  perfil: string
  alcadaValor: number | null
  idOrganizacao: string
  nomeOrganizacao: string
  slugOrganizacao: string | null
  modeloOrganizacao: number
  idGrupo: string | null
  usaFiliais: boolean
  isMatriz: boolean       // true quando org NAO usa filiais (a propria org e a matriz)
  usaGrupo: boolean       // true quando org pertence a um grupo empresarial
  idFilial: string | null
  nomeFilial: string | null
}

function assinarToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES })
}

export function verificarToken(token: string): JwtPayload {
  return jwt.verify(token, JWT_SECRET) as JwtPayload
}

// Helper: busca primeira filial vinculada ao usuario nessa org
async function getPrimeiraFilialUsuario(
  idUsuario: string,
  idOrganizacao: string,
): Promise<{ id: string; nome: string } | null> {
  const vinculo = await prisma.usuarioFilial.findFirst({
    where: {
      idUsuario,
      filial: { idOrganizacao, isVirtual: false, ativo: true },
    },
    include: { filial: { select: { id: true, nome: true } } },
    orderBy: { criadoEm: 'asc' },
  })
  return vinculo?.filial ?? null
}

export async function authRoutes(app: FastifyInstance) {

  // POST /auth/login
  app.post('/auth/login', async (request, reply) => {
    const { email: identificador, senha, idOrganizacao } = request.body as {
      email: string
      senha: string
      idOrganizacao?: string
    }

    if (!identificador || !senha) {
      return reply.status(400).send({ error: 'Identificador e senha sao obrigatorios' })
    }

    const id = identificador.toLowerCase().trim()

    const usuario = await prisma.usuario.findFirst({
      where: { OR: [{ email: id }, { login: id }] },
      include: {
        organizacoes: {
          where: { ativo: true },
          include: {
            organizacao: {
              select: {
                id: true, nome: true, slug: true, ativo: true,
                modelo: true, idGrupo: true,
              },
            },
          },
        },
      },
    })

    if (!usuario || !usuario.senhaHash) {
      return reply.status(401).send({ error: 'Credenciais invalidas' })
    }

    if (!usuario.ativo) {
      return reply.status(403).send({ error: 'Usuario inativo. Contate o administrador.' })
    }

    const senhaValida = await bcrypt.compare(senha, usuario.senhaHash)
    if (!senhaValida) {
      return reply.status(401).send({ error: 'Credenciais invalidas' })
    }

    const orgsAtivas = usuario.organizacoes.filter((v) => v.organizacao.ativo)

    // Fallback sem vinculo em usuario_organizacao
    if (orgsAtivas.length === 0) {
      const org = await prisma.organizacao.findUnique({
        where: { id: usuario.idOrganizacao },
        select: { id: true, nome: true, slug: true, modelo: true, idGrupo: true, ativo: true },
      })

      if (!org || !org.ativo) {
        return reply.status(403).send({ error: 'Nenhuma organizacao ativa vinculada ao usuario.' })
      }

      const usaFiliais1 = (await lerConfiguracao(org.id, 'usaFiliais').catch(() => false)) as boolean
      const usaGrupo1   = (await lerConfiguracao(org.id, 'usaGrupo').catch(() => false)) as boolean

      let idFilialFinal: string | null = null
      let nomeFilialFinal: string | null = null

      if (!usaFiliais1) {
        const fv = await getFilialVirtual(org.id)
        idFilialFinal   = fv?.id   ?? null
        nomeFilialFinal = fv?.nome ?? null
      } else {
        // Retorna null — frontend vai pedir para escolher a filial
        idFilialFinal   = null
        nomeFilialFinal = null
      }

      const payload: JwtPayload = {
        sub: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        login: usuario.login,
        perfil: usuario.perfil,
        alcadaValor: usuario.alcadaValor ? Number(usuario.alcadaValor) : null,
        idOrganizacao: org.id,
        nomeOrganizacao: org.nome,
        slugOrganizacao: org.slug,
        modeloOrganizacao: org.modelo,
        idGrupo: org.idGrupo,
        usaFiliais: usaFiliais1,
        isMatriz: !usaFiliais1,
        usaGrupo: usaGrupo1,
        idFilial: idFilialFinal,
        nomeFilial: nomeFilialFinal,
      }

      return reply.send({ token: assinarToken(payload), usuario: payload })
    }

    // Multiplas orgs
    if (orgsAtivas.length > 1 && !idOrganizacao) {
      return reply.status(200).send({
        selecionarOrganizacao: true,
        organizacoes: orgsAtivas.map((v) => ({
          id: v.organizacao.id,
          nome: v.organizacao.nome,
          slug: v.organizacao.slug,
          perfil: v.perfil,
        })),
      })
    }

    let vinculo = orgsAtivas[0]
    if (idOrganizacao) {
      const encontrado = orgsAtivas.find((v) => v.idOrganizacao === idOrganizacao)
      if (!encontrado) return reply.status(403).send({ error: 'Organizacao nao vinculada ao usuario.' })
      vinculo = encontrado
    }

    const usaFiliais2 = (await lerConfiguracao(vinculo.organizacao.id, 'usaFiliais').catch(() => false)) as boolean
    const usaGrupo2   = (await lerConfiguracao(vinculo.organizacao.id, 'usaGrupo').catch(() => false)) as boolean

    let idFilialFinal: string | null = null
    let nomeFilialFinal: string | null = null

    if (!usaFiliais2) {
      const fv = await getFilialVirtual(vinculo.organizacao.id)
      idFilialFinal   = fv?.id   ?? null
      nomeFilialFinal = fv?.nome ?? null
    } else {
      // Com filiais: retorna null — frontend le do localStorage (ultima filial ativa)
      idFilialFinal   = null
      nomeFilialFinal = null
    }

    const payload: JwtPayload = {
      sub: usuario.id,
      nome: usuario.nome,
      email: usuario.email,
      login: usuario.login,
      perfil: vinculo.perfil,
      alcadaValor: vinculo.alcadaValor ? Number(vinculo.alcadaValor) : null,
      idOrganizacao: vinculo.organizacao.id,
      nomeOrganizacao: vinculo.organizacao.nome,
      slugOrganizacao: vinculo.organizacao.slug,
      modeloOrganizacao: vinculo.organizacao.modelo,
      idGrupo: vinculo.organizacao.idGrupo,
      usaFiliais: usaFiliais2,
      isMatriz: !usaFiliais2,
      usaGrupo: usaGrupo2,
      idFilial: idFilialFinal,
      nomeFilial: nomeFilialFinal,
    }

    return reply.send({ token: assinarToken(payload), usuario: payload })
  })

  // POST /auth/trocar-filial
  // Valida acesso, devolve novo JWT com filial atualizada (persistencia via localStorage no frontend)
  app.post('/auth/trocar-filial', async (request, reply) => {
    const authHeader = request.headers.authorization
    if (!authHeader?.startsWith('Bearer ')) {
      return reply.status(401).send({ error: 'Token nao fornecido' })
    }

    let usuario: JwtPayload
    try {
      usuario = verificarToken(authHeader.slice(7))
    } catch {
      return reply.status(401).send({ error: 'Token invalido ou expirado' })
    }

    if (!usuario.usaFiliais) {
      return reply.status(400).send({ error: 'Organizacao nao utiliza filiais' })
    }

    const { idFilial } = request.body as { idFilial: string }
    if (!idFilial) {
      return reply.status(400).send({ error: 'idFilial e obrigatorio' })
    }

    // Valida que o usuario tem vinculo com essa filial
    const vinculoFilial = await prisma.usuarioFilial.findFirst({
      where: {
        idUsuario: usuario.sub,
        idFilial,
        filial: { isVirtual: false, ativo: true },
      },
      include: { filial: { select: { id: true, nome: true } } },
    })

    if (!vinculoFilial) {
      return reply.status(403).send({ error: 'Usuario nao tem acesso a essa filial' })
    }

    // Novo JWT com filial atualizada (sem alteracao no banco)
    const novoPayload: JwtPayload = {
      ...usuario,
      idFilial: vinculoFilial.filial.id,
      nomeFilial: vinculoFilial.filial.nome,
    }

    return reply.send({ token: assinarToken(novoPayload), usuario: novoPayload })
  })

  // GET /auth/me
  app.get('/auth/me', async (request, reply) => {
    const authHeader = request.headers.authorization
    if (!authHeader?.startsWith('Bearer ')) {
      return reply.status(401).send({ error: 'Token nao fornecido' })
    }
    try {
      const payload = verificarToken(authHeader.slice(7))
      const usuario = await prisma.usuario.findUnique({
        where: { id: payload.sub },
        include: { organizacao: { select: { id: true, nome: true, slug: true, modelo: true, idGrupo: true } } },
      })
      if (!usuario || !usuario.ativo) return reply.status(401).send({ error: 'Usuario nao encontrado ou inativo' })
      return reply.send({
        id: usuario.id, nome: usuario.nome, email: usuario.email,
        login: usuario.login, perfil: usuario.perfil,
        alcadaValor: usuario.alcadaValor,
        idOrganizacao: usuario.idOrganizacao,
        nomeOrganizacao: usuario.organizacao.nome,
        slugOrganizacao: usuario.organizacao.slug,
        modeloOrganizacao: usuario.organizacao.modelo,
        idGrupo: usuario.organizacao.idGrupo,
      })
    } catch {
      return reply.status(401).send({ error: 'Token invalido ou expirado' })
    }
  })

  // PATCH /auth/senha
  app.patch('/auth/senha', async (request, reply) => {
    const authHeader = request.headers.authorization
    if (!authHeader?.startsWith('Bearer ')) return reply.status(401).send({ error: 'Token nao fornecido' })
    const { senhaAtual, novaSenha } = request.body as { senhaAtual: string; novaSenha: string }
    if (!senhaAtual || !novaSenha) return reply.status(400).send({ error: 'senhaAtual e novaSenha sao obrigatorios' })
    if (novaSenha.length < 6) return reply.status(400).send({ error: 'A nova senha deve ter ao menos 6 caracteres' })
    try {
      const payload = verificarToken(authHeader.slice(7))
      const usuario = await prisma.usuario.findUnique({ where: { id: payload.sub } })
      if (!usuario || !usuario.senhaHash) return reply.status(404).send({ error: 'Usuario nao encontrado' })
      if (!await bcrypt.compare(senhaAtual, usuario.senhaHash)) return reply.status(401).send({ error: 'Senha atual incorreta' })
      await prisma.usuario.update({ where: { id: payload.sub }, data: { senhaHash: await bcrypt.hash(novaSenha, 10) } })
      return reply.send({ ok: true })
    } catch {
      return reply.status(401).send({ error: 'Token invalido ou expirado' })
    }
  })

  // POST /auth/admin/set-senha
  app.post('/auth/admin/set-senha', async (request, reply) => {
    const authHeader = request.headers.authorization
    if (!authHeader?.startsWith('Bearer ')) return reply.status(401).send({ error: 'Token nao fornecido' })
    try {
      const payload = verificarToken(authHeader.slice(7))
      if (payload.perfil !== 'Admin' && payload.perfil !== 'Gestor') return reply.status(403).send({ error: 'Apenas administradores podem redefinir senhas' })
      const { idUsuario, novaSenha } = request.body as { idUsuario: string; novaSenha: string }
      if (!idUsuario || !novaSenha || novaSenha.length < 6) return reply.status(400).send({ error: 'idUsuario e novaSenha (min. 6 chars) sao obrigatorios' })
      await prisma.usuario.update({ where: { id: idUsuario }, data: { senhaHash: await bcrypt.hash(novaSenha, 10) } })
      return reply.send({ ok: true })
    } catch {
      return reply.status(401).send({ error: 'Token invalido ou expirado' })
    }
  })
}
