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
