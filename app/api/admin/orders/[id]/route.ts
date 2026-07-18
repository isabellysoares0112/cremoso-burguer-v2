import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { broadcastOrdersChanged } from '@/lib/broadcast-server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const body = await req.json()
  const status = String(body?.status || '').trim()
  if (!status) return NextResponse.json({ error: 'status required' }, { status: 400 })
  const { error } = await supabaseAdmin.from('pedidos').update({ status }).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  broadcastOrdersChanged()
  return NextResponse.json({ ok: true })
}
