import prisma from '../../shared/prisma'
import { parseCnpj, formatarCnpj } from '../../shared/cnpj.utils'
import {
  CriarFornecedorInput,
  AtualizarFornecedorInput,
  QualificarFornecedorInput,
  AdicionarDocumentoInput,
  SuspenderFornecedorInput,
} from './fornecedor.schema'

function fmt<T extends { cnpj: string }>(f: T): T {
  return { ...f, cnpj: formatarCnpj(f.cnpj) }
}

function str(v: string | null | undefined): string | null {
  if (v === undefined || v === null) return null;
  const s = v.trim();
  return s.length > 0 ? s : null;
}

export async function criarFornecedor(data: CriarFornecedorInput) {
  const cnpjLimpo = parseCnpj(data.cnpj)
  const existente = await prisma.fornecedor.findUnique({
    where: { idOrganizacao_cnpj: { idOrganizacao: data.idOrganizacao, cnpj: cnpjLimpo } },
  })
  if (existente) throw new Error('Fornecedor com este CNPJ já cadastrado')

  return fmt(await prisma.fornecedor.create({
    data: {
      idOrganizacao: data.idOrganizacao, cnpj: cnpjLimpo,
      razaoSocial: data.razaoSocial, nomeFantasia: str(data.nomeFantasia),
      email: str(data.email), telefone: str(data.telefone), telefone2: str(data.telefone2),
      status: 1,
      situacaoCadastral: data.situacaoCadastral, descricaoSituacao: str(data.descricaoSituacao),
      dataSituacao: str(data.dataSituacao), dataInicioAtividade: str(data.dataInicioAtividade),
      naturezaJuridica: str(data.naturezaJuridica), porte: str(data.porte),
      capitalSocial: data.capitalSocial, cnaeAtividade: str(data.cnaeAtividade), cnaeDescricao: str(data.cnaeDescricao),
      logradouro: str(data.logradouro), numeroEndereco: str(data.numeroEndereco),
      complemento: str(data.complemento), bairro: str(data.bairro),
      municipio: str(data.municipio), uf: str(data.uf), cep: str(data.cep),
    },
  }))
}

export async function atualizarFornecedor(id: string, data: AtualizarFornecedorInput) {
  const fornecedor = await prisma.fornecedor.findUnique({ where: { id } })
  if (!fornecedor) throw new Error('Fornecedor não encontrado')

  // Sempre atualiza todos os campos enviados — str() converte '' para null
  return fmt(await prisma.fornecedor.update({
    where: { id },
    data: {
      razaoSocial:      data.razaoSocial      ?? fornecedor.razaoSocial,
      nomeFantasia:     str(data.nomeFantasia  ?? fornecedor.nomeFantasia),
      email:            str(data.email         ?? fornecedor.email),
      telefone:         str(data.telefone      ?? fornecedor.telefone),
      telefone2:        str(data.telefone2     ?? fornecedor.telefone2),
      naturezaJuridica: str(data.naturezaJuridica ?? fornecedor.naturezaJuridica),
      porte:            str(data.porte         ?? fornecedor.porte),
      cnaeAtividade:    str(data.cnaeAtividade ?? fornecedor.cnaeAtividade),
      cnaeDescricao:    str(data.cnaeDescricao ?? fornecedor.cnaeDescricao),
      logradouro:       str(data.logradouro    ?? fornecedor.logradouro),
      numeroEndereco:   str(data.numeroEndereco ?? fornecedor.numeroEndereco),
      complemento:      str(data.complemento   ?? fornecedor.complemento),
      bairro:           str(data.bairro        ?? fornecedor.bairro),
      municipio:        str(data.municipio     ?? fornecedor.municipio),
      uf:               str(data.uf            ?? fornecedor.uf),
      cep:              str(data.cep           ?? fornecedor.cep),
    },
  }))
}

export async function excluirFornecedor(id: string) {
  const fornecedor = await prisma.fornecedor.findUnique({
    where: { id }, include: { contratos: true },
  })
  if (!fornecedor) throw new Error('Fornecedor não encontrado')
  if (fornecedor.contratos.length > 0)
    throw new Error('Fornecedor possui contratos vinculados e não pode ser excluído')

  await prisma.qualificacaoFornecedor.deleteMany({ where: { idFornecedor: id } })
  await prisma.documentoFornecedor.deleteMany({ where: { idFornecedor: id } })
  await prisma.fornecedor.delete({ where: { id } })
}

export async function listarFornecedores(idOrganizacao: string) {
  const lista = await prisma.fornecedor.findMany({
    where: { idOrganizacao },
    include: { qualificacoes: true, documentos: true },
    orderBy: { razaoSocial: 'asc' },
  })
  return lista.map(fmt)
}

export async function buscarFornecedor(id: string) {
  const fornecedor = await prisma.fornecedor.findUnique({
    where: { id },
    include: { qualificacoes: { include: { categoria: true } }, documentos: true },
  })
  if (!fornecedor) return null
  return fmt(fornecedor)
}

export async function qualificarFornecedor(id: string, data: QualificarFornecedorInput) {
  const fornecedor = await prisma.fornecedor.findUnique({ where: { id } })
  if (!fornecedor) throw new Error('Fornecedor não encontrado')
  if (fornecedor.status !== 1) throw new Error('Apenas fornecedores ativos podem ser qualificados')

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
      idFornecedor: id, tipo: data.tipo, numero: data.numero,
      dataEmissao:    data.dataEmissao    ? new Date(data.dataEmissao)    : null,
      dataVencimento: data.dataVencimento ? new Date(data.dataVencimento) : null,
      arquivo: data.arquivo, status: 1,
    },
  })
}

export async function listarDocumentosVencendo(idOrganizacao: string) {
  const hoje = new Date(); const em30 = new Date(); em30.setDate(hoje.getDate() + 30)
  const docs = await prisma.documentoFornecedor.findMany({
    where: { fornecedor: { idOrganizacao }, dataVencimento: { lte: em30 }, status: 1 },
    include: { fornecedor: true }, orderBy: { dataVencimento: 'asc' },
  })
  return docs.map(d => ({ ...d, fornecedor: fmt(d.fornecedor) }))
}

export async function suspenderFornecedor(id: string, data: SuspenderFornecedorInput) {
  const fornecedor = await prisma.fornecedor.findUnique({ where: { id } })
  if (!fornecedor) throw new Error('Fornecedor não encontrado')
  const statusMap: Record<string, number> = { 'Ativo': 1, 'Suspenso': 2, 'Bloqueado': 3 }
  return fmt(await prisma.fornecedor.update({
    where: { id },
    data: { status: statusMap[data.status] ?? 1, motivoBloqueio: data.motivoBloqueio },
  }))
}
