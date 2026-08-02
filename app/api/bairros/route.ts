import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Versão PÚBLICA de /api/admin/bairros — usada no checkout, que não exige
// login. Só devolve nome e taxa de entrega, informação que já é pública
// por natureza (o cliente precisa ver isso pra fechar o pedido).
export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('bairros')
    .select('id, nome, taxa_entrega')
    .order('nome')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ bairros: data ?? [] })
}
