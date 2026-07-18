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
  trocarSenha: boolean
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

// Helper: todas as organizações que o usuário pode acessar — SEMPRE inclui
// a organização principal (usuario.idOrganizacao), mesclada com vínculos
// secundários em usuario_organizacao (multi-empresa). Antes desta correção,
// login e trocar-organizacao olhavam só para usuario_organizacao, então um
// usuário sem vínculo explícito para a própria organização principal (caso
// comum — o vínculo principal não precisa de linha em usuario_organizacao)
// não conseguia logar nem trocar de volta para ela.
async function organizacoesDoUsuario(usuario: {
  id: string
  idOrganizacao: string
  perfil: string
  alcadaValor: any
}): Promise<Array<{
  idOrganizacao: string
  perfil: string
  alcadaValor: number | null
  organizacao: { id: string; nome: string; slug: string | null; ativo: boolean; modelo: number; idGrupo: string | null }
}>> {
  const orgPrincipal = await prisma.organizacao.findUnique({
    where: { id: usuario.idOrganizacao },
    select: { id: true, nome: true, slug: true, ativo: true, modelo: true, idGrupo: true },
  })

  const vinculos = await prisma.usuarioOrganizacao.findMany({
    where: { idUsuario: usuario.id, ativo: true, organizacao: { ativo: true } },
    include: { organizacao: { select: { id: true, nome: true, slug: true, ativo: true, modelo: true, idGrupo: true } } },
  })

  const resultado: Array<{
    idOrganizacao: string
    perfil: string
    alcadaValor: number | null
    organizacao: { id: string; nome: string; slug: string | null; ativo: boolean; modelo: number; idGrupo: string | null }
  }> = []
  const vistos = new Set<string>()

  if (orgPrincipal && orgPrincipal.ativo) {
    resultado.push({
      idOrganizacao: orgPrincipal.id,
      perfil: usuario.perfil,
      alcadaValor: usuario.alcadaValor ? Number(usuario.alcadaValor) : null,
      organizacao: orgPrincipal,
    })
    vistos.add(orgPrincipal.id)
  }

  for (const v of vinculos) {
    if (vistos.has(v.idOrganizacao)) continue // já entrou como principal, evita duplicar
    resultado.push({
      idOrganizacao: v.idOrganizacao,
      perfil: v.perfil,
      alcadaValor: v.alcadaValor ? Number(v.alcadaValor) : null,
      organizacao: v.organizacao,
    })
    vistos.add(v.idOrganizacao)
  }

  return resultado
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

    // Organização de destino: por padrão SEMPRE a principal do usuário
    // (usuario.idOrganizacao) — é o que a pessoa espera ao logar. Só usa
    // outra se idOrganizacao for explicitamente enviado no body (ex.: um
    // futuro seletor de empresa na tela de login) e o usuário tiver acesso
    // a ela (principal ou vínculo secundário em usuario_organizacao).
    const acessiveis = await organizacoesDoUsuario(usuario)
    if (acessiveis.length === 0) {
      return reply.status(403).send({ error: 'Nenhuma organizacao ativa vinculada ao usuario.' })
    }

    let vinculo = acessiveis.find((v) => v.idOrganizacao === usuario.idOrganizacao) ?? acessiveis[0]
    if (idOrganizacao) {
      const encontrado = acessiveis.find((v) => v.idOrganizacao === idOrganizacao)
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
      // Com filiais: busca primeira filial vinculada ao usuario
      const filialAtiva = await getPrimeiraFilialUsuario(usuario.id, vinculo.organizacao.id)
      idFilialFinal   = filialAtiva?.id   ?? null
      nomeFilialFinal = filialAtiva?.nome ?? null
    }

    const payload: JwtPayload = {
      sub: usuario.id,
      nome: usuario.nome,
      email: usuario.email,
      login: usuario.login,
      perfil: vinculo.perfil,
      alcadaValor: vinculo.alcadaValor,
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
      trocarSenha: usuario.trocarSenha ?? false,
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

  // POST /auth/trocar-organizacao
  // Troca a organizacao ativa do usuario logado (multi-empresa), sem novo
  // login — reconstroi o JWT do zero para a organizacao de destino, igual
  // ao que o /auth/login faz quando ha mais de uma organizacao vinculada.
  app.post('/auth/trocar-organizacao', async (request, reply) => {
    const authHeader = request.headers.authorization
    if (!authHeader?.startsWith('Bearer ')) {
      return reply.status(401).send({ error: 'Token nao fornecido' })
    }

    let usuarioToken: JwtPayload
    try {
      usuarioToken = verificarToken(authHeader.slice(7))
    } catch {
      return reply.status(401).send({ error: 'Token invalido ou expirado' })
    }

    const { idOrganizacao } = request.body as { idOrganizacao: string }
    if (!idOrganizacao) {
      return reply.status(400).send({ error: 'idOrganizacao e obrigatorio' })
    }

    const usuario = await prisma.usuario.findUnique({ where: { id: usuarioToken.sub } })
    if (!usuario || !usuario.ativo) return reply.status(401).send({ error: 'Usuario nao encontrado ou inativo' })

    let orgDestino: { id: string; nome: string; slug: string | null; modelo: number; idGrupo: string | null }
    let perfilDestino = usuario.perfil
    let alcadaDestino: number | null = usuario.alcadaValor ? Number(usuario.alcadaValor) : null

    // Admin DBS — acessa qualquer organizacao ativa, sem vinculo individual
    // em usuario_organizacao (mesmo criterio usado em /auth/me).
    if (usuario.perfil === 'Admin') {
      const org = await prisma.organizacao.findUnique({
        where: { id: idOrganizacao },
        select: { id: true, nome: true, slug: true, ativo: true, modelo: true, idGrupo: true },
      })
      if (!org || !org.ativo) return reply.status(403).send({ error: 'Organizacao nao encontrada ou inativa' })
      orgDestino = org
      perfilDestino = 'Admin'
      alcadaDestino = null
    } else {
      const acessiveis = await organizacoesDoUsuario(usuario)
      const encontrado = acessiveis.find((v) => v.idOrganizacao === idOrganizacao)
      if (!encontrado) {
        return reply.status(403).send({ error: 'Usuario nao tem acesso a essa organizacao' })
      }
      orgDestino = encontrado.organizacao
      perfilDestino = encontrado.perfil
      alcadaDestino = encontrado.alcadaValor
    }

    const usaFiliais = (await lerConfiguracao(orgDestino.id, 'usaFiliais').catch(() => false)) as boolean
    const usaGrupo   = (await lerConfiguracao(orgDestino.id, 'usaGrupo').catch(() => false)) as boolean

    let idFilialFinal: string | null = null
    let nomeFilialFinal: string | null = null

    if (!usaFiliais) {
      const fv = await getFilialVirtual(orgDestino.id)
      idFilialFinal   = fv?.id   ?? null
      nomeFilialFinal = fv?.nome ?? null
    } else {
      const filialAtiva = await getPrimeiraFilialUsuario(usuario.id, orgDestino.id)
      idFilialFinal   = filialAtiva?.id   ?? null
      nomeFilialFinal = filialAtiva?.nome ?? null
    }

    const novoPayload: JwtPayload = {
      sub: usuario.id,
      nome: usuario.nome,
      email: usuario.email,
      login: usuario.login,
      perfil: perfilDestino,
      alcadaValor: alcadaDestino,
      idOrganizacao: orgDestino.id,
      nomeOrganizacao: orgDestino.nome,
      slugOrganizacao: orgDestino.slug,
      modeloOrganizacao: orgDestino.modelo,
      idGrupo: orgDestino.idGrupo,
      usaFiliais,
      isMatriz: !usaFiliais,
      usaGrupo,
      idFilial: idFilialFinal,
      nomeFilial: nomeFilialFinal,
      trocarSenha: usuario.trocarSenha ?? false,
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
        include: {
          organizacao: { select: { id: true, nome: true, slug: true, modelo: true, idGrupo: true } },
        },
      })
      if (!usuario || !usuario.ativo) return reply.status(401).send({ error: 'Usuario nao encontrado ou inativo' })

      // Admin DBS — retorna todas as organizações do sistema
      // Usa perfil do banco (não do JWT) para evitar token desatualizado
      let organizacoes: any[]
      if (usuario.perfil === 'Admin') {
        const todasOrgs = await prisma.organizacao.findMany({
          where: { ativo: true },
          select: { id: true, nome: true, slug: true, modelo: true, idGrupo: true },
          orderBy: { nome: 'asc' },
        })
        organizacoes = todasOrgs.map(o => ({
          idOrganizacao: o.id,
          nomeOrganizacao: o.nome,
          slugOrganizacao: o.slug,
          modeloOrganizacao: o.modelo,
          idGrupo: o.idGrupo,
          perfil: 'Admin',
        }))
      } else {
        // Usuário normal — organização principal sempre incluída, mesclada
        // com vínculos secundários (multi-empresa).
        const acessiveis = await organizacoesDoUsuario(usuario)
        organizacoes = acessiveis.map(v => ({
          idOrganizacao: v.organizacao.id,
          nomeOrganizacao: v.organizacao.nome,
          slugOrganizacao: v.organizacao.slug,
          modeloOrganizacao: v.organizacao.modelo,
          idGrupo: v.organizacao.idGrupo,
          perfil: v.perfil,
        }))
      }

      return reply.send({
        id: usuario.id, nome: usuario.nome, email: usuario.email,
        login: usuario.login, perfil: usuario.perfil,
        alcadaValor: usuario.alcadaValor,
        idOrganizacao: usuario.idOrganizacao,
        nomeOrganizacao: usuario.organizacao.nome,
        slugOrganizacao: usuario.organizacao.slug,
        modeloOrganizacao: usuario.organizacao.modelo,
        idGrupo: usuario.organizacao.idGrupo,
        organizacoes,
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

    let payload: JwtPayload
    try {
      payload = verificarToken(authHeader.slice(7))
    } catch {
      return reply.status(401).send({ error: 'Token invalido ou expirado' })
    }

    try {
      const usuario = await prisma.usuario.findUnique({ where: { id: payload.sub } })
      if (!usuario || !usuario.senhaHash) return reply.status(404).send({ error: 'Usuario nao encontrado' })
      if (!await bcrypt.compare(senhaAtual, usuario.senhaHash)) return reply.status(401).send({ error: 'Senha atual incorreta' })
      await prisma.usuario.update({ where: { id: payload.sub }, data: { senhaHash: await bcrypt.hash(novaSenha, 10), trocarSenha: false } })
      const { exp, iat, ...payloadLimpo } = payload as any
      const novoPayload = { ...payloadLimpo, trocarSenha: false }
      return reply.send({ ok: true, token: assinarToken(novoPayload) })
    } catch (err: any) {
      return reply.status(500).send({ error: err?.message ?? 'Erro interno ao trocar senha' })
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
