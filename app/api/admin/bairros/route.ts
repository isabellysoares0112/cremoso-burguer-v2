import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('bairros')
    .select('*')
    .order('nome')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ bairros: data ?? [] })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const nome = String(body?.nome || '').trim()
  const taxa_entrega = parseFloat(body?.taxa_entrega ?? 0)

  if (!nome) return NextResponse.json({ error: 'nome obrigatório' }, { status: 400 })
  if (taxa_entrega < 0) return NextResponse.json({ error: 'taxa não pode ser negativa' }, { status: 400 })

  const { data, error } = await supabaseAdmin
    .from('bairros')
    .insert({ nome, taxa_entrega })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ bairro: data })
}
