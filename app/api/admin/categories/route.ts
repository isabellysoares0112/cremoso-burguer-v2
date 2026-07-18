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

function toCategory(row: { id: string; nome: string }, idx = 0) {
  return { id: row.id, slug: slugify(row.nome) || row.id, name: row.nome, sort_order: idx }
}

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('categorias')
    .select('id, nome')
    .order('nome')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ categories: (data ?? []).map((c, i) => toCategory(c, i)) })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const name = String(body?.name || '').trim()
  if (!name) return NextResponse.json({ error: 'name required' }, { status: 400 })
  const { data, error } = await supabaseAdmin
    .from('categorias')
    .insert({ nome: name })
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ category: toCategory(data) })
}
