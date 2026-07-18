import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function onlyDigits(v: string): string {
  return v.replace(/\D/g, '')
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const numero = searchParams.get('numero')
  const telefoneRaw = searchParams.get('telefone')

  // Exigimos SEMPRE número do pedido + telefone juntos. Número sozinho é
  // sequencial e fácil de adivinhar — permitir isso vazaria nome, telefone
  // e endereço de qualquer pedido pra qualquer pessoa.
  if (!numero || !telefoneRaw) {
    return NextResponse.json(
      { error: 'Informe o número do pedido e o telefone usado no pedido.' },
      { status: 400 }
    )
  }

  const telefoneDigits = onlyDigits(telefoneRaw)
  if (!telefoneDigits) {
    return NextResponse.json({ error: 'Telefone inválido.' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('pedidos')
    .select('*')
    .eq('numero_pedido', Number(numero))
    .order('created_at', { ascending: false })
    .limit(5)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Confere o telefone no servidor (ignorando pontuação) em vez de deixar o
  // banco comparar string exata — e nunca devolve pedidos de outro telefone.
  const matched = (data || []).filter((row) => onlyDigits(String(row.telefone || '')) === telefoneDigits)

  if (matched.length === 0) {
    return NextResponse.json({ error: 'Pedido não encontrado. Verifique os dados informados.' }, { status: 404 })
  }

  return NextResponse.json({ orders: matched })
}
