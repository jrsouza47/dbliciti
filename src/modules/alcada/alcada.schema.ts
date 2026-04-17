import { z } from 'zod'

// criticidade: 1=Normal 2=Alta 3=Maxima
// tipo: 1=Pedido Compra 2=Cotacao 3=Contrato 4=Licitacao
// status usuario: 1=Ativo 2=Bloqueado

export const criarAlcadaSchema = z.object({
  idOrganizacao:     z.string(),
  nome:              z.string().min(2),
  tipo:              z.number().int().min(1).max(4).default(1),
  urgente:           z.boolean().default(false),
  criticidadePadrao: z.number().int().min(1).max(3).default(1),
  alcada:            z.boolean().default(false),
  dataInicio:        z.string().optional(),
  dataFim:           z.string().optional(),
})

export const atualizarAlcadaSchema = z.object({
  nome:              z.string().min(2).optional(),
  tipo:              z.number().int().min(1).max(4).optional(),
  urgente:           z.boolean().optional(),
  criticidadePadrao: z.number().int().min(1).max(3).optional(),
  alcada:            z.boolean().optional(),
  dataInicio:        z.string().optional().nullable(),
  dataFim:           z.string().optional().nullable(),
  ativo:             z.boolean().optional(),
})

export const criarUsuarioAlcadaSchema = z.object({
  idUsuario: z.string(),
  status:    z.number().int().min(1).max(2).default(1),
})

export const atualizarUsuarioAlcadaSchema = z.object({
  status: z.number().int().min(1).max(2),
})

export type CriarAlcadaInput           = z.infer<typeof criarAlcadaSchema>
export type AtualizarAlcadaInput        = z.infer<typeof atualizarAlcadaSchema>
export type CriarUsuarioAlcadaInput     = z.infer<typeof criarUsuarioAlcadaSchema>
export type AtualizarUsuarioAlcadaInput = z.infer<typeof atualizarUsuarioAlcadaSchema>
