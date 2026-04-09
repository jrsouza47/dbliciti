import prisma from '../../shared/prisma'

// ─────────────────────────────────────────────
// Validar e formatar código pela máscara
// ─────────────────────────────────────────────
export function validarEFormatarCodigo(codigo: string, mascara: string): {
  valido: boolean
  codigoFormatado?: string
  ultimoNivel?: boolean
  erro?: string
} {
  const segmentosMascara = mascara.split('.')
  const segmentosCodigo = codigo.split('.')

  if (segmentosCodigo.length > segmentosMascara.length) {
    return {
      valido: false,
      erro: `A máscara "${mascara}" permite no máximo ${segmentosMascara.length} nível(is), mas foram informados ${segmentosCodigo.length}.`
    }
  }

  const segmentosFormatados: string[] = []

  for (let i = 0; i < segmentosCodigo.length; i++) {
    const mascaraSegmento = segmentosMascara[i]
    const codigoSegmento = segmentosCodigo[i]
    const tamanho = mascaraSegmento.length
    const ehNumerico = /^X+$/.test(mascaraSegmento)
    const ehAlfanumerico = /^A+$/.test(mascaraSegmento)

    if (!ehNumerico && !ehAlfanumerico) {
      return {
        valido: false,
        erro: `Máscara inválida no nível ${i + 1}: use apenas "X" para numérico ou "A" para alfanumérico.`
      }
    }

    if (ehNumerico) {
      if (!/^\d+$/.test(codigoSegmento)) {
        return {
          valido: false,
          erro: `Nível ${i + 1} deve ser numérico conforme a máscara "${mascara}".`
        }
      }
      if (codigoSegmento.length > tamanho) {
        return {
          valido: false,
          erro: `Nível ${i + 1} tem ${codigoSegmento.length} dígito(s), mas a máscara permite no máximo ${tamanho}.`
        }
      }
      segmentosFormatados.push(codigoSegmento.padStart(tamanho, '0'))
    }

    if (ehAlfanumerico) {
      if (codigoSegmento.length !== tamanho) {
        return {
          valido: false,
          erro: `Nível ${i + 1} deve ter exatamente ${tamanho} caractere(s) conforme a máscara "${mascara}". Informado: "${codigoSegmento}" (${codigoSegmento.length} caractere(s)).`
        }
      }
      segmentosFormatados.push(codigoSegmento.toUpperCase())
    }
  }

  const ultimoNivel = segmentosCodigo.length === segmentosMascara.length

  return {
    valido: true,
    codigoFormatado: segmentosFormatados.join('.'),
    ultimoNivel
  }
}

// ─────────────────────────────────────────────
// Criar estrutura de hierarquia
// ─────────────────────────────────────────────
export async function criarEstrutura(data: {
  idOrganizacao: string
  criadoPor: string
  tabela: string
  nome: string
  mascara: string
  dataInicio: string
  dataFim?: string
}) {
  return prisma.estruturaHierarquia.create({
    data: {
      idOrganizacao: data.idOrganizacao,
      criadoPor: data.criadoPor,
      tabela: data.tabela,
      nome: data.nome,
      mascara: data.mascara,
      dataInicio: new Date(data.dataInicio),
      dataFim: data.dataFim ? new Date(data.dataFim) : null,
      status: 'Inativa' as any,
    }
  })
}

// ─────────────────────────────────────────────
// Ativar estrutura
// ─────────────────────────────────────────────
export async function ativarEstrutura(idEstrutura: string, idOrganizacao: string) {
  const estrutura = await prisma.estruturaHierarquia.findUnique({
    where: { id: idEstrutura }
  })

  if (!estrutura) throw new Error('Estrutura não encontrada')
  if (estrutura.idOrganizacao !== idOrganizacao) throw new Error('Estrutura não pertence a esta organização')

  await prisma.estruturaHierarquia.updateMany({
    where: { idOrganizacao, tabela: estrutura.tabela, status: 'Ativa' as any },
    data: { status: 'Inativa' as any }
  })

  await prisma.$executeRaw`
    UPDATE item_categoria ic
    SET ativo = false
    FROM categoria c
    WHERE ic.id_categoria = c.id
    AND c.id_organizacao = ${idOrganizacao}
    AND ic.ativo = true
  `

  return prisma.estruturaHierarquia.update({
    where: { id: idEstrutura },
    data: { status: 'Ativa' as any }
  })
}

