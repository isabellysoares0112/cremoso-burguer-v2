import { NextResponse } from 'next/server'
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

export async function GET() {
  try {
    const [{ data: cats, error: catErr }, { data: prods, error: prodErr }] = await Promise.all([
      supabaseAdmin.from('categorias').select('id, nome').order('nome'),
      supabaseAdmin.from('produtos').select('*').order('nome'),
    ])
    if (catErr) throw catErr
    if (prodErr) throw prodErr

    const categories = (cats ?? []).map((c, idx) => ({
      id: c.id,
      slug: slugify(c.nome) || c.id,
      name: c.nome,
      sort_order: idx,
    }))
    const idToSlug = new Map(categories.map((c) => [c.id, c.slug]))

    const products = (prods ?? []).map((p) => ({
      id: p.id,
      name: p.nome,
      description: p.descricao ?? '',
      price: Number(p.preco) || 0,
      image: p.imagem || '/images/cremoso-burguer.jpg',
      category: idToSlug.get(p.categoria_id) || 'sem-categoria',
      active: !!p.ativo,
      categoria_id: p.categoria_id,
    }))

    return NextResponse.json({ ok: true, categories, products })
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : 'unknown' },
      { status: 500 },
    )
  }
}
