// ============================================================
// SHARED — Criptografia reversível de credenciais
// backend/src/shared/crypto.ts
// Usado para senha/API key de integrações com ERPs externos
// (integracao_erp) — NUNCA para senha de usuário do dbliciti,
// que continua usando bcryptjs (hash irreversível) em usuario.senhaHash.
// ============================================================

import crypto from 'node:crypto'

const ALGORITMO = 'aes-256-gcm'

// Deriva uma chave de 32 bytes a partir do segredo de ambiente.
// Defina INTEGRACAO_ERP_SECRET em produção — o valor abaixo é só
// para desenvolvimento local, igual ao padrão já usado no JWT_SECRET.
function obterChave(): Buffer {
  const segredo = process.env.INTEGRACAO_ERP_SECRET ?? 'dbliciti-dev-secret-troque-em-producao'
  return crypto.createHash('sha256').update(segredo).digest()
}

// Formato do valor persistido: "iv_hex:tag_hex:dados_hex"
export function criptografar(textoPuro: string): string {
  const iv = crypto.randomBytes(12)
  const cifra = crypto.createCipheriv(ALGORITMO, obterChave(), iv)
  const criptografado = Buffer.concat([cifra.update(textoPuro, 'utf8'), cifra.final()])
  const tag = cifra.getAuthTag()
  return `${iv.toString('hex')}:${tag.toString('hex')}:${criptografado.toString('hex')}`
}

export function descriptografar(valorCriptografado: string): string {
  const partes = valorCriptografado.split(':')
  if (partes.length !== 3) throw new Error('Valor criptografado em formato inválido')
  const [ivHex, tagHex, dadosHex] = partes

  const decifra = crypto.createDecipheriv(ALGORITMO, obterChave(), Buffer.from(ivHex, 'hex'))
  decifra.setAuthTag(Buffer.from(tagHex, 'hex'))
  const decriptografado = Buffer.concat([
    decifra.update(Buffer.from(dadosHex, 'hex')),
    decifra.final(),
  ])
  return decriptografado.toString('utf8')
}
