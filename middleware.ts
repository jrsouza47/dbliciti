// middleware.ts
// Executado no edge runtime do Next.js antes de qualquer página ser renderizada.
// Responsável por:
//   1. Redirecionar / para /login (sem token) ou /<slug>/dashboard (com token)
//   2. Proteger todas as rotas de /<slug>/* exigindo token válido
//   3. Impedir acesso ao /login por quem já está autenticado

import { NextRequest, NextResponse } from 'next/server'

const JWT_SECRET = process.env.JWT_SECRET ?? 'dbliciti-dev-secret-troque-em-producao'

// Rotas públicas — não exigem autenticação
const ROTAS_PUBLICAS = ['/login', '/recuperar-senha', '/redefinir-senha']

// ── Decodifica e valida o JWT sem biblioteca externa (edge runtime) ──────────
interface JwtPayload {
  sub: string
  slugOrganizacao: string | null
  trocarSenha: boolean
  exp: number
}

function base64UrlDecode(str: string): string {
  // Substitui caracteres URL-safe e adiciona padding
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/')
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4)
  return atob(padded)
}

function decodeJwt(token: string): JwtPayload | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const payload = JSON.parse(base64UrlDecode(parts[1]))
    return payload as JwtPayload
  } catch {
    return null
  }
}

async function verificarAssinatura(token: string): Promise<boolean> {
  try {
    // Usa Web Crypto API disponível no edge runtime para verificar HMAC-SHA256
    const parts = token.split('.')
    if (parts.length !== 3) return false

    const encoder = new TextEncoder()
    const keyData = encoder.encode(JWT_SECRET)
    const key = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify'],
    )

    const signingInput = encoder.encode(`${parts[0]}.${parts[1]}`)
    const signatureBytes = Uint8Array.from(
      base64UrlDecode(parts[2]),
      (c) => c.charCodeAt(0),
    )

    return await crypto.subtle.verify('HMAC', key, signatureBytes, signingInput)
  } catch {
    return false
  }
}

async function tokenValido(token: string): Promise<JwtPayload | null> {
  const payload = decodeJwt(token)
  if (!payload) return null

  // Verifica expiração
  if (payload.exp * 1000 < Date.now()) return null

  // Verifica assinatura criptograficamente
  const assinaturaOk = await verificarAssinatura(token)
  if (!assinaturaOk) return null

  return payload
}

// ── Middleware ────────────────────────────────────────────────────────────────
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Extrai token do cookie (salvo no login em LoginContent.tsx)
  const token = request.cookies.get('db_token')?.value ?? null

  const isRotaPublica = ROTAS_PUBLICAS.some(
    (r) => pathname === r || pathname.startsWith(r + '/'),
  )

  // ── Rota raiz "/" ────────────────────────────────────────────────────────
  if (pathname === '/') {
    if (!token) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
    const payload = await tokenValido(token)
    if (!payload) {
      // Token inválido ou expirado — limpa cookie e vai para login
      const res = NextResponse.redirect(new URL('/login?expired=1', request.url))
      res.cookies.delete('db_token')
      return res
    }
    // Token válido — vai direto ao dashboard da organização
    const slug = payload.slugOrganizacao
    const destino = slug ? `/${slug}/dashboard` : '/dashboard'
    return NextResponse.redirect(new URL(destino, request.url))
  }

  // ── Rotas públicas ───────────────────────────────────────────────────────
  if (isRotaPublica) {
    // Usuário autenticado tentando acessar /login — redireciona ao dashboard
    if (pathname === '/login' && token) {
      const payload = await tokenValido(token)
      if (payload) {
        const slug = payload.slugOrganizacao
        const destino = slug ? `/${slug}/dashboard` : '/dashboard'
        return NextResponse.redirect(new URL(destino, request.url))
      }
    }
    // Deixa passar normalmente
    return NextResponse.next()
  }

  // ── Rotas protegidas /<slug>/* e /dashboard ───────────────────────────────
  if (!token) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  const payload = await tokenValido(token)
  if (!payload) {
    const res = NextResponse.redirect(new URL('/login?expired=1', request.url))
    res.cookies.delete('db_token')
    return res
  }

  // Força troca de senha — só deixa acessar a rota de trocar-senha
  if (payload.trocarSenha) {
    const slug = payload.slugOrganizacao
    const rotaTrocarSenha = slug ? `/${slug}/trocar-senha` : '/trocar-senha'
    if (!pathname.startsWith(rotaTrocarSenha)) {
      return NextResponse.redirect(new URL(rotaTrocarSenha, request.url))
    }
  }

  return NextResponse.next()
}

// ── Configuração de rotas interceptadas ──────────────────────────────────────
// O middleware só roda nas rotas listadas abaixo.
// Exclui: _next (assets), api, favicon e arquivos estáticos.
export const config = {
  matcher: [
    '/',
    '/login',
    '/recuperar-senha',
    '/redefinir-senha/:path*',
    '/dashboard/:path*',
    '/:slug((?!_next|api|favicon|public|.*\\..*)[^/]+)/:path*',
  ],
}
