import prisma from '../../shared/prisma'
import {
  CriarAlcadaInput,
  AtualizarAlcadaInput,
  CriarUsuarioAlcadaInput,
  AtualizarUsuarioAlcadaInput,
} from './alcada.schema'

// Domínio
// tipo: 1=Pedido Compra 2=Cotacao 3=Contrato 4=Licitacao
// criticidade: 1=Normal 2=Alta 3=Maxima
// status usuario: 1=Ativo 2=Bloqueado

const TIPO_LABEL: Record<number, string> = {
  1: 'Pedido Compra',
  2: 'Cotacao',
  3: 'Contrato',
  4: 'Licitacao',
}

const CRITICIDADE_LABEL: Record<number, string> = {
  1: 'Normal',
  2: 'Alta',
  3: 'Maxima',
}

// ── Listar alçadas da organização ─────────────────────────────────────────────
export async function listarAlcadas(idOrganizacao: string) {
  const alcadas = await prisma.alcadaAprovacao.findMany({
    where: { idOrganizacao },
    include: {
      usuarios: {
        include: {
          usuario: { select: { id: true, nome: true, email: true, perfil: true } },
        },
      },
    },
    orderBy: { criadoEm: 'asc' },
  })

  return alcadas.map(a => ({
    ...a,
    tipoLabel: TIPO_LABEL[a.tipo] ?? String(a.tipo),
    criticidadeLabel: CRITICIDADE_LABEL[a.criticidadePadrao] ?? String(a.criticidadePadrao),
  }))
}

// ── Buscar alçada ─────────────────────────────────────────────────────────────
export async function buscarAlcada(id: string) {
  const alcada = await prisma.alcadaAprovacao.findUnique({
    where: { id },
    include: {
      usuarios: {
        include: {
          usuario: { select: { id: true, nome: true, email: true, perfil: true } },
        },
      },
    },
  })
  if (!alcada) return null
  return {
    ...alcada,
    tipoLabel: TIPO_LABEL[alcada.tipo] ?? String(alcada.tipo),
    criticidadeLabel: CRITICIDADE_LABEL[alcada.criticidadePadrao] ?? String(alcada.criticidadePadrao),
  }
}

// ── Criar alçada ──────────────────────────────────────────────────────────────
export async function criarAlcada(data: CriarAlcadaInput) {
  // Se marcada como padrão, desmarca as demais da org
  if (data.alcada) {
    await prisma.alcadaAprovacao.updateMany({
      where: { idOrganizacao: data.idOrganizacao, alcada: true },
      data: { alcada: false },
    })
  }

  return prisma.alcadaAprovacao.create({
    data: {
      idOrganizacao:     data.idOrganizacao,
      nome:              data.nome,
      tipo:              data.tipo ?? 1,
      urgente:           data.urgente ?? false,
      criticidadePadrao: data.criticidadePadrao ?? 1,
      alcada:            data.alcada ?? false,
      dataInicio:        data.dataInicio ? new Date(data.dataInicio) : null,
      dataFim:           data.dataFim ? new Date(data.dataFim) : null,
    },
  })
}

// ── Atualizar alçada ──────────────────────────────────────────────────────────
export async function atualizarAlcada(id: string, data: AtualizarAlcadaInput) {
  const alcada = await prisma.alcadaAprovacao.findUnique({ where: { id } })
  if (!alcada) throw new Error('Alcada nao encontrada')

  // Se marcada como padrão, desmarca as demais da org
  if (data.alcada === true) {
    await prisma.alcadaAprovacao.updateMany({
      where: { idOrganizacao: alcada.idOrganizacao, alcada: true, NOT: { id } },
      data: { alcada: false },
    })
  }

  return prisma.alcadaAprovacao.update({
    where: { id },
    data: {
      ...(data.nome !== undefined ? { nome: data.nome } : {}),
      ...(data.tipo !== undefined ? { tipo: data.tipo } : {}),
      ...(data.urgente !== undefined ? { urgente: data.urgente } : {}),
      ...(data.criticidadePadrao !== undefined ? { criticidadePadrao: data.criticidadePadrao } : {}),
      ...(data.alcada !== undefined ? { alcada: data.alcada } : {}),
      ...(data.ativo !== undefined ? { ativo: data.ativo } : {}),
      ...(data.dataInicio !== undefined ? { dataInicio: data.dataInicio ? new Date(data.dataInicio) : null } : {}),
      ...(data.dataFim !== undefined ? { dataFim: data.dataFim ? new Date(data.dataFim) : null } : {}),
    },
  })
}

// ── Adicionar usuário à alçada ────────────────────────────────────────────────
export async function adicionarUsuario(idAlcada: string, data: CriarUsuarioAlcadaInput) {
  // Verifica se já existe
  const existente = await prisma.alcadaUsuario.findFirst({
    where: { idAlcada, idUsuario: data.idUsuario },
  })
  if (existente) {
    // Reativa se estava bloqueado
    return prisma.alcadaUsuario.update({
      where: { id: existente.id },
      data: { status: data.status ?? 1 },
      include: { usuario: { select: { id: true, nome: true, email: true, perfil: true } } },
    })
  }

  return prisma.alcadaUsuario.create({
    data: {
      idAlcada,
      idUsuario: data.idUsuario,
      status:    data.status ?? 1,
    },
    include: { usuario: { select: { id: true, nome: true, email: true, perfil: true } } },
  })
}

// ── Atualizar usuário da alçada ───────────────────────────────────────────────
export async function atualizarUsuario(id: string, data: AtualizarUsuarioAlcadaInput) {
  return prisma.alcadaUsuario.update({
    where: { id },
    data: { status: data.status },
    include: { usuario: { select: { id: true, nome: true, email: true, perfil: true } } },
  })
}

// ── Remover usuário da alçada ─────────────────────────────────────────────────
export async function removerUsuario(id: string) {
  return prisma.alcadaUsuario.update({
    where: { id },
    data: { status: 2 }, // 2=Bloqueado
  })
}
