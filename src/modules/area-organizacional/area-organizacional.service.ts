// ============================================================
// SERVICE — Áreas Organizacionais
// src/modules/area-organizacional/area-organizacional.service.ts
// ============================================================

import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

// ── Tipos ──────────────────────────────────────────────────
type AreaPlana = {
  id: string; codigo: string; apelido: string; nome: string
  nivel: number; idPai: string | null; ativo: boolean
}
type AreaArvore = AreaPlana & { filhos: AreaArvore[] }

// ── 1. Listar em árvore ────────────────────────────────────
export async function listarArvore(idOrganizacao: string): Promise<AreaArvore[]> {
  const areas = await prisma.$queryRaw<AreaPlana[]>`
    SELECT id, codigo, apelido, nome, nivel, id_pai as "idPai", ativo
    FROM area_organizacional
    WHERE id_organizacao = ${idOrganizacao}
    ORDER BY codigo ASC
  `

  const mapa = new Map<string, AreaArvore>()
  areas.forEach(a => mapa.set(a.id, { ...a, filhos: [] }))

  const raizes: AreaArvore[] = []
  mapa.forEach(no => {
    if (no.idPai && mapa.has(no.idPai)) {
      mapa.get(no.idPai)!.filhos.push(no)
    } else {
      raizes.push(no)
    }
  })
  return raizes
}

// ── 2. Listar plana com filtros ────────────────────────────
export async function listarPlana(
  idOrganizacao: string,
  opts: { nivel?: number; busca?: string; apenasAtivos?: boolean }
): Promise<AreaPlana[]> {
  const { nivel, busca, apenasAtivos = true } = opts

  const where: any = { idOrganizacao }
  if (nivel) where.nivel = nivel
  if (apenasAtivos) where.ativo = true
  if (busca) {
    where.OR = [
      { nome: { contains: busca, mode: 'insensitive' } },
      { apelido: { contains: busca, mode: 'insensitive' } },
      { codigo: { contains: busca } },
    ]
  }

  return prisma.$queryRaw<AreaPlana[]>`
    SELECT id, codigo, apelido, nome, nivel, id_pai as "idPai", ativo
    FROM area_organizacional
    WHERE id_organizacao = ${idOrganizacao}
    ${nivel ? prisma.$queryRaw`AND nivel = ${nivel}` : prisma.$queryRaw``}
    ${apenasAtivos ? prisma.$queryRaw`AND ativo = true` : prisma.$queryRaw``}
    ${busca ? prisma.$queryRaw`AND (nome ILIKE ${'%' + busca + '%'} OR apelido ILIKE ${'%' + busca + '%'} OR codigo ILIKE ${'%' + busca + '%'})` : prisma.$queryRaw``}
    ORDER BY codigo ASC
  `
}

// ── 3. Buscar por apelido/sigla ────────────────────────────
export async function buscarPorApelido(idOrganizacao: string, apelido: string) {
  const result = await prisma.$queryRaw<AreaPlana[]>`
    SELECT id, codigo, apelido, nome, nivel, id_pai as "idPai", ativo
    FROM area_organizacional
    WHERE id_organizacao = ${idOrganizacao}
      AND apelido = ${apelido}
      AND ativo = true
    LIMIT 1
  `
  return result[0] ?? null
}

// ── 4. Criar área ──────────────────────────────────────────
export async function criarArea(data: {
  idOrganizacao: string; codigo: string; apelido?: string
  nome: string; idPai?: string
}) {
  // calcular nível pelo código
  const nivel = data.codigo.split('.').length

  const result = await prisma.$queryRaw<AreaPlana[]>`
    INSERT INTO area_organizacional (id_organizacao, codigo, apelido, nome, nivel, id_pai, ativo)
    VALUES (
      ${data.idOrganizacao},
      ${data.codigo},
      ${data.apelido ?? ''},
      ${data.nome},
      ${nivel},
      ${data.idPai ?? null},
      true
    )
    RETURNING id, codigo, apelido, nome, nivel, id_pai as "idPai", ativo
  `
  return result[0]
}

// ── 5. Atualizar área ──────────────────────────────────────
export async function atualizarArea(id: string, data: {
  idOrganizacao: string; apelido?: string; nome?: string
}) {
  const sets: string[] = ['atualizado_em = NOW()']
  if (data.apelido !== undefined) sets.push(`apelido = '${data.apelido.replace(/'/g, "''")}'`)
  if (data.nome !== undefined) sets.push(`nome = '${data.nome.replace(/'/g, "''")}'`)

  const result = await prisma.$queryRawUnsafe<AreaPlana[]>(`
    UPDATE area_organizacional
    SET ${sets.join(', ')}
    WHERE id = '${id}' AND id_organizacao = '${data.idOrganizacao}'
    RETURNING id, codigo, apelido, nome, nivel, id_pai as "idPai", ativo
  `)
  if (!result[0]) throw new Error('Área não encontrada')
  return result[0]
}

// ── 6. Toggle ativo/inativo ────────────────────────────────
export async function toggleAtivo(id: string, idOrganizacao: string) {
  const result = await prisma.$queryRaw<AreaPlana[]>`
    UPDATE area_organizacional
    SET ativo = NOT ativo, atualizado_em = NOW()
    WHERE id = ${id} AND id_organizacao = ${idOrganizacao}
    RETURNING id, codigo, apelido, nome, nivel, id_pai as "idPai", ativo
  `
  if (!result[0]) throw new Error('Área não encontrada')
  return result[0]
}

// ── 7. Importação em lote ──────────────────────────────────
export async function importarAreas(
  idOrganizacao: string,
  areas: { codigo: string; apelido?: string; nome: string; codigoPai?: string }[]
) {
  // Ordenar por nível para inserir pais antes dos filhos
  const ordenadas = [...areas].sort((a, b) =>
    a.codigo.split('.').length - b.codigo.split('.').length
  )

  const codigoToId = new Map<string, string>()
  let criados = 0
  let ignorados = 0

  for (const area of ordenadas) {
    const nivel = area.codigo.split('.').length
    const codigoPai = area.codigoPai ?? (
      area.codigo.includes('.') ? area.codigo.split('.').slice(0, -1).join('.') : null
    )
    const idPai = codigoPai ? codigoToId.get(codigoPai) ?? null : null

    try {
      const result = await prisma.$queryRaw<{ id: string }[]>`
        INSERT INTO area_organizacional (id_organizacao, codigo, apelido, nome, nivel, id_pai, ativo)
        VALUES (
          ${idOrganizacao},
          ${area.codigo},
          ${area.apelido ?? ''},
          ${area.nome},
          ${nivel},
          ${idPai},
          true
        )
        ON CONFLICT (id_organizacao, codigo) DO UPDATE
          SET nome = EXCLUDED.nome,
              apelido = EXCLUDED.apelido,
              atualizado_em = NOW()
        RETURNING id
      `
      if (result[0]) {
        codigoToId.set(area.codigo, result[0].id)
        criados++
      }
    } catch {
      ignorados++
    }
  }

  return { criados, ignorados, total: areas.length }
}
