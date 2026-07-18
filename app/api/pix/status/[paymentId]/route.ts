import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ paymentId: string }> }
) {
  try {
    const { paymentId } = await ctx.params

    const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN
    if (!accessToken) {
      return NextResponse.json({ error: 'token ausente' }, { status: 500 })
    }

    const res = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: 'no-store',
    })
    const data = await res.json()

    if (!res.ok) {
      return NextResponse.json({ error: data.message || 'Erro ao consultar pagamento' }, { status: res.status })
    }

    return NextResponse.json({
      id: data.id,
      status: data.status,
      status_detail: data.status_detail,
    })
  } catch (err) {
    console.error('[PIX Status] Erro:', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
