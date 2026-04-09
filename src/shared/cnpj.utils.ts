// ─────────────────────────────────────────────
// src/shared/cnpj.utils.ts
// Utilitário de CNPJ — limpar, validar, formatar
// ─────────────────────────────────────────────

/**
 * Remove tudo que não for dígito.
 * "04.252.011/0001-10" → "04252011000110"
 */
export function limparCnpj(cnpj: string): string {
  return cnpj.replace(/\D/g, '')
}

/**
 * Aplica a máscara XX.XXX.XXX/XXXX-XX.
 * "04252011000110" → "04.252.011/0001-10"
 */
export function formatarCnpj(cnpj: string): string {
  const c = limparCnpj(cnpj)
  if (c.length !== 14) return cnpj
  return `${c.slice(0,2)}.${c.slice(2,5)}.${c.slice(5,8)}/${c.slice(8,12)}-${c.slice(12,14)}`
}

/**
 * Valida o CNPJ pelos dígitos verificadores.
 * Retorna true se válido, false se inválido.
 */
export function validarCnpj(cnpj: string): boolean {
  const c = limparCnpj(cnpj)

  if (c.length !== 14) return false

  // Rejeita sequências repetidas (ex: 00000000000000, 11111111111111...)
  if (/^(\d)\1+$/.test(c)) return false

  const calcDigito = (base: string, pesos: number[]): number => {
    const soma = base
      .split('')
      .reduce((acc, d, i) => acc + Number(d) * pesos[i], 0)
    const resto = soma % 11
    return resto < 2 ? 0 : 11 - resto
  }

  const pesos1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
  const pesos2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]

  const d1 = calcDigito(c.slice(0, 12), pesos1)
  const d2 = calcDigito(c.slice(0, 13), pesos2)

  return d1 === Number(c[12]) && d2 === Number(c[13])
}

/**
 * Valida e retorna o CNPJ limpo (só dígitos).
 * Lança erro se inválido — use dentro dos handlers de rota.
 *
 * Exemplo de uso:
 *   const cnpjLimpo = parseCnpj(body.cnpj)   // lança se inválido
 *   await prisma.fornecedor.create({ data: { cnpj: cnpjLimpo, ... } })
 */
export function parseCnpj(cnpj: string): string {
  const limpo = limparCnpj(cnpj)
  if (!validarCnpj(limpo)) {
    throw new Error(`CNPJ inválido: ${cnpj}`)
  }
  return limpo
}