import { NextRequest, NextResponse } from 'next/server'

const COOKIE_NAME = 'cremoso-session'

async function hmacSha256(secret: string, message: string): Promise<string> {
  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(message))
  return Array.from(new Uint8Array(sig))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

interface SessionResult {
  valid: boolean
  role?: string
}

async function verifySession(cookieValue: string, secret: string): Promise<SessionResult> {
  const parts = cookieValue.split(':')
  if (parts.length < 3) return { valid: false }

  const sig = parts[parts.length - 1]
  const payload = parts.slice(0, -1).join(':')
  const role = parts.length >= 3 ? parts[parts.length - 2] : undefined

  try {
    const expected = await hmacSha256(secret, payload)
    if (sig.length !== expected.length) return { valid: false }

    let diff = 0
    for (let i = 0; i < sig.length; i++) {
      diff |= sig.charCodeAt(i) ^ expected.charCodeAt(i)
    }
    // O role vem de dentro do payload assinado, então não dá pra forjar
    // sem saber o SESSION_SECRET.
    return { valid: diff === 0, role }
  } catch {
    return { valid: false }
  }
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl
  const secret = process.env.SESSION_SECRET

  // Rotas que usam o client admin do Supabase (service role) e por isso
  // precisam da mesma checagem de sessão que /api/admin/*, mesmo não
  // vivendo debaixo desse prefixo.
  const extraAdminOnlyApiRoutes = ['/api/upload', '/api/setup']

  // Pedidos: admin E entregador podem ver/atualizar (o painel de entrega
  // precisa disso). Todo o resto de /api/admin/* é admin-only.
  const isOrdersApiRoute =
    pathname === '/api/admin/orders' || pathname.startsWith('/api/admin/orders/')

  const isAdminOnlyApiRoute =
    (pathname.startsWith('/api/admin/') && !isOrdersApiRoute) ||
    extraAdminOnlyApiRoutes.some((route) => pathname === route || pathname.startsWith(`${route}/`))

  const isPageAdmin = pathname.startsWith('/equipe/admin/')
  const isPageEntregador = pathname.startsWith('/equipe/entregador')

  const isProtected = isOrdersApiRoute || isAdminOnlyApiRoute || isPageAdmin || isPageEntregador

  if (!isProtected) {
    return NextResponse.next()
  }

  const isApiRoute = isOrdersApiRoute || isAdminOnlyApiRoute

  if (!secret) {
    console.error('[middleware] SESSION_SECRET não configurado')
    if (isApiRoute) {
      return NextResponse.json({ error: 'Servidor não configurado' }, { status: 500 })
    }
    return NextResponse.redirect(new URL('/equipe', req.url))
  }

  const cookieValue = req.cookies.get(COOKIE_NAME)?.value ?? ''
  const { valid, role } = cookieValue
    ? await verifySession(cookieValue, secret)
    : { valid: false, role: undefined }

  if (!valid) {
    if (isApiRoute) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }
    return NextResponse.redirect(new URL('/equipe', req.url))
  }

  // ---- A partir daqui a sessão é válida. Falta checar o papel (role). ----

  if (isAdminOnlyApiRoute && role !== 'admin') {
    return NextResponse.json({ error: 'Acesso restrito ao administrador' }, { status: 403 })
  }

  if (isOrdersApiRoute && role !== 'admin' && role !== 'entregador') {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  if (isPageAdmin && role !== 'admin') {
    // Entregador autenticado tentando acessar o painel admin: manda para a área dele, não para o login.
    return NextResponse.redirect(new URL('/equipe/entregador', req.url))
  }

  if (isPageEntregador && role !== 'entregador' && role !== 'admin') {
    return NextResponse.redirect(new URL('/equipe', req.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/api/admin/:path*',
    '/equipe/admin/:path*',
    '/equipe/entregador/:path*',
    '/api/upload',
    '/api/setup',
  ],
}
