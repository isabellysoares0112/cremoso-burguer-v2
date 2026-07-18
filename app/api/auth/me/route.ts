import { NextRequest, NextResponse } from 'next/server'
import { createHmac } from 'crypto'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const COOKIE_NAME = 'cremoso-session'

function verifyCookie(
  cookieValue: string,
  secret: string
): { username: string; role: string } | null {
  const parts = cookieValue.split(':')
  if (parts.length < 3) return null

  const sig = parts[parts.length - 1]
  const payload = parts.slice(0, -1).join(':')
  const expected = createHmac('sha256', secret).update(payload).digest('hex')

  if (sig.length !== expected.length) return null

  let diff = 0
  for (let i = 0; i < sig.length; i++) {
    diff |= sig.charCodeAt(i) ^ expected.charCodeAt(i)
  }
  if (diff !== 0) return null

  const [username, role] = payload.split(':')
  if (!username || !role) return null

  return { username, role }
}

export async function GET(req: NextRequest) {
  const secret = process.env.SESSION_SECRET
  if (!secret) {
    return NextResponse.json({ user: null })
  }

  const cookieValue = req.cookies.get(COOKIE_NAME)?.value ?? ''
  if (!cookieValue) {
    return NextResponse.json({ user: null })
  }

  const parsed = verifyCookie(cookieValue, secret)
  if (!parsed) {
    return NextResponse.json({ user: null })
  }

  const id = parsed.role === 'admin' ? '1' : '2'
  return NextResponse.json({
    user: { id, username: parsed.username, role: parsed.role },
  })
}
