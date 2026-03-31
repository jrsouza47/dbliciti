import prisma from '../../shared/prisma'

// ─────────────────────────────────────────────
// Dicionário de configurações disponíveis
// ─────────────────────────────────────────────
export const DICIONARIO_CONFIGURACOES = [
  {
    chave: 'alertaDuplicatasItens',
    rotulo: 'Alertar duplicidade de itens no catálogo?',
    descricao: 'Avisa quando um novo item cadastrado tem nome similar a um já existente no catálogo.',
    tipo: 'boolean',
    padrao: true,
  },
  {
    chave: 'usaCatmatCatser',
    rotulo: 'Sugerir código CATMAT/CATSER ao cadastrar itens?',
    descricao: 'Exibe sugestões de código padronizado com base na descrição do item. Recomendado apenas para organizações que exigem conformidade com tabelas CATMAT/CATSER.',
    tipo: 'boolean',
    padrao: false,
  },
]

// ─────────────────────────────────────────────
// Busca configurações da organização
// ─────────────────────────────────────────────
export async function buscarConfiguracoes(idOrganizacao: string) {
  const org = await prisma.organizacao.findUnique({
    where: { id: idOrganizacao },
    select: { configuracoes: true }
  })

  if (!org) throw new Error('Organização não encontrada')

  const valoresSalvos = (org.configuracoes as Record<string, unknown>) ?? {}

  // Mescla dicionário com valores salvos — usa padrão se não configurado
  const configuracoes = DICIONARIO_CONFIGURACOES.map(item => ({
    chave: item.chave,
    rotulo: item.rotulo,
    descricao: item.descricao,
    tipo: item.tipo,
    valor: valoresSalvos[item.chave] !== undefined
      ? valoresSalvos[item.chave]
      : item.padrao,
  }))

  return { idOrganizacao, configuracoes }
}

// ─────────────────────────────────────────────
// Salva configurações da organização
// ─────────────────────────────────────────────
export async function salvarConfiguracoes(
  idOrganizacao: string,
  novasConfiguracoes: Record<string, unknown>
) {
  // Valida que só aceita chaves conhecidas do dicionário
  const chavesValidas = new Set(DICIONARIO_CONFIGURACOES.map(c => c.chave))
  const chavesInvalidas = Object.keys(novasConfiguracoes).filter(c => !chavesValidas.has(c))

  if (chavesInvalidas.length > 0) {
    throw new Error(`Configurações desconhecidas: ${chavesInvalidas.join(', ')}`)
  }

  // Busca configurações atuais e mescla com as novas
  const org = await prisma.organizacao.findUnique({
    where: { id: idOrganizacao },
    select: { configuracoes: true }
  })

  if (!org) throw new Error('Organização não encontrada')

  const valoresAtuais = (org.configuracoes as Record<string, unknown>) ?? {}
  const valoresMesclados = { ...valoresAtuais, ...novasConfiguracoes }

await prisma.organizacao.update({
    where: { id: idOrganizacao },
    data: { configuracoes: valoresMesclados as any }
  })

  return buscarConfiguracoes(idOrganizacao)
}

// ─────────────────────────────────────────────
// Helper — lê valor de uma configuração específica
// ─────────────────────────────────────────────
export async function lerConfiguracao(
  idOrganizacao: string,
  chave: string
): Promise<unknown> {
  const org = await prisma.organizacao.findUnique({
    where: { id: idOrganizacao },
    select: { configuracoes: true }
  })

  const valoresSalvos = (org?.configuracoes as Record<string, unknown>) ?? {}
  const item = DICIONARIO_CONFIGURACOES.find(c => c.chave === chave)

  if (!item) return undefined

  return valoresSalvos[chave] !== undefined ? valoresSalvos[chave] : item.padrao
}