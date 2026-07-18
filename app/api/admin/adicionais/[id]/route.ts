import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function isTableMissing(error: { message?: string; code?: string } | null): boolean {
  if (!error) return false
  const msg = error.message ?? ''
  const code = error.code ?? ''
  return (
    code === 'PGRST204' ||
    msg.includes('adicionais_categoria') ||
    msg.includes('schema cache') ||
    msg.includes('does not exist') ||
    msg.includes('relation')
  )
}

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params
  const body = await req.json()

  const updates: Record<string, unknown> = {}
  if (body.nome !== undefined) updates.nome = String(body.nome).trim()
  if (body.preco !== undefined) updates.preco = parseFloat(body.preco) || 0
  if (body.ativo !== undefined) updates.ativo = !!body.ativo
  if (body.ordem !== undefined) updates.ordem = parseInt(body.ordem) || 0
  if (body.categoria_slug !== undefined) updates.categoria_slug = String(body.categoria_slug).trim()

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'Nenhum campo para atualizar' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('adicionais_categoria')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    if (isTableMissing(error)) {
      return NextResponse.json({ tableNotFound: true, error: 'Tabela não encontrada.' }, { status: 503 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    adicional: {
      id: data.id,
      categoriaSlug: data.categoria_slug,
      nome: data.nome,
      preco: Number(data.preco) || 0,
      ativo: !!data.ativo,
      ordem: data.ordem ?? 0,
      createdAt: data.created_at,
    },
  })
}

export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params

  const { error } = await supabaseAdmin
    .from('adicionais_categoria')
    .delete()
    .eq('id', id)

  if (error) {
    if (isTableMissing(error)) {
      return NextResponse.json({ tableNotFound: true, error: 'Tabela não encontrada.' }, { status: 503 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
