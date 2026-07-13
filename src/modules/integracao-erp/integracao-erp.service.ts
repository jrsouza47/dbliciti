// ============================================================
// SERVICE — Integração com ERP externo
// backend/src/modules/integracao-erp/integracao-erp.service.ts
// ============================================================

import prisma from '../../shared/prisma'
import { criptografar, descriptografar } from '../../shared/crypto'
import { obterConector } from './conectores'
import { SISTEMAS_ERP, TIPOS_AUTENTICACAO, RESULTADO_SYNC } from './integracao-erp.constants'

interface SalvarIntegracaoInput {
  sistemaErp: string
  tipoAutenticacao: string
  urlIntegracao: string
  usuario?: string
  senha?: string   // texto puro vindo do formulário — nunca persistido assim
  apiKey?: string  // idem
  ativo?: boolean
}

function validarEntrada(input: SalvarIntegracaoInput) {
  if (!SISTEMAS_ERP.some(s => s.value === input.sistemaErp)) {
    throw new Error('Sistema ERP inválido')
  }
  if (!TIPOS_AUTENTICACAO.some(t => t.value === input.tipoAutenticacao)) {
    throw new Error('Tipo de autenticação inválido')
  }
  if (!input.urlIntegracao?.trim()) {
    throw new Error('Link de integração é obrigatório')
  }
}

// Nunca devolve a senha/chave — só sinaliza se já está configurada
function paraApresentacao(registro: any) {
  const { senhaCriptografada, apiKeyCriptografada, ...resto } = registro
  return {
    ...resto,
    senhaConfigurada: !!senhaCriptografada,
    apiKeyConfigurada: !!apiKeyCriptografada,
  }
}

export async function buscarIntegracaoErp(idOrganizacao: string) {
  const registro = await prisma.integracaoErp.findUnique({ where: { idOrganizacao } })
  if (!registro) return null
  return paraApresentacao(registro)
}

export async function salvarIntegracaoErp(idOrganizacao: string, input: SalvarIntegracaoInput) {
  validarEntrada(input)

  const org = await prisma.organizacao.findUnique({ where: { id: idOrganizacao } })
  if (!org) throw new Error('Organização não encontrada')

  const existente = await prisma.integracaoErp.findUnique({ where: { idOrganizacao } })

  const dados = {
    sistemaErp: input.sistemaErp,
    tipoAutenticacao: input.tipoAutenticacao,
    urlIntegracao: input.urlIntegracao.trim(),
    usuario: input.usuario?.trim() || null,
    ativo: input.ativo ?? true,
    // Só recriptografa se algo novo foi digitado — campo vazio mantém o valor anterior
    ...(input.senha ? { senhaCriptografada: criptografar(input.senha) } : {}),
    ...(input.apiKey ? { apiKeyCriptografada: criptografar(input.apiKey) } : {}),
  }

  const registro = existente
    ? await prisma.integracaoErp.update({ where: { idOrganizacao }, data: dados })
    : await prisma.integracaoErp.create({ data: { idOrganizacao, ...dados } })

  return paraApresentacao(registro)
}

// ── Usuário "sistema" que assina os itens criados automaticamente ─────────
// ItemCatalogo.criadoPor é obrigatório e aponta para um Usuario real — não
// existe hoje um usuário de robô/sistema dedicado. Solução pragmática sem
// alterar o schema existente: usa o Administrador ativo mais antigo da
// organização. Se isso não servir, o ajuste correto é criar um Usuario
// com perfil de sistema por organização — decisão a confirmar depois.
async function obterUsuarioSistema(idOrganizacao: string): Promise<string> {
  const admin = await prisma.usuario.findFirst({
    where: { idOrganizacao, perfil: { in: ['Administrador', 'Admin'] }, ativo: true },
    orderBy: { criadoEm: 'asc' },
  })
  if (!admin) {
    throw new Error('Nenhum usuário Administrador ativo encontrado nesta organização — necessário para atribuir os itens sincronizados automaticamente')
  }
  return admin.id
}

