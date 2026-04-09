import prisma from '../../shared/prisma'

export async function iniciarNegociacao(body: {
  idContrato: string
  iniciadorId: string
  mensagem: string
}) {
  const contrato = await prisma.contrato.findUnique({ where: { id: body.idContrato } })
  if (!contrato) throw { statusCode: 404, message: 'Contrato não encontrado' }
  if (contrato.status !== 'Vigente' as any) throw { statusCode: 422, message: 'Apenas contratos vigentes podem ter negociação' }

  return prisma.negociacao.create({
    data: {
      idContrato: body.idContrato,
      iniciadorId: body.iniciadorId,
      status: 'Aberta' as any,
      mensagens: {
        create: {
          remetente: body.iniciadorId,
          conteudo: body.mensagem
        }
      }
    },
    include: { mensagens: true }
  })
}

export async function enviarMensagem(id: string, body: {
  remetente: string
  conteudo: string
}) {
  const negociacao = await prisma.negociacao.findUnique({ where: { id } })
  if (!negociacao) throw { statusCode: 404, message: 'Negociação não encontrada' }
  if (negociacao.status !== 'Aberta' as any) throw { statusCode: 422, message: 'Negociação não está aberta' }

  return prisma.mensagemNegociacao.create({
    data: {
      idNegociacao: id,
      remetente: body.remetente,
      conteudo: body.conteudo
    }
  })
}

export async function buscarNegociacao(id: string) {
  const negociacao = await prisma.negociacao.findUnique({
    where: { id },
    include: { mensagens: { orderBy: { criadoEm: 'asc' } } }
  })
  if (!negociacao) throw { statusCode: 404, message: 'Negociação não encontrada' }
  return negociacao
}

export async function concluirNegociacao(id: string) {
  const negociacao = await prisma.negociacao.findUnique({ where: { id } })
  if (!negociacao) throw { statusCode: 404, message: 'Negociação não encontrada' }
  if (negociacao.status !== 'Aberta' as any) throw { statusCode: 422, message: 'Negociação não está aberta' }

  return prisma.negociacao.update({
    where: { id },
    data: { status: 'Concluida' as any }
  })
}