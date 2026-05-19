import { z } from 'zod'

export const criarFilialSchema = z.object({
  idOrganizacao:              z.string().min(1),
  nome:                       z.string().min(2),
  cnpj:                       z.string().min(14).max(18),
  razaoSocial:                z.string().optional(),
  nomeFantasia:               z.string().optional(),
  isMatriz:                   z.boolean().optional().default(false),
  isCentralCompras:           z.boolean().optional().default(false),
  configuracaoCentralCompras: z.record(z.string(), z.any()).optional(),
  logradouro:                 z.string().optional(),
  numero:                     z.string().optional(),
  complemento:                z.string().optional(),
  bairro:                     z.string().optional(),
  municipio:                  z.string().optional(),
  uf:                         z.string().max(2).optional(),
  cep:                        z.string().optional(),
})

export const atualizarFilialSchema = criarFilialSchema
  .omit({ idOrganizacao: true })
  .partial()

export type CriarFilialInput    = z.infer<typeof criarFilialSchema>
export type AtualizarFilialInput = z.infer<typeof atualizarFilialSchema>