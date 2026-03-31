import prisma from '../../shared/prisma'

export async function criarContrato(body: {
  idCotacao: string
  titulo: string
  dataInicio: string
  dataFim: string
  criadoPor: string
}) {
  const cotacao = await prisma.cotacao.findUnique({
    where: { id: body.idCotacao },
    include: {
      itens: { include: { propostas: { where: { homologada: true } } } },
      convites: { where: { status: 'Respondido' } }
    }
  })

  if (!cotacao) throw { statusCode: 404, message: 'Cotação não encontrada' }
  if (cotacao.status !== 'Homologada') throw { statusCode: 422, message: 'Cotação não está homologada' }

  const propostasHomologadas = cotacao.itens.flatMap(i => i.propostas)
  if (propostasHomologadas.length === 0) throw { statusCode: 422, message: 'Nenhuma proposta homologada encontrada' }

  const conviteVencedor = await prisma.conviteCotacao.findFirst({
    where: {
      idCotacao: body.idCotacao,
      propostas: { some: { homologada: true } }
    }
  })

  if (!conviteVencedor) throw { statusCode: 422, message: 'Fornecedor vencedor não identificado' }

  const valorTotal = propostasHomologadas.reduce(
    (acc, p) => acc + Number(p.subtotal), 0
  )

  const ultimo = await prisma.contrato.findFirst({
    where: { idOrganizacao: cotacao.idOrganizacao },
    orderBy: { criadoEm: 'desc' }
  })
  const seq = ultimo
    ? String(Number(ultimo.numero.split('-')[1]) + 1).padStart(5, '0')
    : '00001'
  const numero = `CTR-${seq}`

  const contrato = await prisma.contrato.create({
    data: {
      idOrganizacao: cotacao.idOrganizacao,
      idCotacao: body.idCotacao,
      numero,
      titulo: body.titulo,
      valorTotal,
      dataInicio: new Date(body.dataInicio),
      dataFim: new Date(body.dataFim),
      idFornecedor: conviteVencedor.idFornecedor,
      status: 'Minuta',
      criadoPor: body.criadoPor,
      itens: {
        create: cotacao.itens.map(ic => {
          const prop = ic.propostas[0]
          return {
            idItem: ic.idItem,
            quantidade: ic.quantidade,
            unidade: ic.unidade,
            precoUnitario: prop.precoUnitario,
            subtotal: prop.subtotal
          }
        })
      }
    },
    include: { itens: true }
  })

  return contrato
}

export async function listarContratos(idOrganizacao: string) {
  return prisma.contrato.findMany({
    where: { idOrganizacao },
    include: { fornecedor: true, fiscal: true },
    orderBy: { criadoEm: 'desc' }
  })
}

export async function buscarContrato(id: string) {
  const contrato = await prisma.contrato.findUnique({
    where: { id },
    include: {
      fornecedor: true,
      fiscal: true,
      itens: { include: { item: true } },
      entregas: true
    }
  })
  if (!contrato) throw { statusCode: 404, message: 'Contrato não encontrado' }
  return contrato
}

export async function assinarContrato(id: string) {
  const contrato = await prisma.contrato.findUnique({ where: { id } })
  if (!contrato) throw { statusCode: 404, message: 'Contrato não encontrado' }
  if (contrato.status !== 'Minuta') throw { statusCode: 422, message: 'Apenas contratos em Minuta podem ser assinados' }

  return prisma.contrato.update({
    where: { id },
    data: { status: 'Vigente', assinadoEm: new Date() }
  })
}

export async function designarFiscal(id: string, idFiscal: string) {
  const contrato = await prisma.contrato.findUnique({ where: { id } })
  if (!contrato) throw { statusCode: 404, message: 'Contrato não encontrado' }
  if (contrato.status !== 'Vigente') throw { statusCode: 422, message: 'Apenas contratos vigentes podem ter fiscal designado' }

  const fiscal = await prisma.usuario.findUnique({ where: { id: idFiscal } })
  if (!fiscal) throw { statusCode: 404, message: 'Usuário não encontrado' }

  return prisma.contrato.update({
    where: { id },
    data: { idFiscal },
    include: { fiscal: true }
  })
}

export async function criarEntrega(idContrato: string, body: {
  descricao: string
  dataEsperada: string
}) {
  const contrato = await prisma.contrato.findUnique({ where: { id: idContrato } })
  if (!contrato) throw { statusCode: 404, message: 'Contrato não encontrado' }
  if (contrato.status !== 'Vigente') throw { statusCode: 422, message: 'Apenas contratos vigentes podem ter entregas registradas' }

  const ultima = await prisma.entrega.findFirst({
    where: { idContrato },
    orderBy: { numero: 'desc' }
  })
  const numero = ultima ? ultima.numero + 1 : 1

  return prisma.entrega.create({
    data: {
      idContrato,
      numero,
      descricao: body.descricao,
      dataEsperada: new Date(body.dataEsperada),
      status: 'Pendente'
    }
  })
}

export async function confirmarEntrega(idContrato: string, entregaId: string, confirmadoPor: string) {
  const entrega = await prisma.entrega.findFirst({
    where: { id: entregaId, idContrato }
  })
  if (!entrega) throw { statusCode: 404, message: 'Entrega não encontrada' }
  if (entrega.status === 'Confirmada') throw { statusCode: 422, message: 'Entrega já confirmada' }

  return prisma.entrega.update({
    where: { id: entregaId },
    data: {
      status: 'Confirmada',
      dataEfetiva: new Date(),
      confirmadoPor
    }
  })
}