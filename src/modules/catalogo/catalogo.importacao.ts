import { read, utils } from 'xlsx'
import prisma from '../../shared/prisma'

interface LinhaImportacao {
  nome?: string
  descricaoTecnica?: string
  idCategoria?: string
  unidadeMedida?: string
  tipo?: string
  codigoCatmatCatser?: string
}

interface ResultadoLinha {
  linha: number
  status: 'sucesso' | 'erro'
  nome?: string
  motivo?: string
}

export async function processarImportacao(
  buffer: Buffer,
  idOrganizacao: string,
  criadoPor: string
): Promise<{
  totalLinhas: number
  importados: number
  erros: number
  relatorio: ResultadoLinha[]
}> {
  const workbook = read(buffer, { type: 'buffer', codepage: 65001 })
  const nomePlanilha = workbook.SheetNames[0]
  const planilha = workbook.Sheets[nomePlanilha]
  const linhas: LinhaImportacao[] = utils.sheet_to_json(planilha, { defval: '' })

  const relatorio: ResultadoLinha[] = []
  let importados = 0
  let erros = 0

  const categorias = await prisma.categoria.findMany({ select: { id: true } })
  const idsCategoriasValidos = new Set(categorias.map(c => c.id))

  for (let i = 0; i < linhas.length; i++) {
    const numeroLinha = i + 2
    const linha = linhas[i]

    if (!linha.nome || String(linha.nome).trim() === '') {
      erros++
      relatorio.push({ linha: numeroLinha, status: 'erro', motivo: 'Campo "nome" é obrigatório' })
      continue
    }

    if (!linha.idCategoria || String(linha.idCategoria).trim() === '') {
      erros++
      relatorio.push({ linha: numeroLinha, status: 'erro', nome: linha.nome, motivo: 'Campo "idCategoria" é obrigatório' })
      continue
    }

    if (!idsCategoriasValidos.has(String(linha.idCategoria).trim())) {
      erros++
      relatorio.push({ linha: numeroLinha, status: 'erro', nome: linha.nome, motivo: `Categoria "${linha.idCategoria}" não encontrada no banco` })
      continue
    }

    if (!linha.unidadeMedida || String(linha.unidadeMedida).trim() === '') {
      erros++
      relatorio.push({ linha: numeroLinha, status: 'erro', nome: linha.nome, motivo: 'Campo "unidadeMedida" é obrigatório' })
      continue
    }

    if (!linha.tipo || String(linha.tipo).trim() === '') {
      erros++
      relatorio.push({ linha: numeroLinha, status: 'erro', nome: linha.nome, motivo: 'Campo "tipo" é obrigatório' })
      continue
    }

    const tiposValidos = ['Produto', 'Serviço']
    if (!tiposValidos.includes(String(linha.tipo).trim())) {
      erros++
      relatorio.push({ linha: numeroLinha, status: 'erro', nome: linha.nome, motivo: `Tipo "${linha.tipo}" inválido. Use: Produto ou Serviço` })
      continue
    }

    try {
      const total = await prisma.itemCatalogo.count({ where: { idOrganizacao } })
      const codigoInterno = `ITEM-${String(total + 1).padStart(5, '0')}`

      await prisma.itemCatalogo.create({
        data: {
          idOrganizacao,
          criadoPor,
          codigoInterno,
          nome: String(linha.nome).trim(),
          descricaoTecnica: linha.descricaoTecnica ? String(linha.descricaoTecnica).trim() : '',
          idCategoria: String(linha.idCategoria).trim(),
          unidadeMedida: String(linha.unidadeMedida).trim(),
          tipo: String(linha.tipo).trim(),
          codigoCatmatCatser: linha.codigoCatmatCatser ? String(linha.codigoCatmatCatser).trim() : null,
          status: 'Rascunho',
        }
      })

      importados++
      relatorio.push({ linha: numeroLinha, status: 'sucesso', nome: linha.nome })
    } catch (err) {
      erros++
      relatorio.push({ linha: numeroLinha, status: 'erro', nome: linha.nome, motivo: 'Erro ao salvar no banco' })
    }
  }

  return { totalLinhas: linhas.length, importados, erros, relatorio }
}