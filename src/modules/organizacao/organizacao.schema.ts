import { z } from 'zod'

// modelo: 1 = Publico, 2 = Privado
export const criarOrganizacaoSchema = z.object({
  nome: z.string().min(3),
  cnpj: z.string().min(14),
  modelo: z.number().int().min(1).max(2).default(1),
})

export const atualizarOrganizacaoSchema = z.object({
  nome: z.string().min(3).optional(),
  cnpj: z.string().min(14).optional(),
  modelo: z.number().int().min(1).max(2).optional(),
})

export const statusOrganizacaoSchema = z.object({
  ativo: z.boolean(),
})

export type CriarOrganizacaoInput = z.infer<typeof criarOrganizacaoSchema>
export type AtualizarOrganizacaoInput = z.infer<typeof atualizarOrganizacaoSchema>
export type StatusOrganizacaoInput = z.infer<typeof statusOrganizacaoSchema>