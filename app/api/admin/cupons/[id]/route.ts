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

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const body = await req.json()
  const { id } = await params

  const updates: Record<string, unknown> = {}
  if (typeof body.ativo === 'boolean') updates.active = body.ativo
  if (body.codigo !== undefined) updates.code = String(body.codigo).trim().toUpperCase()
  if (body.desconto_tipo !== undefined)
    updates.discount_type = body.desconto_tipo === 'percentual' ? 'percentage' : 'fixed'
  if (body.desconto_valor !== undefined) updates.discount_value = parseFloat(body.desconto_valor)
  if (body.validade !== undefined) updates.expires_at = body.validade || null
  if (body.limite_uso !== undefined)
    updates.usage_limit = body.limite_uso ? parseInt(body.limite_uso) : null

  const { data, error } = await supabaseAdmin
    .from('coupons')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ cupom: toFrontend(data) })
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { error } = await supabaseAdmin
    .from('coupons')
    .delete()
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
