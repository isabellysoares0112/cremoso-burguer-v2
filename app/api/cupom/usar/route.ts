import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const codigo = String(body?.codigo || '').trim().toUpperCase()

  if (!codigo) return NextResponse.json({ error: 'Código obrigatório' }, { status: 400 })

  const { data, error } = await supabaseAdmin
    .from('coupons')
    .select('id, usage_count, usage_limit')
    .eq('code', codigo)
    .single()

  if (error || !data) return NextResponse.json({ error: 'Cupom não encontrado' }, { status: 404 })

  const { error: updateError } = await supabaseAdmin
    .from('coupons')
    .update({ usage_count: (data.usage_count ?? 0) + 1 })
    .eq('id', data.id)

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
