import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function toFrontend(row: Record<string, unknown>) {
  return {
    id: row.id,
    codigo: row.code,
    desconto_tipo: row.discount_type === 'percentage' ? 'percentual' : 'fixo',
    desconto_valor: row.discount_value,
    ativo: row.active,
    validade: row.expires_at
      ? String(row.expires_at).split('T')[0]
      : null,
    limite_uso: row.usage_limit,
    uso_atual: row.usage_count,
    created_at: row.created_at,
  }
}

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('coupons')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ cupons: (data ?? []).map(toFrontend) })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const codigo = String(body?.codigo || '').trim().toUpperCase()
  const desconto_tipo = body?.desconto_tipo
  const desconto_valor = parseFloat(body?.desconto_valor ?? 0)
  const validade = body?.validade || null
  const limite_uso = body?.limite_uso ? parseInt(body.limite_uso) : null

  if (!codigo) return NextResponse.json({ error: 'Código obrigatório' }, { status: 400 })
  if (!['percentual', 'fixo'].includes(desconto_tipo))
    return NextResponse.json({ error: 'Tipo de desconto inválido' }, { status: 400 })
  if (desconto_valor <= 0)
    return NextResponse.json({ error: 'Valor de desconto deve ser positivo' }, { status: 400 })

  const { data, error } = await supabaseAdmin
    .from('coupons')
    .insert({
      code: codigo,
      discount_type: desconto_tipo === 'percentual' ? 'percentage' : 'fixed',
      discount_value: desconto_valor,
      expires_at: validade || null,
      usage_limit: limite_uso,
      usage_count: 0,
      active: true,
    })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') return NextResponse.json({ error: 'Código já existe' }, { status: 409 })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ cupom: toFrontend(data) }, { status: 201 })
}