// ── Sincronização (disparada manualmente pela Tela 7 ou pela rotina diária) ─
export async function sincronizarItensErp(idOrganizacao: string) {
  const registro = await prisma.integracaoErp.findUnique({ where: { idOrganizacao } })
  if (!registro) throw new Error('Integração com ERP não configurada para esta organização')
  if (!registro.ativo) throw new Error('Integração com ERP está desativada')

  try {
    const conector = obterConector(registro.sistemaErp)
    const senha = registro.senhaCriptografada ? descriptografar(registro.senhaCriptografada) : undefined
    const apiKey = registro.apiKeyCriptografada ? descriptografar(registro.apiKeyCriptografada) : undefined

    // Alguns ERPs (ex.: Benner) exigem o CNPJ da empresa para filtrar os
    // produtos — usamos o mesmo CNPJ já cadastrado em Configurações > Organização,
    // sem precisar de um campo novo na Tela 7.
    const org = await prisma.organizacao.findUnique({ where: { id: idOrganizacao } })
    if (!org) throw new Error('Organização não encontrada')

    const itens = await conector.buscarItens({
      urlIntegracao: registro.urlIntegracao,
      usuario: registro.usuario ?? undefined,
      senha,
      apiKey,
      cnpj: org.cnpj,
    })

    const idUsuarioSistema = await obterUsuarioSistema(idOrganizacao)

    let criados = 0
    let atualizados = 0

    for (const item of itens) {
      const existenteItem = await prisma.itemCatalogo.findUnique({
        where: { idOrganizacao_codigoInterno: { idOrganizacao, codigoInterno: item.codigo } },
      })

      if (existenteItem) {
        await prisma.itemCatalogo.update({
          where: { id: existenteItem.id },
          data: {
            nome: item.nome,
            descricaoTecnica: item.descricaoTecnica,
            unidadeMedida: item.unidadeMedida,
            status: item.ativo ? 2 : 4, // 2=Ativo 4=Inativo
            atributosExtras: item.atributosExtras as any,
          },
        })
        atualizados++
      } else {
        await prisma.itemCatalogo.create({
          data: {
            idOrganizacao,
            codigoInterno: item.codigo,
            nome: item.nome,
            descricaoTecnica: item.descricaoTecnica,
            tipo: 1, // Material — endpoint de Produtos
            unidadeMedida: item.unidadeMedida,
            status: item.ativo ? 2 : 4,
            criadoPor: idUsuarioSistema,
            atributosExtras: item.atributosExtras as any,
          },
        })
        criados++
      }
    }

    await prisma.integracaoErp.update({
      where: { idOrganizacao },
      data: {
        ultimaSincronizacaoEm: new Date(),
        ultimoResultado: RESULTADO_SYNC.SUCESSO,
        ultimaMensagemErro: null,
        totalItensUltimaSincronizacao: itens.length,
      },
    })

    return { total: itens.length, criados, atualizados }
  } catch (err: any) {
    await prisma.integracaoErp.update({
      where: { idOrganizacao },
      data: {
        ultimaSincronizacaoEm: new Date(),
        ultimoResultado: RESULTADO_SYNC.ERRO,
        ultimaMensagemErro: err.message,
      },
    })
    throw err
  }
}

// ── Rotina diária — chamada por um agendador externo (ver seção de deploy) ─
export async function sincronizarTodasIntegracoesAtivas() {
  const integracoes = await prisma.integracaoErp.findMany({ where: { ativo: true } })
  const resultados: { idOrganizacao: string; ok: boolean; erro?: string }[] = []

  for (const integracao of integracoes) {
    try {
      await sincronizarItensErp(integracao.idOrganizacao)
      resultados.push({ idOrganizacao: integracao.idOrganizacao, ok: true })
    } catch (err: any) {
      resultados.push({ idOrganizacao: integracao.idOrganizacao, ok: false, erro: err.message })
    }
  }

  return resultados
}
