import prisma from '../../shared/prisma'
import { Prisma } from '@prisma/client'
import { parseCnpj, formatarCnpj } from '../../shared/cnpj.utils'
import { CriarFilialInput, AtualizarFilialInput } from './filial.schema'

function formatarCnpjFilial<T extends { cnpj: string }>(f: T): T {
  return { ...f, cnpj: formatarCnpj(f.cnpj) }
}

function toJsonValue(val: Record<string, unknown> | undefined): Prisma.InputJsonValue | typeof Prisma.JsonNull {
  return val ? (val as Prisma.InputJsonValue) : Prisma.JsonNull
}

export async function criarFilial(data: CriarFilialInput) {
  const cnpjLimpo = parseCnpj(data.cnpj)

  const existente = await prisma.filial.findUnique({ where: { cnpj: cnpjLimpo } })
  if (existente) throw new Error('CNPJ já cadastrado para outra filial')

  const filial = await prisma.filial.create({
    data: {
      ...data,
      cnpj: cnpjLimpo,
      configuracaoCentralCompras: toJsonValue(data.configuracaoCentralCompras),
    },
  })

  return formatarCnpjFilial(filial)
}

export async function listarFiliais(idOrganizacao: string) {
  const lista = await prisma.filial.findMany({
    where: { idOrganizacao },
    orderBy: [{ isMatriz: 'desc' }, { nome: 'asc' }],
  })
  return lista.map(formatarCnpjFilial)
}

export async function buscarFilial(id: string) {
  const filial = await prisma.filial.findUnique({
    where: { id },
    include: {
      organizacao: { select: { id: true, nome: true, cnpj: true } },
    },
  })
  if (!filial) return null
  return formatarCnpjFilial(filial)
}

export async function atualizarFilial(id: string, data: AtualizarFilialInput) {
  const filial = await prisma.filial.findUnique({ where: { id } })
  if (!filial) throw new Error('Filial não encontrada')

  const cnpjLimpo = data.cnpj ? parseCnpj(data.cnpj) : undefined

  if (cnpjLimpo && cnpjLimpo !== filial.cnpj) {
    const existente = await prisma.filial.findUnique({ where: { cnpj: cnpjLimpo } })
    if (existente) throw new Error('CNPJ já cadastrado para outra filial')
  }

  const atualizada = await prisma.filial.update({
    where: { id },
    data: {
      ...data,
      ...(cnpjLimpo ? { cnpj: cnpjLimpo } : {}),
      ...(data.configuracaoCentralCompras !== undefined
        ? { configuracaoCentralCompras: toJsonValue(data.configuracaoCentralCompras) }
        : {}),
    },
  })

  return formatarCnpjFilial(atualizada)
}

export async function ativarDesativarFilial(id: string, ativo: boolean) {
  const filial = await prisma.filial.findUnique({ where: { id } })
  if (!filial) throw new Error('Filial não encontrada')

  const atualizada = await prisma.filial.update({
    where: { id },
    data: { ativo },
  })

  return formatarCnpjFilial(atualizada)
}

export async function deletarFilial(id: string) {
  const filial = await prisma.filial.findUnique({ where: { id } })
  if (!filial) throw new Error('Filial não encontrada')

  await prisma.filial.delete({ where: { id } })
  return { mensagem: 'Filial excluída com sucesso' }
}

// ── Filial Virtual ────────────────────────────────────────────────────────────
// Usada quando a organização NÃO usa filiais — invisível ao usuário

export async function criarFilialVirtual(idOrganizacao: string) {
  const org = await prisma.organizacao.findUnique({
    where: { id: idOrganizacao },
    select: { nome: true, cnpj: true, razaoSocial: true },
  })
  if (!org) throw new Error('Organização não encontrada')

  // Verificar se já existe filial virtual
  const existente = await prisma.filial.findFirst({
    where: { idOrganizacao, isVirtual: true },
  })
  if (existente) {
    // Reativar se estiver inativa
    if (!existente.ativo) {
      return prisma.filial.update({
        where: { id: existente.id },
        data: { ativo: true },
      })
    }
    return existente
  }

  return prisma.filial.create({
    data: {
      idOrganizacao,
      nome:        org.nome,
      cnpj:        org.cnpj ?? `00000000000${idOrganizacao.slice(0, 2)}`,
      razaoSocial: org.razaoSocial,
      isMatriz:    true,
      isVirtual:   true,
      ativo:       true,
    },
  })
}

export async function desativarFilialVirtual(idOrganizacao: string) {
  const virtual = await prisma.filial.findFirst({
    where: { idOrganizacao, isVirtual: true, ativo: true },
  })
  if (!virtual) return null
  return prisma.filial.update({
    where: { id: virtual.id },
    data: { ativo: false },
  })
}

export async function getFilialVirtual(idOrganizacao: string) {
  return prisma.filial.findFirst({
    where: { idOrganizacao, isVirtual: true, ativo: true },
  })
}