// ─────────────────────────────────────────────
// Listar estruturas por organização e tabela
// ─────────────────────────────────────────────
export async function listarEstruturas(idOrganizacao: string, tabela?: string) {
  return prisma.estruturaHierarquia.findMany({
    where: {
      idOrganizacao,
      ...(tabela ? { tabela } : {})
    },
    orderBy: [{ tabela: 'asc' }, { dataInicio: 'desc' }]
  })
}

// ─────────────────────────────────────────────
// Criar categoria vinculada a uma estrutura
// ─────────────────────────────────────────────
export async function criarCategoria(data: {
  idOrganizacao: string
  idEstrutura: string
  nome: string
  codigo?: string
  idPai?: string
  ultimoNivel?: boolean
}) {
  let nivel = 1
  if (data.idPai) {
    const pai = await prisma.categoria.findUnique({
      where: { id: data.idPai },
      select: { nivel: true }
    })
    if (!pai) throw new Error('Categoria pai não encontrada')
    nivel = pai.nivel + 1
  }

  let codigoFormatado: string | null = null
  let ultimoNivel = data.ultimoNivel ?? false

  if (data.codigo) {
    const estrutura = await prisma.estruturaHierarquia.findUnique({
      where: { id: data.idEstrutura },
      select: { mascara: true }
    })
    if (!estrutura) throw new Error('Estrutura não encontrada')

    const validacao = validarEFormatarCodigo(data.codigo, estrutura.mascara)
    if (!validacao.valido) throw new Error(validacao.erro)
    codigoFormatado = validacao.codigoFormatado!
    if (validacao.ultimoNivel) ultimoNivel = true
  }

  return prisma.categoria.create({
    data: {
      idOrganizacao: data.idOrganizacao,
      idEstrutura: data.idEstrutura,
      nome: data.nome,
      codigo: codigoFormatado,
      idPai: data.idPai ?? null,
      nivel,
      ultimoNivel,
      ativo: true,
    }
  })
}

// ─────────────────────────────────────────────
// Buscar árvore de categorias de uma estrutura
// ─────────────────────────────────────────────
export async function buscarArvoreCategoria(idEstrutura: string) {
  const categorias = await prisma.categoria.findMany({
    where: { idEstrutura, ativo: true },
    orderBy: [{ nivel: 'asc' }, { codigo: 'asc' }, { nome: 'asc' }],
    select: {
      id: true,
      nome: true,
      codigo: true,
      nivel: true,
      idPai: true,
      ativo: true,
      ultimoNivel: true,
    }
  })

  type No = {
    id: string
    nome: string
    codigo: string | null
    nivel: number
    idPai: string | null
    ativo: boolean
    ultimoNivel: boolean
    filhos: No[]
  }

  const mapa = new Map<string, No>()
  categorias.forEach(c => mapa.set(c.id, { ...c, filhos: [] }))

  const raizes: No[] = []
  mapa.forEach(no => {
    if (no.idPai && mapa.has(no.idPai)) {
      mapa.get(no.idPai)!.filhos.push(no)
    } else {
      raizes.push(no)
    }
  })

  return raizes
}

// ─────────────────────────────────────────────
// Vincular item a categoria
// ─────────────────────────────────────────────
export async function vincularItemCategoria(idItem: string, idCategoria: string) {
  const vinculoAtivo = await prisma.itemCategoria.findFirst({
    where: { idItem, ativo: true }
  })

  if (vinculoAtivo) throw new Error(
    'Item já possui categoria ativa. Desative o vínculo atual antes de associar uma nova categoria.'
  )

  return prisma.itemCategoria.create({
    data: { idItem, idCategoria, ativo: true }
  })
}

// ─────────────────────────────────────────────
// Listar itens sem categoria ativa
// ─────────────────────────────────────────────
export async function listarItensSemCategoria(idOrganizacao: string) {
  const itensComCategoria = await prisma.itemCategoria.findMany({
    where: { ativo: true },
    select: { idItem: true }
  })

  const idsComCategoria = itensComCategoria.map(i => i.idItem)

  return prisma.itemCatalogo.findMany({
    where: {
      idOrganizacao,
      status: { not: 'Inativo' as any },
      id: { notIn: idsComCategoria }
    },
    select: {
      id: true,
      codigoInterno: true,
      nome: true,
      tipo: true,
      status: true,
    },
    orderBy: { nome: 'asc' }
  })
}