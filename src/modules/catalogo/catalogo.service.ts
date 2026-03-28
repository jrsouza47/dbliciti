import prisma from '../../shared/prisma'

export async function listarItens(organizacaoId: string) {
  return prisma.itemCatalogo.findMany({
    where: { idOrganizacao: organizacaoId, status: 'Ativo' },
    orderBy: { criadoEm: 'desc' }
  })
}

export async function buscarItemPorId(id: string, organizacaoId: string) {
  return prisma.itemCatalogo.findFirst({
    where: { id, idOrganizacao: organizacaoId },
    include: {
      categoria: true,
      precos: { orderBy: { dataReferencia: 'desc' }, take: 1 }
    }
  })
}

export async function criarItem(dados: {
  idOrganizacao: string
  nome: string
  descricaoTecnica: string
  tipo: string
  unidadeMedida: string
  criadoPor: string
  idCategoria?: string
  codigoCatmatCatser?: string
}) {
  const total = await prisma.itemCatalogo.count({
    where: { idOrganizacao: dados.idOrganizacao }
  })

  const seq = String(total + 1).padStart(6, '0')
  const tipo = dados.tipo === 'MATERIAL' ? 'MAT' : 'SRV'
  const codigoInterno = `CAT-${tipo}-${seq}`

  return prisma.itemCatalogo.create({
    data: {
      ...dados,
      codigoInterno,
      status: 'Rascunho'
    }
  })
}

export async function atualizarStatusItem(
  id: string,
  organizacaoId: string,
  status: string,
  usuarioId: string,
  justificativa?: string
) {
  const item = await prisma.itemCatalogo.update({
    where: { id },
    data: { status }
  })

  await prisma.auditoriaItem.create({
    data: {
      idItem: id,
      acao: status.toLowerCase().replace(' ', '_'),
      campo: 'status',
      valorDepois: status,
      usuarioId
    }
  })

  return item
}

export async function registrarPreco(dados: {
  idItem: string
  valor: number
  fonte: string
  dataReferencia: string
  responsavelId: string
}) {
  return prisma.precoReferencia.create({
    data: {
      ...dados,
      dataReferencia: new Date(dados.dataReferencia)
    }
  })
}