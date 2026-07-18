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
    .select('*')
    .eq('code', codigo)
    .single()

  if (error || !data) {
    return NextResponse.json({ error: 'Cupom não encontrado' }, { status: 404 })
  }

  if (!data.active) {
    return NextResponse.json({ error: 'Cupom inativo' }, { status: 400 })
  }

  if (data.expires_at) {
    const hoje = new Date()
    hoje.setHours(0, 0, 0, 0)
    const validade = new Date(String(data.expires_at).split('T')[0] + 'T00:00:00')
    if (validade < hoje) {
      return NextResponse.json({ error: 'Cupom expirado' }, { status: 400 })
    }
  }

  if (data.usage_limit !== null && data.usage_count >= data.usage_limit) {
    return NextResponse.json({ error: 'Cupom esgotado' }, { status: 400 })
  }

  return NextResponse.json({
    cupom: {
      id: data.id,
      codigo: data.code,
      desconto_tipo: data.discount_type === 'percentage' ? 'percentual' : 'fixo',
      desconto_valor: data.discount_value,
    },
  })
}
