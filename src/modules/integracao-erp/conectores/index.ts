// ============================================================
// REGISTRO — Conectores de ERP disponíveis
// backend/src/modules/integracao-erp/conectores/index.ts
// Novo cliente com outro ERP (ex.: Sankhya) = novo arquivo aqui
// implementando ConectorErp + uma linha neste mapa. Nada mais
// no sistema precisa mudar (tabela, sync, telas).
// ============================================================

import { ConectorErp } from './tipos'
import { conectorBenner } from './benner.conector'

export const CONECTORES: Record<string, ConectorErp> = {
  BENNER: conectorBenner,
}

export function obterConector(sistemaErp: string): ConectorErp {
  const conector = CONECTORES[sistemaErp]
  if (!conector) {
    throw new Error(`Sistema ERP "${sistemaErp}" ainda não possui conector implementado`)
  }
  return conector
}
