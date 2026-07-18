import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function slugify(input: string): string {
  return (input || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

async function getCategoryIdBySlug(slug: string): Promise<string | null> {
  const { data } = await supabaseAdmin.from('categorias').select('id, nome')
  const match = (data ?? []).find((c) => slugify(c.nome) === slug)
  return match?.id ?? null
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const body = await req.json()
  const payload: Record<string, unknown> = {}
  if (body.name !== undefined) payload.nome = body.name
  if (body.description !== undefined) payload.descricao = body.description
  if (body.price !== undefined) payload.preco = body.price
  if (body.image !== undefined) payload.imagem = body.image
  if (body.active !== undefined) payload.ativo = body.active
  if (body.category !== undefined) {
    payload.categoria_id = await getCategoryIdBySlug(body.category)
  }
  const { data, error } = await supabaseAdmin
    .from('produtos')
    .update(payload)
    .eq('id', id)
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  const cats = await supabaseAdmin.from('categorias').select('id, nome')
  const idToSlug = new Map((cats.data ?? []).map((c) => [c.id, slugify(c.nome) || c.id]))
  return NextResponse.json({
    product: {
      id: data.id,
      name: data.nome,
      description: data.descricao ?? '',
      price: Number(data.preco) || 0,
      image: data.imagem || '/images/cremoso-burguer.jpg',
      category: idToSlug.get(data.categoria_id) || 'sem-categoria',
      active: !!data.ativo,
    },
  })
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const { error } = await supabaseAdmin.from('produtos').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
