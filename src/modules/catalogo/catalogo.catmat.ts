import { lerConfiguracao } from '../configuracoes/configuracoes.service'

// ─────────────────────────────────────────────
// Tabela local CATMAT/CATSER
// ─────────────────────────────────────────────
const TABELA_CATMAT = [
  { codigo: '39269090', descricao: 'Papel', palavrasChave: ['papel', 'folha', 'sulfite', 'a4', 'a3', 'resma'] },
  { codigo: '96081000', descricao: 'Caneta esferográfica', palavrasChave: ['caneta', 'esferografica', 'esferográfica', 'bic'] },
  { codigo: '96082000', descricao: 'Caneta hidrográfica', palavrasChave: ['caneta', 'hidrografica', 'hidrográfica', 'marcador'] },
  { codigo: '84433100', descricao: 'Impressora', palavrasChave: ['impressora', 'printer', 'laser', 'jato'] },
  { codigo: '84433200', descricao: 'Impressora multifuncional', palavrasChave: ['multifuncional', 'multifunção', 'scanner', 'copiadora'] },
  { codigo: '84716000', descricao: 'Teclado e mouse', palavrasChave: ['teclado', 'mouse', 'periferico', 'periférico'] },
  { codigo: '84714100', descricao: 'Notebook', palavrasChave: ['notebook', 'laptop', 'computador portatil', 'computador portátil'] },
  { codigo: '84714900', descricao: 'Computador desktop', palavrasChave: ['computador', 'desktop', 'pc', 'workstation'] },
  { codigo: '84715000', descricao: 'Unidade de processamento', palavrasChave: ['servidor', 'server', 'processador'] },
  { codigo: '39241000', descricao: 'Copo descartável', palavrasChave: ['copo', 'descartavel', 'descartável', 'plastico', 'plástico'] },
  { codigo: '48182000', descricao: 'Lenço de papel / papel higiênico', palavrasChave: ['papel higienico', 'papel higiênico', 'lenco', 'lenço', 'toalha papel'] },
  { codigo: '85044000', descricao: 'Nobreak / estabilizador', palavrasChave: ['nobreak', 'estabilizador', 'ups', 'energia'] },
  { codigo: '94013000', descricao: 'Cadeira de escritório', palavrasChave: ['cadeira', 'assento', 'poltrona', 'escritorio', 'escritório'] },
  { codigo: '94031000', descricao: 'Mesa de escritório', palavrasChave: ['mesa', 'escrivaninha', 'bancada', 'escritorio', 'escritório'] },
  { codigo: '68101900', descricao: 'Material de construção', palavrasChave: ['construcao', 'construção', 'cimento', 'tijolo', 'argamassa'] },
  { codigo: '85272100', descricao: 'Rádio comunicador', palavrasChave: ['radio', 'rádio', 'comunicador', 'walkie', 'talkie'] },
  { codigo: '90181900', descricao: 'Material médico hospitalar', palavrasChave: ['medico', 'médico', 'hospitalar', 'clinico', 'clínico', 'seringa', 'luva'] },
  { codigo: 'S-00001', descricao: 'Serviço de limpeza', palavrasChave: ['limpeza', 'higienizacao', 'higienização', 'conservacao', 'conservação'] },
  { codigo: 'S-00002', descricao: 'Serviço de segurança', palavrasChave: ['seguranca', 'segurança', 'vigilancia', 'vigilância', 'portaria'] },
  { codigo: 'S-00003', descricao: 'Serviço de TI', palavrasChave: ['ti', 'tecnologia', 'suporte', 'informatica', 'informática', 'desenvolvimento', 'software'] },
  { codigo: 'S-00004', descricao: 'Serviço de transporte', palavrasChave: ['transporte', 'frete', 'logistica', 'logística', 'entrega', 'veiculo', 'veículo'] },
  { codigo: 'S-00005', descricao: 'Serviço de manutenção', palavrasChave: ['manutencao', 'manutenção', 'reparo', 'conserto', 'tecnico', 'técnico'] },
  { codigo: 'S-00006', descricao: 'Serviço de consultoria', palavrasChave: ['consultoria', 'consultores', 'assessoria', 'gestao', 'gestão'] },
  { codigo: 'S-00007', descricao: 'Serviço de capacitação', palavrasChave: ['capacitacao', 'capacitação', 'treinamento', 'curso', 'formacao', 'formação'] },
]

// ─────────────────────────────────────────────
// Normaliza texto para comparação
// ─────────────────────────────────────────────
function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
}

// ─────────────────────────────────────────────
// Busca sugestões por descrição
// ─────────────────────────────────────────────
export async function sugerirCatmat(
  idOrganizacao: string,
  descricao: string
): Promise<{
  habilitado: boolean
  sugestoes: Array<{ codigo: string; descricao: string; relevancia: number }>
}> {
  // Verifica se a organização habilitou o CATMAT/CATSER
  const habilitado = await lerConfiguracao(idOrganizacao, 'usaCatmatCatser')

  if (!habilitado) {
    return { habilitado: false, sugestoes: [] }
  }

  const descricaoNormalizada = normalizar(descricao)
  const palavrasDescricao = descricaoNormalizada.split(/\s+/)

  const sugestoes = TABELA_CATMAT
    .map(item => {
      // Conta quantas palavras-chave batem com a descrição
      const matches = item.palavrasChave.filter(pc =>
        palavrasDescricao.some(pd => pd.includes(normalizar(pc)) || normalizar(pc).includes(pd))
      ).length

      return {
        codigo: item.codigo,
        descricao: item.descricao,
        relevancia: matches
      }
    })
    .filter(s => s.relevancia > 0)
    .sort((a, b) => b.relevancia - a.relevancia)
    .slice(0, 5) // retorna no máximo 5 sugestões

  return { habilitado: true, sugestoes }
}