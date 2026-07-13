// ============================================================
// CONSTANTES — Integração com ERP externo
// backend/src/modules/integracao-erp/integracao-erp.constants.ts
// ============================================================

export const SISTEMAS_ERP = [
  { value: 'BENNER', label: 'Benner' },
  { value: 'SANKHYA', label: 'Sankhya' },
  { value: 'OUTRO', label: 'Outro' },
] as const

export const TIPOS_AUTENTICACAO = [
  { value: 'USUARIO_SENHA', label: 'Usuário e senha' },
  { value: 'API_KEY', label: 'Chave de API' },
  { value: 'TOKEN', label: 'Token' },
] as const

export const RESULTADO_SYNC = {
  SUCESSO: 'SUCESSO',
  ERRO: 'ERRO',
} as const
