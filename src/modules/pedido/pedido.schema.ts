import { z } from 'zod'

export const criarPedidoSchema = z.object({
  idOrganizacao: z.string(),
  idSolicitante: z.string(),
  idCentroCusto: z.string(),
  justificativa: z.string().min(10),
  itens: z.array(z.object({
    idItem: z.string(),
    quantidade: z.number().positive(),
    precoUnitario: z.number().positive(),
    observacao: z.string().optional(),
  })).min(1),
})

export const submeterPedidoSchema = z.object({
  idUsuario: z.string(),
})

export const decidirPedidoSchema = z.object({
  idAprovador: z.string(),
  decisao: z.enum(['Aprovado', 'AprovadoParcialmente', 'Reprovado']),
  justificativa: z.string().optional(),
})

export const encaminharPedidoSchema = z.object({
  idComprador: z.string(),
  destino: z.enum(['Cotacao', 'Licitacao']),
})

export const cancelarPedidoSchema = z.object({
  idUsuario: z.string(),
  motivo: z.string().min(5),
})

export const criarAlcadaSchema = z.object({
  idOrganizacao: z.string(),
  perfil: z.string(),
  valorMinimo: z.number().min(0),
  valorMaximo: z.number().positive().optional(),
  nivel: z.number().int().positive(),
})

export type CriarPedidoInput = z.infer<typeof criarPedidoSchema>
export type SubmeterPedidoInput = z.infer<typeof submeterPedidoSchema>
export type DecidirPedidoInput = z.infer<typeof decidirPedidoSchema>
export type EncaminharPedidoInput = z.infer<typeof encaminharPedidoSchema>
export type CancelarPedidoInput = z.infer<typeof cancelarPedidoSchema>
export type CriarAlcadaInput = z.infer<typeof criarAlcadaSchema>