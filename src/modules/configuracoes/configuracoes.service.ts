import prisma from '../../shared/prisma'

// ─────────────────────────────────────────────
// Dicionário de configurações disponíveis
// ─────────────────────────────────────────────
export const DICIONARIO_CONFIGURACOES = [
  // ── Financeiro ──────────────────────────────
  {
    chave: 'usaCentroCusto',
    rotulo: 'Usar Centro de Custo?',
    descricao: 'Habilita o uso de centros de custo nos pedidos de compra da organizacao.',
    tipo: 'boolean',
    padrao: false,
    grupo: 'Financeiro',
  },

  // ── Catálogo ────────────────────────────────
  {
    chave: 'alertaDuplicatasItens',
    rotulo: 'Alertar duplicidade de itens no catalogo?',
    descricao: 'Avisa quando um novo item cadastrado tem nome similar a um ja existente no catalogo.',
    tipo: 'boolean',
    padrao: true,
    grupo: 'Catalogo',
  },
  {
    chave: 'usaCatmatCatser',
    rotulo: 'Sugerir codigo CATMAT/CATSER ao cadastrar itens?',
    descricao: 'Exibe sugestoes de codigo padronizado com base na descricao do item. Recomendado apenas para organizacoes que exigem conformidade com tabelas CATMAT/CATSER.',
    tipo: 'boolean',
    padrao: false,
    grupo: 'Catalogo',
  },

  // ── Numeração de Pedidos ────────────────────
  {
    chave: 'pedidoPrefixo',
    rotulo: 'Prefixo do número do pedido',
    descricao: 'Texto que aparece antes do número do pedido. Exemplo: PD, PC, REQ, COMP.',
    tipo: 'string',
    padrao: 'PD',
    grupo: 'Pedidos',
  },
  {
    chave: 'pedidoUsaAno',
    rotulo: 'Incluir ano no número do pedido?',
    descricao: 'Quando ativado, o ano corrente é inserido entre o prefixo e o sequencial. Exemplo: PD-2026-000001.',
    tipo: 'boolean',
    padrao: true,
    grupo: 'Pedidos',
  },
  {
    chave: 'pedidoDigitosSequencial',
    rotulo: 'Quantidade de dígitos do sequencial',
    descricao: 'Define o tamanho do número sequencial com zeros à esquerda. Exemplo: 6 dígitos = 000001.',
    tipo: 'number',
    padrao: 6,
    grupo: 'Pedidos',
  },
  {
    chave: 'pedidoSequencialReiniciaAno',
    rotulo: 'Reiniciar sequencial a cada ano?',
    descricao: 'Quando ativado, a contagem reinicia em 000001 todo ano. Quando desativado, o sequencial é contínuo.',
    tipo: 'boolean',
    padrao: true,
    grupo: 'Pedidos',
  },

  // ── Aparência ───────────────────────────────
  {
    chave: 'labelFontSize',
    rotulo: 'Tamanho da fonte dos labels',
    descricao: 'Tamanho em px dos labels dos campos. Mínimo: 11, Máximo: 14.',
    tipo: 'number',
    padrao: 12,
    grupo: 'Aparencia',
  },
  {
    chave: 'labelColor',
    rotulo: 'Cor dos labels',
    descricao: 'Cor do texto dos labels dos campos.',
    tipo: 'string',
    padrao: '#111827',
    grupo: 'Aparencia',
  },
  {
    chave: 'apoioFontSize',
    rotulo: 'Tamanho da fonte dos textos de apoio',
    descricao: 'Tamanho em px dos textos de apoio e descrições. Mínimo: 10, Máximo: 13.',
    tipo: 'number',
    padrao: 12,
    grupo: 'Aparencia',
  },
  {
    chave: 'apoioColor',
    rotulo: 'Cor dos textos de apoio',
    descricao: 'Cor dos textos de apoio e descrições.',
    tipo: 'string',
    padrao: '#6B7280',
    grupo: 'Aparencia',
  },
  {
    chave: 'campoFontSize',
    rotulo: 'Tamanho da fonte dos campos',
    descricao: 'Tamanho em px do texto dentro dos campos de entrada. Mínimo: 12, Máximo: 16.',
    tipo: 'number',
    padrao: 13,
    grupo: 'Aparencia',
  },
  {
    chave: 'campoColor',
    rotulo: 'Cor do texto dos campos',
    descricao: 'Cor do texto digitado nos campos de entrada.',
    tipo: 'string',
    padrao: '#111827',
    grupo: 'Aparencia',
  },
  {
    chave: 'campoBgColor',
    rotulo: 'Cor de fundo dos campos',
    descricao: 'Cor de fundo dos campos de entrada. Use apenas cores claras.',
    tipo: 'string',
    padrao: '#F9FAFB',
    grupo: 'Aparencia',
  },
]

// ─────────────────────────────────────────────
// Configurações padrão para nova organização
// Chame esta função ao criar uma nova organização
// ─────────────────────────────────────────────
export function gerarConfiguracoesPadrao(): Record<string, unknown> {
  return Object.fromEntries(
    DICIONARIO_CONFIGURACOES.map(c => [c.chave, c.padrao])
  )
}

// ─────────────────────────────────────────────
// Busca configurações da organização
// ─────────────────────────────────────────────
export async function buscarConfiguracoes(idOrganizacao: string) {
  const org = await prisma.organizacao.findUnique({
    where: { id: idOrganizacao },
    select: { configuracoes: true }
  })

  if (!org) throw new Error('Organizacao nao encontrada')

  const valoresSalvos = (org.configuracoes as Record<string, unknown>) ?? {}

  const configuracoes = DICIONARIO_CONFIGURACOES.map(item => ({
    chave: item.chave,
    rotulo: item.rotulo,
    descricao: item.descricao,
    tipo: item.tipo,
    grupo: item.grupo,
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
  const chavesValidas = new Set(DICIONARIO_CONFIGURACOES.map(c => c.chave))
  const chavesInvalidas = Object.keys(novasConfiguracoes).filter(c => !chavesValidas.has(c))

  if (chavesInvalidas.length > 0) {
    throw new Error(`Configuracoes desconhecidas: ${chavesInvalidas.join(', ')}`)
  }

  const org = await prisma.organizacao.findUnique({
    where: { id: idOrganizacao },
    select: { configuracoes: true }
  })

  if (!org) throw new Error('Organizacao nao encontrada')

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
