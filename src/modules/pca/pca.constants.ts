// ============================================================
// CONSTANTES — Módulo PCA (Plano de Contratações Anual)
// backend/src/modules/pca/pca.constants.ts
// ============================================================

export const DFD_STATUS = {
  RASCUNHO:    1,
  ENVIADO:     2,
  CONSOLIDADO: 3,
  CANCELADO:   4,
  DEVOLVIDO:   5,
  REJEITADO:   6,
} as const

export const ITEM_PCA_STATUS = {
  EM_ELABORACAO: 1,
  EM_APROVACAO:  2,
  APROVADO:      3,
  PUBLICADO:     4,
  REJEITADO:     5,
} as const

export const PLANO_STATUS = {
  EM_ELABORACAO: 1,
  EM_APROVACAO:  2,
  APROVADO:      3,
  PUBLICADO:     4,
} as const

export const PRIORIDADE = {
  BAIXA: 1,
  MEDIA: 2,
  ALTA:  3,
} as const

// Tela 5 — Gestão de riscos (item 9.4 da norma)
export const PROBABILIDADE_RISCO = {
  BAIXA: 1,
  MEDIA: 2,
  ALTA:  3,
} as const

export const IMPACTO_RISCO = {
  BAIXO: 1,
  MEDIO: 2,
  ALTO:  3,
} as const

export const TIPOS_OBJETO = ['BEM', 'SERVICO', 'OBRA', 'TIC'] as const

// Janela oficial de envio de demandas — 01/jan a 10/fev (norma, item 7)
export function dentroJanelaEnvioDfd(data: Date = new Date()): boolean {
  const ano = data.getFullYear()
  const inicio = new Date(ano, 0, 1)       // 1º de janeiro
  const fim = new Date(ano, 1, 10, 23, 59, 59) // 10 de fevereiro
  return data >= inicio && data <= fim
}

// Antecedência mínima de 60 dias entre envio à GECOP e a data desejada (item 9.6)
export const ANTECEDENCIA_MINIMA_DIAS = 60

// Período padrão (dias) usado na sugestão de preço com base no histórico
export const PERIODO_PADRAO_SUGESTAO_PRECO_DIAS = 365

// Campos mínimos exigidos pela norma para envio da demanda (item 10.1.3.1)
export const CAMPOS_MINIMOS_ENVIO_DFD = [
  'tipoObjeto',
  'codigoSistemaCorporativo',
  'unidadeFornecimento',
  'quantidade',
  'descricaoObjeto',
  'justificativa',
  'valorEstimado',
  'prioridade',
  'dataDesejada',
] as const
