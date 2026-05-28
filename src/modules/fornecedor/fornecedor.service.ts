import prisma from '../../shared/prisma'
import { parseCnpj, formatarCnpj } from '../../shared/cnpj.utils'
import {
  CriarFornecedorInput,
  QualificarFornecedorInput,
  AdicionarDocumentoInput,
  SuspenderFornecedorInput,
} from './fornecedor.schema'

// Domínio fornecedor.status: 1=Ativo, 2=Suspenso, 3=Bloqueado
// Domínio documento.status:  1=Vigente, 2=Vencido, 3=Cancelado

function formatarCnpjFornecedor<T extends { cnpj: string }>(f: T): T {
  return { ...f, cnpj: formatarCnpj(f.cnpj) }
}

export async function criarFornecedor(data: CriarFornecedorInput) {
  const cnpjLimpo = parseCnpj(data.cnpj)

  const existente = await prisma.fornecedor.findUnique({
    where: { idOrganizacao_cnpj: { idOrganizacao: data.idOrganizacao, cnpj: cnpjLimpo } },
  })
  if (existente) throw new Error('Fornecedor com este CNPJ já cadastrado')

  const fornecedor = await prisma.fornecedor.create({
    data: {
      idOrganizacao:      data.idOrganizacao,
      cnpj:               cnpjLimpo,
      razaoSocial:        data.razaoSocial,
      nomeFantasia:       data.nomeFantasia,
      email:              data.email || undefined,
      telefone:           data.telefone,
      telefone2:          data.telefone2,
      status:             1,

      // Receita Federal
      situacaoCadastral:   data.situacaoCadastral,
      descricaoSituacao:   data.descricaoSituacao,
      dataSituacao:        data.dataSituacao,
      dataInicioAtividade: data.dataInicioAtividade,
      naturezaJuridica:    data.naturezaJuridica,
      porte:               data.porte,
      capitalSocial:       data.capitalSocial,
      cnaeAtividade:       data.cnaeAtividade,
      cnaeDescricao:       data.cnaeDescricao,

      // Endereço
      logradouro:     data.logradouro,
      numeroEndereco: data.numeroEndereco,
      complemento:    data.complemento,
      bairro:         data.bairro,
      municipio:      data.municipio,
      uf:             data.uf,
      cep:            data.cep,
    },
  })

  return formatarCnpjFornecedor(fornecedor)
}

export async function listarFornecedores(idOrganizacao: string) {
  const lista = await prisma.fornecedor.findMany({
    where: { idOrganizacao },
    include: { qualificacoes: true, documentos: true },
    orderBy: { razaoSocial: 'asc' },
  })
  return lista.map(formatarCnpjFornecedor)
}

export async function buscarFornecedor(id: string) {
  const fornecedor = await prisma.fornecedor.findUnique({
    where: { id },
    include: { qualificacoes: { include: { categoria: true } }, documentos: true },
  })
  if (!fornecedor) return null
  return formatarCnpjFornecedor(fornecedor)
}

export async function qualificarFornecedor(id: string, data: QualificarFornecedorInput) {
  const fornecedor = await prisma.fornecedor.findUnique({ where: { id } })
  if (!fornecedor) throw new Error('Fornecedor não encontrado')
  if (fornecedor.status !== 1)
    throw new Error('Apenas fornecedores ativos podem ser qualificados')

  return prisma.qualificacaoFornecedor.upsert({
    where: { idFornecedor_idCategoria: { idFornecedor: id, idCategoria: data.idCategoria } },
    update: { capacidade: data.capacidade, certificacoes: data.certificacoes, ativo: true },
    create: { idFornecedor: id, idCategoria: data.idCategoria, capacidade: data.capacidade, certificacoes: data.certificacoes },
  })
}

export async function adicionarDocumento(id: string, data: AdicionarDocumentoInput) {
  const fornecedor = await prisma.fornecedor.findUnique({ where: { id } })
  if (!fornecedor) throw new Error('Fornecedor não encontrado')

  return prisma.documentoFornecedor.create({
    data: {
      idFornecedor:   id,
      tipo:           data.tipo,
      numero:         data.numero,
      dataEmissao:    data.dataEmissao    ? new Date(data.dataEmissao)    : null,
      dataVencimento: data.dataVencimento ? new Date(data.dataVencimento) : null,
      arquivo:        data.arquivo,
      status:         1,
    },
  })
}

export async function listarDocumentosVencendo(idOrganizacao: string) {
  const hoje   = new Date()
  const em30   = new Date()
  em30.setDate(hoje.getDate() + 30)

  const docs = await prisma.documentoFornecedor.findMany({
    where: { fornecedor: { idOrganizacao }, dataVencimento: { lte: em30 }, status: 1 },
    include: { fornecedor: true },
    orderBy: { dataVencimento: 'asc' },
  })

  return docs.map(d => ({ ...d, fornecedor: formatarCnpjFornecedor(d.fornecedor) }))
}

export async function suspenderFornecedor(id: string, data: SuspenderFornecedorInput) {
  const fornecedor = await prisma.fornecedor.findUnique({ where: { id } })
  if (!fornecedor) throw new Error('Fornecedor não encontrado')

  const statusMap: Record<string, number> = { 'Ativo': 1, 'Suspenso': 2, 'Bloqueado': 3 }
  const statusInt = statusMap[data.status] ?? 1

  const atualizado = await prisma.fornecedor.update({
    where: { id },
    data: { status: statusInt, motivoBloqueio: data.motivoBloqueio },
  })

  return formatarCnpjFornecedor(atualizado)
}
