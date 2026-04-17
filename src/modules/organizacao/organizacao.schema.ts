import { z } from 'zod'

const dadosReceitaSchema = z.object({
  razaoSocial:       z.string().optional(),
  nomeFantasia:      z.string().optional(),
  situacaoCadastral: z.string().optional(),
  naturezaJuridica:  z.string().optional(),
  dataAbertura:      z.string().optional(),
  cnaePrincipal:     z.string().optional(),
  descricaoCnae:     z.string().optional(),
  logradouro:        z.string().optional(),
  numero:            z.string().optional(),
  complemento:       z.string().optional(),
  bairro:            z.string().optional(),
  municipio:         z.string().optional(),
  uf:                z.string().optional(),
  cep:               z.string().optional(),
  telefone:          z.string().optional(),
  email:             z.string().optional(),
  porte:             z.string().optional(),
  capitalSocial:     z.number().optional(),
})

// modelo: 1 = Publico, 2 = Privado
export const criarOrganizacaoSchema = z.object({
  nome:   z.string().min(3),
  cnpj:   z.string().min(14),
  modelo: z.number().int().min(1).max(2).default(1),
}).merge(dadosReceitaSchema)

export const atualizarOrganizacaoSchema = z.object({
  nome:   z.string().min(3).optional(),
  cnpj:   z.string().min(14).optional(),
  modelo: z.number().int().min(1).max(2).optional(),
}).merge(dadosReceitaSchema)

export const statusOrganizacaoSchema = z.object({
  ativo: z.boolean(),
})

export type CriarOrganizacaoInput    = z.infer<typeof criarOrganizacaoSchema>
export type AtualizarOrganizacaoInput = z.infer<typeof atualizarOrganizacaoSchema>
export type StatusOrganizacaoInput   = z.infer<typeof statusOrganizacaoSchema>
