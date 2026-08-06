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
  const numerosRaw = searchParams.get('numeros') // lista separada por vírgula, ex: "12,15,19"
  const telefoneRaw = searchParams.get('telefone')

  const numerosList = numerosRaw
    ? numerosRaw
        .split(',')
        .map((n) => Number(n.trim()))
        .filter((n) => Number.isFinite(n) && n > 0)
    : numero
    ? [Number(numero)]
    : []

  // Exigimos SEMPRE número(s) do pedido + telefone juntos. Número sozinho é
  // sequencial e fácil de adivinhar — permitir isso vazaria nome, telefone
  // e endereço de qualquer pedido pra qualquer pessoa.
  if (numerosList.length === 0 || !telefoneRaw) {
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
    .in('numero_pedido', numerosList)
    .order('created_at', { ascending: false })
    .limit(Math.max(numerosList.length * 2, 5))

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Confere o telefone no servidor (ignorando pontuação) em vez de deixar o
  // banco comparar string exata — e nunca devolve pedidos de outro telefone.
  const matched = (data || []).filter((row) => onlyDigits(String(row.telefone || '')) === telefoneDigits)

  if (matched.length === 0) {
    return NextResponse.json({ error: 'Pedido não encontrado. Verifique os dados informados.' }, { status: 404 })
  }

  return NextResponse.json({ orders: matched })
}
