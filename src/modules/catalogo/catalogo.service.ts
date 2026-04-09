import prisma from '../../shared/prisma'

// Domínio: tipo 1=Material, 2=Servico | status 1=Rascunho, 2=Ativo, 3=Reprovado, 4=Inativo

export async function listarItens(organizacaoId: string) {
  return prisma.itemCatalogo.findMany({
    where: { idOrganizacao: organizacaoId, status: 2 }, // 2 = Ativo
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
  const tipoPrefix = dados.tipo === 'Material' ? 'MAT' : 'SRV'
  const codigoInterno = `CAT-${tipoPrefix}-${seq}`
  const tipoInt = dados.tipo === 'Material' ? 1 : 2

  return prisma.itemCatalogo.create({
    data: {
      idOrganizacao: dados.idOrganizacao,
      nome: dados.nome,
      descricaoTecnica: dados.descricaoTecnica,
      tipo: tipoInt,
      unidadeMedida: dados.unidadeMedida,
      criadoPor: dados.criadoPor,
      idCategoria: dados.idCategoria,
      codigoCatmatCatser: dados.codigoCatmatCatser,
      codigoInterno,
      status: 1 // Rascunho
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
  const statusMap: Record<string, number> = {
    'Rascunho': 1, 'Ativo': 2, 'Reprovado': 3, 'Inativo': 4
  }
  const statusInt = statusMap[status] ?? 1

  const item = await prisma.itemCatalogo.update({
    where: { id },
    data: { status: statusInt }
  })

  await prisma.auditoriaItem.create({
    data: {
      idItem: id,
      acao: status.toLowerCase().replace(' ', '_'),
      campo: 'status',
      valorDepois: String(statusInt),
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