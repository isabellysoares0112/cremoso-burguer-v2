import { NextRequest, NextResponse } from 'next/server'
import { createHmac, timingSafeEqual } from 'crypto'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const COOKIE_NAME = 'cremoso-session'
const COOKIE_MAX_AGE = 60 * 60 * 8 // 8 horas

// ---- Rate limiting de login (protege contra força bruta) ----
const MAX_ATTEMPTS = 8
const WINDOW_MS = 15 * 60 * 1000 // 15 minutos
const LOCKOUT_MS = 15 * 60 * 1000 // 15 minutos

function sign(value: string, secret: string): string {
  return createHmac('sha256', secret).update(value).digest('hex')
}

function buildCookieValue(username: string, role: string, secret: string): string {
  const payload = `${username}:${role}`
  const sig = sign(payload, secret)
  return `${payload}:${sig}`
}

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a)
  const bufB = Buffer.from(b)
  if (bufA.length !== bufB.length) return false
  return timingSafeEqual(bufA, bufB)
}

async function checkRateLimit(chave: string): Promise<{ blocked: boolean; retryAfterSeconds?: number }> {
  try {
    const { data } = await supabaseAdmin
      .from('login_attempts')
      .select('*')
      .eq('chave', chave)
      .maybeSingle()

    if (!data) return { blocked: false }

    if (data.bloqueado_ate && new Date(data.bloqueado_ate).getTime() > Date.now()) {
      const retryAfterSeconds = Math.ceil((new Date(data.bloqueado_ate).getTime() - Date.now()) / 1000)
      return { blocked: true, retryAfterSeconds }
    }

    return { blocked: false }
  } catch (e) {
    // Se a tabela ainda não existir ou o Supabase falhar, não travar o login por isso —
    // só registra no log e deixa passar (fail-open no rate limit, fail-closed na senha).
    console.error('[auth/login] checkRateLimit falhou:', e)
    return { blocked: false }
  }
}

async function recordAttempt(chave: string, success: boolean): Promise<void> {
  try {
    if (success) {
      await supabaseAdmin.from('login_attempts').delete().eq('chave', chave)
      return
    }

    const { data } = await supabaseAdmin
      .from('login_attempts')
      .select('*')
      .eq('chave', chave)
      .maybeSingle()

    const now = new Date()
    const withinWindow =
      data?.ultima_tentativa && now.getTime() - new Date(data.ultima_tentativa).getTime() < WINDOW_MS

    const novasTentativas = data && withinWindow ? (data.tentativas || 0) + 1 : 1
    const bloqueado_ate =
      novasTentativas >= MAX_ATTEMPTS ? new Date(now.getTime() + LOCKOUT_MS).toISOString() : null

    await supabaseAdmin.from('login_attempts').upsert(
      {
        chave,
        tentativas: novasTentativas,
        ultima_tentativa: now.toISOString(),
        bloqueado_ate,
      },
      { onConflict: 'chave' }
    )
  } catch (e) {
    console.error('[auth/login] recordAttempt falhou:', e)
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const username = String(body?.username || '').trim()
    const password = String(body?.password || '').trim()
    const role = String(body?.role || '').trim()

    const adminUser = (process.env.ADMIN_USERNAME || '').trim()
    const adminPass = (process.env.ADMIN_PASSWORD || '').trim()
    const entregadorUser = (process.env.ENTREGADOR_USERNAME || '').trim()
    const entregadorPass = (process.env.ENTREGADOR_PASSWORD || '').trim()
    const secret = process.env.SESSION_SECRET

    if (!secret) {
      console.error('[auth/login] SESSION_SECRET not configured')
      return NextResponse.json({ error: 'Servidor não configurado' }, { status: 500 })
    }

    // ---- Log de diagnóstico temporário — NUNCA imprime a senha, só o que é
    // necessário pra descobrir qual das duas pontas está errada. Dá pra tirar
    // depois que o login voltar a funcionar. Aparece em Vercel → seu projeto
    // → aba "Logs" (ou "Runtime Logs"), depois de tentar entrar.
    console.log('[auth/login][diagnóstico]', {
      role_recebido: role,
      usuario_digitado: username,
      usuario_digitado_normalizado: username.trim().toLowerCase(),
      tamanho_senha_digitada: password.trim().length,
      ADMIN_USERNAME_configurado: !!process.env.ADMIN_USERNAME,
      ADMIN_USERNAME_normalizado: adminUser.toLowerCase(),
      ADMIN_PASSWORD_configurado: !!process.env.ADMIN_PASSWORD,
      tamanho_ADMIN_PASSWORD: adminPass.length,
      ENTREGADOR_USERNAME_configurado: !!process.env.ENTREGADOR_USERNAME,
      ENTREGADOR_PASSWORD_configurado: !!process.env.ENTREGADOR_PASSWORD,
    })

    const normalizedUsername = username.trim().toLowerCase()
    const rateLimitKey = `${role || 'unknown'}:${normalizedUsername || 'unknown'}`

    const { blocked, retryAfterSeconds } = await checkRateLimit(rateLimitKey)
    if (blocked) {
      return NextResponse.json(
        { error: 'Muitas tentativas. Tente novamente em alguns minutos.' },
        { status: 429, headers: retryAfterSeconds ? { 'Retry-After': String(retryAfterSeconds) } : undefined }
      )
    }

    let validUser: { id: string; username: string; role: string } | null = null

    if (
      role === 'admin' &&
      adminUser &&
      adminPass &&
      safeEqual(normalizedUsername, adminUser.toLowerCase()) &&
      safeEqual(password, adminPass)
    ) {
      validUser = { id: '1', username, role: 'admin' }
    } else if (
      role === 'entregador' &&
      entregadorUser &&
      entregadorPass &&
      safeEqual(normalizedUsername, entregadorUser.toLowerCase()) &&
      safeEqual(password, entregadorPass)
    ) {
      validUser = { id: '2', username, role: 'entregador' }
    }

    if (!validUser && (role === 'admin' || role === 'entregador')) {
      const cfgUser = role === 'admin' ? adminUser : entregadorUser
      const cfgPass = role === 'admin' ? adminPass : entregadorPass
      console.log('[auth/login][diagnóstico] motivo da falha:', {
        variavel_de_ambiente_vazia: !cfgUser || !cfgPass,
        usuario_bateu: !!cfgUser && safeEqual(normalizedUsername, cfgUser.toLowerCase()),
        senha_bateu: !!cfgPass && safeEqual(password, cfgPass),
      })
    }

    await recordAttempt(rateLimitKey, !!validUser)

    if (!validUser) {
      return NextResponse.json({ error: 'Usuário ou senha incorretos' }, { status: 401 })
    }

    const cookieValue = buildCookieValue(validUser.username, validUser.role, secret)
    const isProd = process.env.NODE_ENV === 'production'

    const res = NextResponse.json({ user: validUser })
    res.cookies.set(COOKIE_NAME, cookieValue, {
      httpOnly: true,
      sameSite: 'strict',
      secure: isProd,
      maxAge: COOKIE_MAX_AGE,
      path: '/',
    })

    return res
  } catch (e) {
    console.error('[auth/login] Unexpected error:', e)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
