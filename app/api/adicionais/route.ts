import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Versão PÚBLICA de /api/admin/adicionais — usada no modal de produto do
// cardápio público, que não exige login.
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const categoriaSlug = searchParams.get('categoria_slug')

  let query = supabaseAdmin
    .from('adicionais_categoria')
    .select('id, categoria_slug, nome, preco, ativo, ordem')
    .eq('ativo', true)
    .order('ordem', { ascending: true })
    .order('nome', { ascending: true })

  if (categoriaSlug) {
    query = query.eq('categoria_slug', categoriaSlug)
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const adicionais = (data ?? []).map((row) => ({
    id: row.id,
    categoriaSlug: row.categoria_slug,
    nome: row.nome,
    preco: Number(row.preco) || 0,
    ativo: !!row.ativo,
    ordem: row.ordem ?? 0,
  }))

  return NextResponse.json({ adicionais })
}
