// ============================================================
// CONECTOR — Benner
// backend/src/modules/integracao-erp/conectores/benner.conector.ts
//
// Autenticação: OAuth2, fluxo "password" (Resource Owner Password
// Credentials), confirmado no Swagger da Terracap:
//   Token URL relativa: ../../app_services/auth.oauth2.svc/token
//   client_id: Swagger · client_secret: (vazio) · grant_type: password
//
// Dados: GET {base}/api/Produtos/ConsultarProduto (endpoint
// Produtos_GetProdutosPai), com o token no header Authorization.
//
// `urlIntegracao` (configurada na Tela 7, por empresa) é a URL BASE
// da instância Benner do cliente, ex.: https://terracap.bennercloud.com.br/CORPORATIVO
// — os dois caminhos acima são sempre relativos a ela.
// ============================================================

import { ConectorErp, ConfigConector, ItemErpBruto } from './tipos'

interface TokenRespostaBenner {
  access_token: string
  token_type?: string
  expires_in?: number
}

interface ProdutoBenner {
  Nome: string
  CodigoReferencia?: string
  UnidadeMedidaComprasSigla?: string
  UnidadeMedidaEstocagemSigla?: string
  CodigoBarras?: string
  Descricao?: string
  Codigo: number
  Ativo: boolean
  FamiliaCodigo?: string
  CnpjEmpresa?: string
  CamposAdicionais?: unknown
}

function baseUrl(urlIntegracao: string): string {
  return urlIntegracao.replace(/\/+$/, '')
}

async function autenticar(config: ConfigConector): Promise<string> {
  if (!config.usuario || !config.senha) {
    throw new Error('Usuário e senha são obrigatórios para autenticar no Benner')
  }

  const tokenUrl = `${baseUrl(config.urlIntegracao)}/app_services/auth.oauth2.svc/token`

  const corpo = new URLSearchParams({
    grant_type: 'password',
    username: config.usuario,
    password: config.senha,
    client_id: 'Swagger',
  })

  const resposta = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: corpo.toString(),
  })

  if (!resposta.ok) {
    throw new Error(`Falha ao autenticar no Benner (HTTP ${resposta.status}) — confira usuário, senha e o link de integração`)
  }

  const dados = (await resposta.json()) as TokenRespostaBenner
  if (!dados.access_token) {
    throw new Error('Benner não retornou access_token na resposta de autenticação')
  }
  return dados.access_token
}

function mapearItem(produto: ProdutoBenner): ItemErpBruto {
  const codigo = produto.CodigoReferencia?.trim() || String(produto.Codigo)
  return {
    codigo,
    nome: produto.Nome,
    descricaoTecnica: produto.Descricao?.trim() || produto.Nome,
    unidadeMedida: produto.UnidadeMedidaComprasSigla || produto.UnidadeMedidaEstocagemSigla || '',
    ativo: produto.Ativo,
    atributosExtras: {
      origem: 'BENNER',
      codigoBenner: produto.Codigo,
      codigoBarras: produto.CodigoBarras ?? null,
      familiaCodigo: produto.FamiliaCodigo ?? null,
      cnpjEmpresa: produto.CnpjEmpresa ?? null,
      camposAdicionais: produto.CamposAdicionais ?? null,
    },
  }
}

// TODO: confirmar no Swagger (aba "Parameters" do GetProdutosPai) se o
// endpoint aceita paginação (ex.: pagina/tamanhoPagina) e/ou um filtro de
// data de alteração. Sem essa confirmação, esta função busca a lista
// inteira a cada chamada — o upsert em ItemCatalogo continua correto e
// idempotente, só não é incremental (baixa tudo, não só o que mudou).
export const conectorBenner: ConectorErp = {
  async buscarItens(config: ConfigConector): Promise<ItemErpBruto[]> {
    const token = await autenticar(config)
    const dataUrl = `${baseUrl(config.urlIntegracao)}/api/Produtos/ConsultarProduto`

    const resposta = await fetch(dataUrl, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    })

    if (!resposta.ok) {
      throw new Error(`Falha ao consultar produtos no Benner (HTTP ${resposta.status})`)
    }

    const produtos = (await resposta.json()) as ProdutoBenner[]
    if (!Array.isArray(produtos)) {
      throw new Error('Resposta inesperada do Benner — esperava uma lista de produtos')
    }

    return produtos.map(mapearItem)
  },
}
