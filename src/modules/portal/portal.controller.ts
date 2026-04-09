import { FastifyRequest, FastifyReply } from 'fastify'
import prisma from '../../shared/prisma'
import { parseCnpj, formatarCnpj } from '../../shared/cnpj.utils'

// POST /portal/fornecedores — F1: Auto-cadastro
export async function autoCadastroFornecedor(req: FastifyRequest, reply: FastifyReply) {
  const { idOrganizacao, cnpj, razaoSocial, nomeFantasia, email, telefone } = req.body as any

  const cnpjLimpo = parseCnpj(cnpj)

  const existente = await prisma.fornecedor.findUnique({
    where: { idOrganizacao_cnpj: { idOrganizacao, cnpj: cnpjLimpo } },
  })
  if (existente) {
    return reply.status(409).send({ erro: 'Fornecedor já cadastrado com este CNPJ.' })
  }

  const fornecedor = await prisma.fornecedor.create({
    data: { idOrganizacao, cnpj: cnpjLimpo, razaoSocial, nomeFantasia, email, telefone, status: 'Ativo' as any },
  })

  return reply.status(201).send({ ...fornecedor, cnpj: formatarCnpj(fornecedor.cnpj) })
}

// GET /portal/cotacoes/:token — F3: Visualizar convite
export async function visualizarConvite(req: FastifyRequest, reply: FastifyReply) {
  const { token } = req.params as any

  const convite = await prisma.conviteCotacao.findUnique({
    where: { token },
    include: {
      fornecedor: true,
      cotacao: { include: { itens: { include: { item: true } } } },
    },
  })

  if (!convite) return reply.status(404).send({ erro: 'Convite não encontrado.' })
  if (convite.cotacao.status !== 'Aberta' as any) {
    return reply.status(400).send({ erro: 'Esta cotação não está mais aberta para propostas.' })
  }

  return reply.send({
    convite: { id: convite.id, status: convite.status, prazoRespostas: convite.cotacao.prazoRespostas },
    cotacao: { numero: convite.cotacao.numero, titulo: convite.cotacao.titulo, modalidade: convite.cotacao.modalidade },
    itens: convite.cotacao.itens.map((ic) => ({
      idItemCotacao: ic.id,
      nome: ic.item.nome,
      descricao: ic.item.descricaoTecnica,
      quantidade: ic.quantidade,
      unidade: ic.unidade,
    })),
    fornecedor: { razaoSocial: convite.fornecedor.razaoSocial },
  })
}

// POST /portal/cotacoes/:token/proposta — F3: Enviar proposta
export async function enviarProposta(req: FastifyRequest, reply: FastifyReply) {
  const { token } = req.params as any
  const { itens, comprovante } = req.body as any

  const convite = await prisma.conviteCotacao.findUnique({
    where: { token },
    include: { cotacao: { include: { itens: true } } },
  })

  if (!convite) return reply.status(404).send({ erro: 'Convite não encontrado.' })
  if (convite.cotacao.status !== 'Aberta' as any) {
    return reply.status(400).send({ erro: 'Esta cotação não está mais aberta para propostas.' })
  }
  if (convite.status === 'Respondido' as any) {
    return reply.status(400).send({ erro: 'Você já enviou uma proposta para esta cotação.' })
  }
  if (new Date() > new Date(convite.cotacao.prazoRespostas)) {
    return reply.status(400).send({ erro: 'O prazo para envio de propostas encerrou.' })
  }

  const propostas = await Promise.all(
    itens.map(async (itemProposta: { idItemCotacao: string; precoUnitario: number }) => {
      const itemCotacao = convite.cotacao.itens.find((ic) => ic.id === itemProposta.idItemCotacao)
      if (!itemCotacao) throw new Error(`Item ${itemProposta.idItemCotacao} não pertence a esta cotação.`)
      const subtotal = Number(itemProposta.precoUnitario) * Number(itemCotacao.quantidade)
      return prisma.proposta.create({
        data: { idConvite: convite.id, idItemCotacao: itemProposta.idItemCotacao, precoUnitario: itemProposta.precoUnitario, subtotal, comprovante: comprovante ?? null },
      })
    })
  )

  await prisma.conviteCotacao.update({
    where: { token },
    data: { status: 'Respondido' as any, respondidoEm: new Date() },
  })

  return reply.status(201).send({ mensagem: 'Proposta enviada com sucesso.', propostas })
}

