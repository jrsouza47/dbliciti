import { z } from 'zod'

export const criarFornecedorSchema = z.object({
  idOrganizacao: z.string(),
  cnpj: z.string().min(14).max(18),
  razaoSocial: z.string().min(3),
  nomeFantasia: z.string().optional(),
  email: z.string().email().optional(),
  telefone: z.string().optional(),
})

export const qualificarFornecedorSchema = z.object({
  idCategoria: z.string(),
  capacidade: z.string().optional(),
  certificacoes: z.string().optional(),
})

export const adicionarDocumentoSchema = z.object({
  tipo: z.string(),
  numero: z.string().optional(),
  dataEmissao: z.string().optional(),
  dataVencimento: z.string().optional(),
  arquivo: z.string().optional(),
})

export const suspenderFornecedorSchema = z.object({
  status: z.enum(['Suspenso', 'Bloqueado', 'Ativo']),
  motivoBloqueio: z.string().min(5),
})

export type CriarFornecedorInput = z.infer<typeof criarFornecedorSchema>
export type QualificarFornecedorInput = z.infer<typeof qualificarFornecedorSchema>
export type AdicionarDocumentoInput = z.infer<typeof adicionarDocumentoSchema>
export type SuspenderFornecedorInput = z.infer<typeof suspenderFornecedorSchema>