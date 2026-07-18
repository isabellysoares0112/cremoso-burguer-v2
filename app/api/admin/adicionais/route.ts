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

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const categoriaSlug = searchParams.get('categoria_slug')

  let query = supabaseAdmin
    .from('adicionais_categoria')
    .select('*')
    .order('ordem', { ascending: true })
    .order('nome', { ascending: true })

  if (categoriaSlug && categoriaSlug !== '__check__') {
    query = query.eq('categoria_slug', categoriaSlug)
  }

  const { data, error } = await query

  if (error) {
    if (isTableMissing(error)) {
      return NextResponse.json({ tableNotFound: true, adicionais: [] }, { status: 200 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const adicionais = (data ?? []).map((row) => ({
    id: row.id,
    categoriaSlug: row.categoria_slug,
    nome: row.nome,
    preco: Number(row.preco) || 0,
    ativo: !!row.ativo,
    ordem: row.ordem ?? 0,
    createdAt: row.created_at,
  }))

  return NextResponse.json({ adicionais })
}

export async function POST(req: NextRequest) {
  const body = await req.json()

  const nome = String(body?.nome || '').trim()
  const categoriaSlug = String(body?.categoria_slug || '').trim()
  const preco = parseFloat(body?.preco) || 0
  const ativo = body?.ativo !== false
  const ordem = parseInt(body?.ordem) || 0

  if (!nome) return NextResponse.json({ error: 'nome é obrigatório' }, { status: 400 })
  if (!categoriaSlug) return NextResponse.json({ error: 'categoria_slug é obrigatório' }, { status: 400 })

  const { data, error } = await supabaseAdmin
    .from('adicionais_categoria')
    .insert({ categoria_slug: categoriaSlug, nome, preco, ativo, ordem })
    .select()
    .single()

  if (error) {
    if (isTableMissing(error)) {
      return NextResponse.json({ tableNotFound: true, error: 'Tabela não encontrada. Execute a migration no Supabase.' }, { status: 503 })
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
