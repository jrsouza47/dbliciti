import { z } from 'zod'

export const criarPedidoSchema = z.object({
  idOrganizacao: z.string(),
  idSolicitante: z.string(),
  idCentroCusto: z.string().optional(), // Obrigatoriedade controlada pelo frontend via configuração da organização
  // Vínculo obrigatório com o PCA (item 9.6 da especificação) — todo pedido
  // precisa constar do PCA vigente. Sem isso, a criação é bloqueada.
  idItemPca: z.string({ required_error: 'Selecione o item do PCA vinculado a este pedido' }),
  justificativaForaJanela: z.string().min(10).optional(), // exigida se dataDesejada do item < 60 dias
  justificativa: z.string().min(10),
  itens: z.array(z.object({
    idItem: z.string(),
    quantidade: z.number().positive(),
    precoUnitario: z.number().positive(),
    observacao: z.string().optional(),
  })).min(1),
})

export const cadastrarPedidoSchema = z.object({
  idUsuario: z.string(),
})

export const submeterPedidoSchema = z.object({
  idUsuario: z.string(),
})

export const decidirPedidoSchema = z.object({
  idAprovador: z.string(),
  decisao: z.enum(['Aprovado', 'Reprovado']),
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

export const atualizarPedidoSchema = z.object({
  idCentroCusto: z.string().optional(),
  idAlcada:      z.string().optional(),
  criticidade:   z.number().optional(),
  tipoPedido:    z.number().optional(),
  observacao:    z.string().optional(),
  justificativa: z.string().min(10).optional(),
  idItemPca:               z.string().optional(),
  justificativaForaJanela: z.string().min(10).optional(),
  itens: z.array(z.object({
    idItem: z.string(),
    quantidade: z.number().positive(),
    precoUnitario: z.number().positive(),
    observacao: z.string().optional(),
  })).min(1).optional(),
})

export type AtualizarPedidoInput  = z.infer<typeof atualizarPedidoSchema>
export type CriarPedidoInput      = z.infer<typeof criarPedidoSchema>
export type CadastrarPedidoInput  = z.infer<typeof cadastrarPedidoSchema>
export type SubmeterPedidoInput   = z.infer<typeof submeterPedidoSchema>
export type DecidirPedidoInput    = z.infer<typeof decidirPedidoSchema>
export type EncaminharPedidoInput = z.infer<typeof encaminharPedidoSchema>
export type CancelarPedidoInput   = z.infer<typeof cancelarPedidoSchema>
