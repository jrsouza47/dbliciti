import prisma from '../../shared/prisma'
import { parseCnpj, formatarCnpj } from '../../shared/cnpj.utils'
import {
  CriarOrganizacaoInput,
  AtualizarOrganizacaoInput,
  StatusOrganizacaoInput,
} from './organizacao.schema'

function formatarOrg<T extends { cnpj: string | null }>(org: T): T {
  return { ...org, cnpj: org.cnpj ? formatarCnpj(org.cnpj) : null }
}

export async function criarOrganizacao(data: CriarOrganizacaoInput) {
  const cnpjLimpo = parseCnpj(data.cnpj)

  const existente = await prisma.organizacao.findFirst({
    where: { cnpj: cnpjLimpo },
  })
  if (existente) throw new Error('Organização com este CNPJ já cadastrada')

  const org = await prisma.organizacao.create({
    data: {
      nome: data.nome,
      cnpj: cnpjLimpo,
      modelo: data.modelo ?? 1,
    },
  })

  return formatarOrg(org)
}

export async function listarOrganizacoes() {
  const lista = await prisma.organizacao.findMany({
    orderBy: { nome: 'asc' },
  })
  return lista.map(formatarOrg)
}

export async function buscarOrganizacao(id: string) {
  const org = await prisma.organizacao.findUnique({ where: { id } })
  if (!org) return null
  return formatarOrg(org)
}

export async function atualizarOrganizacao(id: string, data: AtualizarOrganizacaoInput) {
  const org = await prisma.organizacao.findUnique({ where: { id } })
  if (!org) throw new Error('Organização não encontrada')

  const cnpjLimpo = data.cnpj ? parseCnpj(data.cnpj) : undefined

  if (cnpjLimpo) {
    const existente = await prisma.organizacao.findFirst({
      where: { cnpj: cnpjLimpo, NOT: { id } },
    })
    if (existente) throw new Error('CNPJ já cadastrado em outra organização')
  }

  const atualizada = await prisma.organizacao.update({
    where: { id },
    data: {
      ...(data.nome ? { nome: data.nome } : {}),
      ...(data.modelo ? { modelo: data.modelo } : {}),
      ...(cnpjLimpo ? { cnpj: cnpjLimpo } : {}),
    },
  })

  return formatarOrg(atualizada)
}

export async function alterarStatusOrganizacao(id: string, data: StatusOrganizacaoInput) {
  const org = await prisma.organizacao.findUnique({ where: { id } })
  if (!org) throw new Error('Organização não encontrada')

  const atualizada = await prisma.organizacao.update({
    where: { id },
    data: { ativo: data.ativo },
  })

  return formatarOrg(atualizada)
}