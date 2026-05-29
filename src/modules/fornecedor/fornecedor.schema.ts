import { z } from 'zod'

export const criarFornecedorSchema = z.object({
  idOrganizacao: z.string(),
  cnpj: z.string().min(14).max(18),
  razaoSocial: z.string().min(3),
  nomeFantasia: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  telefone: z.string().optional(),
  telefone2: z.string().optional(),
  situacaoCadastral: z.number().int().optional(),
  descricaoSituacao: z.string().optional(),
  dataSituacao: z.string().optional(),
  dataInicioAtividade: z.string().optional(),
  naturezaJuridica: z.string().optional(),
  porte: z.string().optional(),
  capitalSocial: z.number().optional(),
  cnaeAtividade: z.string().optional(),
  cnaeDescricao: z.string().optional(),
  logradouro: z.string().optional(),
  numeroEndereco: z.string().optional(),
  complemento: z.string().optional(),
  bairro: z.string().optional(),
  municipio: z.string().optional(),
  uf: z.string().optional(),
  cep: z.string().optional(),
})

export const atualizarFornecedorSchema = z.object({
  razaoSocial: z.string().min(3).optional(),
  nomeFantasia: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  telefone: z.string().optional(),
  telefone2: z.string().optional(),
  naturezaJuridica: z.string().optional(),
  porte: z.string().optional(),
  cnaeAtividade: z.string().optional(),
  cnaeDescricao: z.string().optional(),
  logradouro: z.string().optional(),
  numeroEndereco: z.string().optional(),
  complemento: z.string().optional(),
  bairro: z.string().optional(),
  municipio: z.string().optional(),
  uf: z.string().optional(),
  cep: z.string().optional(),
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

export type CriarFornecedorInput      = z.infer<typeof criarFornecedorSchema>
export type AtualizarFornecedorInput  = z.infer<typeof atualizarFornecedorSchema>
export type QualificarFornecedorInput = z.infer<typeof qualificarFornecedorSchema>
export type AdicionarDocumentoInput   = z.infer<typeof adicionarDocumentoSchema>
export type SuspenderFornecedorInput  = z.infer<typeof suspenderFornecedorSchema>
