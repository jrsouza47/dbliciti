// ============================================================
// CONSTANTES — Tipo do item de catálogo (M1)
// backend/src/modules/catalogo/catalogo.constants.ts
//
// Domínio expandido de 2 para 4 tipos, para alinhar com o "Tipo do
// objeto" já usado nas Demandas do PCA (Bem, Serviço, Obra, TIC).
// Os códigos inteiros 1 e 2 mantêm o mesmo significado de antes
// (nenhum dado existente precisa ser migrado) — só adicionamos 3 e 4.
//
// Aceita tanto os rótulos novos (Bem/Servico/Obra/TIC, iguais aos
// usados no PCA) quanto os antigos (Material/Servico), para não
// quebrar planilhas de importação já em uso.
// ============================================================

function normalizar(valor: string): string {
  return valor
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // remove acentos
    .trim().toUpperCase()
}

interface TipoItemInfo { int: number; prefixo: string; label: string }

const TIPO_ITEM_MAP: Record<string, TipoItemInfo> = {
  MATERIAL: { int: 1, prefixo: 'BEM', label: 'Bem' }, // rótulo antigo — mesma categoria de "Bem"
  BEM:      { int: 1, prefixo: 'BEM', label: 'Bem' },
  SERVICO:  { int: 2, prefixo: 'SRV', label: 'Serviço' }, // cobre "Servico" e "Serviço"
  OBRA:     { int: 3, prefixo: 'OBR', label: 'Obra' },
  TIC:      { int: 4, prefixo: 'TIC', label: 'Solução de TIC' },
}

export const TIPOS_ITEM_CATALOGO_VALIDOS = ['Bem', 'Servico', 'Obra', 'TIC']

export function tipoItemInfo(valorBruto: string): TipoItemInfo | null {
  const chave = normalizar(valorBruto)
  return TIPO_ITEM_MAP[chave] ?? null
}

// Converte de volta o int salvo no banco para o rótulo (uso em telas/relatórios)
export function tipoItemLabel(tipoInt: number): string {
  const encontrado = Object.values(TIPO_ITEM_MAP).find(t => t.int === tipoInt)
  return encontrado?.label ?? `Tipo ${tipoInt}`
}