// GET /portal/contratos/:token — F5a: Fornecedor visualiza contrato
export async function visualizarContratoPortal(req: FastifyRequest, reply: FastifyReply) {
  const { token } = req.params as any

  const convite = await prisma.conviteCotacao.findUnique({
    where: { token },
    include: { fornecedor: true, cotacao: true },
  })

  if (!convite) return reply.status(404).send({ erro: 'Token inválido.' })

  const contrato = await prisma.contrato.findFirst({
    where: { idCotacao: convite.idCotacao, idFornecedor: convite.idFornecedor },
    include: { itens: { include: { item: true } }, entregas: true },
  })

  if (!contrato) return reply.status(404).send({ erro: 'Contrato não encontrado para este token.' })

  return reply.send({
    contrato: {
      numero: contrato.numero,
      titulo: contrato.titulo,
      valorTotal: contrato.valorTotal,
      dataInicio: contrato.dataInicio,
      dataFim: contrato.dataFim,
      status: contrato.status,
    },
    itens: contrato.itens.map((i) => ({
      nome: i.item.nome,
      quantidade: i.quantidade,
      unidade: i.unidade,
      precoUnitario: i.precoUnitario,
      subtotal: i.subtotal,
    })),
    entregas: contrato.entregas,
    fornecedor: { razaoSocial: convite.fornecedor.razaoSocial },
  })
}

// PATCH /portal/contratos/:token/aceitar — F5b: Fornecedor aceita contrato
export async function aceitarContratoPortal(req: FastifyRequest, reply: FastifyReply) {
  const { token } = req.params as any

  const convite = await prisma.conviteCotacao.findUnique({ where: { token } })
  if (!convite) return reply.status(404).send({ erro: 'Token inválido.' })

  const contrato = await prisma.contrato.findFirst({
    where: { idCotacao: convite.idCotacao, idFornecedor: convite.idFornecedor },
  })

  if (!contrato) return reply.status(404).send({ erro: 'Contrato não encontrado.' })
  if (contrato.status !== 'Vigente' as any) return reply.status(422).send({ erro: 'Contrato não está vigente.' })

  return reply.send({ mensagem: 'Contrato aceito com sucesso.', contrato: { numero: contrato.numero, status: contrato.status } })
}

// POST /portal/contratos/:token/entregas — F5c: Fornecedor registra entrega
export async function registrarEntregaPortal(req: FastifyRequest, reply: FastifyReply) {
  const { token } = req.params as any
  const { descricao, dataEfetiva, observacao } = req.body as any

  const convite = await prisma.conviteCotacao.findUnique({ where: { token } })
  if (!convite) return reply.status(404).send({ erro: 'Token inválido.' })

  const contrato = await prisma.contrato.findFirst({
    where: { idCotacao: convite.idCotacao, idFornecedor: convite.idFornecedor },
    include: { entregas: true },
  })

  if (!contrato) return reply.status(404).send({ erro: 'Contrato não encontrado.' })
  if (contrato.status !== 'Vigente' as any) return reply.status(422).send({ erro: 'Contrato não está vigente.' })

  const entregaPendente = contrato.entregas.find((e) => e.status === 'Pendente' as any)
  if (!entregaPendente) return reply.status(422).send({ erro: 'Não há entregas pendentes neste contrato.' })

  const entrega = await prisma.entrega.update({
    where: { id: entregaPendente.id },
    data: {
      status: 'Pendente' as any,
      dataEfetiva: dataEfetiva ? new Date(dataEfetiva) : new Date(),
      observacao: observacao ?? null,
    },
  })

  return reply.status(201).send({ mensagem: 'Entrega registrada. Aguardando confirmação do fiscal.', entrega })
}