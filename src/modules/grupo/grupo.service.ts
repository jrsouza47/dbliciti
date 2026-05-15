import prisma from '../../shared/prisma'

export async function listarGrupos() {
  return prisma.grupo.findMany({
    orderBy: { nome: 'asc' },
    include: {
      organizacoes: {
        select: {
          id: true, nome: true, cnpj: true, ativo: true, slug: true,
          idGrupo: true,
        },
      },
    },
  })
}

export async function buscarGrupo(id: string) {
  return prisma.grupo.findUnique({
    where: { id },
    include: {
      organizacoes: {
        select: {
          id: true, nome: true, cnpj: true, ativo: true, slug: true,
          idGrupo: true,
        },
      },
    },
  })
}

export async function organizacoesSemGrupo() {
  return prisma.organizacao.findMany({
    where: { idGrupo: null, ativo: true },
    select: { id: true, nome: true, cnpj: true, ativo: true, slug: true },
    orderBy: { nome: 'asc' },
  })
}

export async function criarGrupo(data: { nome: string; cnpj?: string }) {
  return prisma.grupo.create({ data })
}

export async function vincularOrganizacao(idGrupo: string, idOrganizacao: string) {
  const grupo = await prisma.grupo.findUnique({ where: { id: idGrupo } })
  if (!grupo) throw new Error('Grupo não encontrado')

  const org = await prisma.organizacao.findUnique({ where: { id: idOrganizacao } })
  if (!org) throw new Error('Organização não encontrada')

  return prisma.organizacao.update({
    where: { id: idOrganizacao },
    data: { idGrupo },
  })
}

export async function desvincularOrganizacao(idGrupo: string, idOrganizacao: string) {
  const org = await prisma.organizacao.findUnique({ where: { id: idOrganizacao } })
  if (!org) throw new Error('Organização não encontrada')
  if (org.idGrupo !== idGrupo) throw new Error('Organização não pertence a este grupo')

  return prisma.organizacao.update({
    where: { id: idOrganizacao },
    data: { idGrupo: null },
  })
}

export async function excluirGrupo(id: string) {
  const grupo = await prisma.grupo.findUnique({
    where: { id },
    include: { organizacoes: { select: { id: true } } },
  })
  if (!grupo) throw new Error('Grupo não encontrado')
  if (grupo.organizacoes.length > 0) {
    throw new Error(
      `Não é possível excluir: o grupo possui ${grupo.organizacoes.length} organização(ões) vinculada(s). Desvincule-as primeiro.`
    )
  }
  return prisma.grupo.delete({ where: { id } })
}
