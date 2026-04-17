import prisma from '../../shared/prisma'
import { parseCnpj, formatarCnpj } from '../../shared/cnpj.utils'
import { gerarConfiguracoesPadrao } from '../configuracoes/configuracoes.service'
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
  if (existente) throw new Error('Organizacao com este CNPJ ja cadastrada')

  const org = await prisma.organizacao.create({
    data: {
      nome:              data.nome,
      configuracoes:     gerarConfiguracoesPadrao() as any,
      cnpj:              cnpjLimpo,
      modelo:            data.modelo ?? 1,
      razaoSocial:       data.razaoSocial,
      nomeFantasia:      data.nomeFantasia,
      situacaoCadastral: data.situacaoCadastral,
      naturezaJuridica:  data.naturezaJuridica,
      dataAbertura:      data.dataAbertura,
      cnaePrincipal:     data.cnaePrincipal,
      descricaoCnae:     data.descricaoCnae,
      logradouro:        data.logradouro,
      numero:            data.numero,
      complemento:       data.complemento,
      bairro:            data.bairro,
      municipio:         data.municipio,
      uf:                data.uf,
      cep:               data.cep,
      telefone:          data.telefone,
      email:             data.email,
      porte:             data.porte,
      capitalSocial:     data.capitalSocial,
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
  if (!org) throw new Error('Organizacao nao encontrada')

  const cnpjLimpo = data.cnpj ? parseCnpj(data.cnpj) : undefined

  if (cnpjLimpo) {
    const existente = await prisma.organizacao.findFirst({
      where: { cnpj: cnpjLimpo, NOT: { id } },
    })
    if (existente) throw new Error('CNPJ ja cadastrado em outra organizacao')
  }

  const atualizada = await prisma.organizacao.update({
    where: { id },
    data: {
      ...(data.nome      ? { nome: data.nome }           : {}),
      ...(data.modelo    ? { modelo: data.modelo }       : {}),
      ...(cnpjLimpo      ? { cnpj: cnpjLimpo }           : {}),
      ...(data.razaoSocial       !== undefined ? { razaoSocial: data.razaoSocial }             : {}),
      ...(data.nomeFantasia      !== undefined ? { nomeFantasia: data.nomeFantasia }           : {}),
      ...(data.situacaoCadastral !== undefined ? { situacaoCadastral: data.situacaoCadastral } : {}),
      ...(data.naturezaJuridica  !== undefined ? { naturezaJuridica: data.naturezaJuridica }   : {}),
      ...(data.dataAbertura      !== undefined ? { dataAbertura: data.dataAbertura }           : {}),
      ...(data.cnaePrincipal     !== undefined ? { cnaePrincipal: data.cnaePrincipal }         : {}),
      ...(data.descricaoCnae     !== undefined ? { descricaoCnae: data.descricaoCnae }         : {}),
      ...(data.logradouro        !== undefined ? { logradouro: data.logradouro }               : {}),
      ...(data.numero            !== undefined ? { numero: data.numero }                       : {}),
      ...(data.complemento       !== undefined ? { complemento: data.complemento }             : {}),
      ...(data.bairro            !== undefined ? { bairro: data.bairro }                       : {}),
      ...(data.municipio         !== undefined ? { municipio: data.municipio }                 : {}),
      ...(data.uf                !== undefined ? { uf: data.uf }                               : {}),
      ...(data.cep               !== undefined ? { cep: data.cep }                             : {}),
      ...(data.telefone          !== undefined ? { telefone: data.telefone }                   : {}),
      ...(data.email             !== undefined ? { email: data.email }                         : {}),
      ...(data.porte             !== undefined ? { porte: data.porte }                         : {}),
      ...(data.capitalSocial     !== undefined ? { capitalSocial: data.capitalSocial }         : {}),
    },
  })

  return formatarOrg(atualizada)
}

export async function alterarStatusOrganizacao(id: string, data: StatusOrganizacaoInput) {
  const org = await prisma.organizacao.findUnique({ where: { id } })
  if (!org) throw new Error('Organizacao nao encontrada')

  const atualizada = await prisma.organizacao.update({
    where: { id },
    data: { ativo: data.ativo },
  })

  return formatarOrg(atualizada)
}
