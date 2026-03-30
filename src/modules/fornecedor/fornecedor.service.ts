import prisma from '../../shared/prisma'
import {
  CriarFornecedorInput,
  QualificarFornecedorInput,
  AdicionarDocumentoInput,
  SuspenderFornecedorInput,
} from './fornecedor.schema'

// M5-01 — Cadastrar fornecedor com validação de CNPJ
export async function criarFornecedor(data: CriarFornecedorInput) {
  const cnpjLimpo = data.cnpj.replace(/\D/g, '')

  const existente = await prisma.fornecedor.findUnique({
    where: {
      idOrganizacao_cnpj: {
        idOrganizacao: data.idOrganizacao,
        cnpj: cnpjLimpo,
      },
    },
  })
  if (existente) throw new Error('Fornecedor com este CNPJ ja cadastrado')

  return prisma.fornecedor.create({
    data: {
      ...data,
      cnpj: cnpjLimpo,
    },
  })
}

export async function listarFornecedores(idOrganizacao: string) {
  return prisma.fornecedor.findMany({
    where: { idOrganizacao },
    include: { qualificacoes: true, documentos: true },
    orderBy: { razaoSocial: 'asc' },
  })
}

export async function buscarFornecedor(id: string) {
  return prisma.fornecedor.findUnique({
    where: { id },
    include: { qualificacoes: { include: { categoria: true } }, documentos: true },
  })
}

// M5-02 — Qualificar fornecedor por categoria
export async function qualificarFornecedor(id: string, data: QualificarFornecedorInput) {
  const fornecedor = await prisma.fornecedor.findUnique({ where: { id } })
  if (!fornecedor) throw new Error('Fornecedor nao encontrado')
  if (fornecedor.status !== 'Ativo') throw new Error('Apenas fornecedores ativos podem ser qualificados')

  return prisma.qualificacaoFornecedor.upsert({
    where: {
      idFornecedor_idCategoria: {
        idFornecedor: id,
        idCategoria: data.idCategoria,
      },
    },
    update: {
      capacidade: data.capacidade,
      certificacoes: data.certificacoes,
      ativo: true,
    },
    create: {
      idFornecedor: id,
      idCategoria: data.idCategoria,
      capacidade: data.capacidade,
      certificacoes: data.certificacoes,
    },
  })
}

// M5-03 — Controlar documentação e certidões
export async function adicionarDocumento(id: string, data: AdicionarDocumentoInput) {
  const fornecedor = await prisma.fornecedor.findUnique({ where: { id } })
  if (!fornecedor) throw new Error('Fornecedor nao encontrado')

  return prisma.documentoFornecedor.create({
    data: {
      idFornecedor: id,
      tipo: data.tipo,
      numero: data.numero,
      dataEmissao: data.dataEmissao ? new Date(data.dataEmissao) : null,
      dataVencimento: data.dataVencimento ? new Date(data.dataVencimento) : null,
      arquivo: data.arquivo,
      status: 'Vigente',
    },
  })
}

export async function listarDocumentosVencendo(idOrganizacao: string) {
  const hoje = new Date()
  const em30dias = new Date()
  em30dias.setDate(hoje.getDate() + 30)

  return prisma.documentoFornecedor.findMany({
    where: {
      fornecedor: { idOrganizacao },
      dataVencimento: { lte: em30dias },
      status: 'Vigente',
    },
    include: { fornecedor: true },
    orderBy: { dataVencimento: 'asc' },
  })
}

// M5-04 — Suspender ou bloquear fornecedor
export async function suspenderFornecedor(id: string, data: SuspenderFornecedorInput) {
  const fornecedor = await prisma.fornecedor.findUnique({ where: { id } })
  if (!fornecedor) throw new Error('Fornecedor nao encontrado')

  return prisma.fornecedor.update({
    where: { id },
    data: {
      status: data.status,
      motivoBloqueio: data.motivoBloqueio,
    },
  })
}