import { FastifyInstance } from 'fastify'
import bcrypt from 'bcryptjs'
import prisma from '../../shared/prisma'

// ─── Regras de senha forte ────────────────────────────────────────────────────
// Mínimo 8 caracteres, 1 maiúscula, 1 número, 1 especial
function validarSenhaForte(senha: string): { valida: boolean; motivo?: string } {
  if (senha.length < 8)
    return { valida: false, motivo: 'A senha deve ter ao menos 8 caracteres' }
  if (!/[A-Z]/.test(senha))
    return { valida: false, motivo: 'A senha deve ter ao menos 1 letra maiúscula' }
  if (!/[0-9]/.test(senha))
    return { valida: false, motivo: 'A senha deve ter ao menos 1 número' }
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(senha))
    return { valida: false, motivo: 'A senha deve ter ao menos 1 caractere especial (!@#$%...)' }
  return { valida: true }
}

// Gera senha inicial no formato Db@XXXXXX (segura e fácil de repassar)
function gerarSenhaInicial(): string {
  const nums = Math.floor(100000 + Math.random() * 900000)
  return `Db@${nums}`
}

export async function usuarioRoutes(app: FastifyInstance) {

  // GET /usuarios?idOrganizacao=
  app.get('/usuarios', async (request, reply) => {
    const { idOrganizacao } = request.query as { idOrganizacao: string }
    if (!idOrganizacao) return reply.status(400).send({ error: 'idOrganizacao é obrigatório' })

    const usuarios = await prisma.usuario.findMany({
      where: { idOrganizacao },
      orderBy: { nome: 'asc' },
      select: {
        id: true,
        nome: true,
        email: true,
        perfil: true,
        alcadaValor: true,
        ativo: true,
        criadoEm: true,
      },
    })
    return reply.send(usuarios)
  })

  // GET /usuarios/:id
  app.get('/usuarios/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const usuario = await prisma.usuario.findUnique({
      where: { id },
      select: {
        id: true,
        nome: true,
        email: true,
        perfil: true,
        alcadaValor: true,
        ativo: true,
        criadoEm: true,
        idOrganizacao: true,
      },
    })
    if (!usuario) return reply.status(404).send({ error: 'Usuário não encontrado' })
    return reply.send(usuario)
  })

  // POST /usuarios — cria usuário com senha inicial automática
  app.post('/usuarios', async (request, reply) => {
    const body = request.body as {
      idOrganizacao: string
      nome: string
      email: string
      perfil: string
      alcadaValor?: number
    }

    if (!body.idOrganizacao || !body.nome || !body.email || !body.perfil) {
      return reply.status(400).send({ error: 'Campos obrigatórios faltando' })
    }

    // Verifica se e-mail já existe
    const emailExistente = await prisma.usuario.findUnique({
      where: { email: body.email.toLowerCase().trim() }
    })
    if (emailExistente) {
      return reply.status(400).send({ error: 'E-mail já cadastrado no sistema' })
    }

    // Gera senha inicial
    const senhaInicial = gerarSenhaInicial()
    const senhaHash = await bcrypt.hash(senhaInicial, 10)

    const usuario = await prisma.usuario.create({
      data: {
        idOrganizacao: body.idOrganizacao,
        nome: body.nome,
        email: body.email.toLowerCase().trim(),
        perfil: body.perfil,
        alcadaValor: body.alcadaValor ?? null,
        senhaHash,
      },
      select: {
        id: true,
        nome: true,
        email: true,
        perfil: true,
        alcadaValor: true,
        ativo: true,
        criadoEm: true,
      },
    })

    // Retorna o usuário + senha inicial para o admin repassar
    return reply.status(201).send({
      ...usuario,
      senhaInicial, // Exibir na tela e nunca mais retornar após isso
    })
  })

  // PATCH /usuarios/:id
  app.patch('/usuarios/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const body = request.body as {
      nome?: string
      email?: string
      perfil?: string
      alcadaValor?: number
      ativo?: boolean
    }
    const usuario = await prisma.usuario.update({
      where: { id },
      data: body,
    })
    return reply.send(usuario)
  })

  // PATCH /usuarios/:id/status
  app.patch('/usuarios/:id/status', async (request, reply) => {
    const { id } = request.params as { id: string }
    const { ativo } = request.body as { ativo: boolean }
    const usuario = await prisma.usuario.update({
      where: { id },
      data: { ativo },
    })
    return reply.send(usuario)
  })

  // PATCH /usuarios/:id/resetar-senha — admin reseta senha de um usuário
  app.patch('/usuarios/:id/resetar-senha', async (request, reply) => {
    const { id } = request.params as { id: string }

    const senhaInicial = gerarSenhaInicial()
    const senhaHash = await bcrypt.hash(senhaInicial, 10)

    await prisma.usuario.update({
      where: { id },
      data: { senhaHash },
    })

    return reply.send({ senhaInicial })
  })

  // GET /usuarios/:id/filial?idOrganizacao= — retorna filial vinculada ao usuário na org
  app.get('/usuarios/:id/filial', async (request, reply) => {
    const { id } = request.params as { id: string }
    const { idOrganizacao } = request.query as { idOrganizacao: string }
    if (!idOrganizacao) return reply.status(400).send({ error: 'idOrganizacao é obrigatório' })

    const vinculo = await prisma.usuarioOrganizacao.findFirst({
      where: { idUsuario: id, idOrganizacao },
      include: { filial: { select: { id: true, nome: true, cnpj: true, isMatriz: true } } },
    })
    return reply.send({
      idFilial: vinculo?.idFilial ?? null,
      nomeFilial: vinculo?.filial?.nome ?? null,
      cnpjFilial: vinculo?.filial?.cnpj ?? null,
      isMatriz: vinculo?.filial?.isMatriz ?? false,
    })
  })

  // PATCH /usuarios/:id/filial — vincula ou desvincula filial do usuário na org
  app.patch('/usuarios/:id/filial', async (request, reply) => {
    const { id } = request.params as { id: string }
    const { idFilial, idOrganizacao } = request.body as { idFilial: string | null; idOrganizacao: string }
    if (!idOrganizacao) return reply.status(400).send({ error: 'idOrganizacao é obrigatório' })

    const updated = await prisma.usuarioOrganizacao.updateMany({
      where: { idUsuario: id, idOrganizacao },
      data: { idFilial: idFilial ?? null },
    })

    if (updated.count === 0) {
      return reply.status(404).send({ error: 'Vínculo do usuário com a organização não encontrado' })
    }

    return reply.send({ ok: true })
  })
}
