// ============================================================
// TIPOS — Contrato comum a qualquer conector de ERP
// backend/src/modules/integracao-erp/conectores/tipos.ts
// Cada ERP novo (Sankhya, ...) implementa esta mesma interface,
// para que o resto do sistema (tabela, sync, telas) nunca mude.
// ============================================================

export interface ConfigConector {
  urlIntegracao: string
  usuario?: string
  senha?: string
  apiKey?: string
  cnpj?: string // CNPJ da organização (já cadastrado em Organizacao.cnpj) — alguns
                // ERPs (ex.: Benner) exigem esse filtro para retornar os produtos
}

// Formato já traduzido para o nosso Catálogo — cada conector é
// responsável por converter o formato bruto do seu ERP para isto.
export interface ItemErpBruto {
  codigo: string          // vira ItemCatalogo.codigoInterno
  nome: string
  descricaoTecnica: string
  unidadeMedida: string
  ativo: boolean
  atributosExtras?: Record<string, unknown> // dados brutos do ERP, guardados de reserva
}

export interface ConectorErp {
  buscarItens(config: ConfigConector): Promise<ItemErpBruto[]>
}
