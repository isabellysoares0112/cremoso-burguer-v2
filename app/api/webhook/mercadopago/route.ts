import { NextRequest, NextResponse } from 'next/server'
import { broadcastOrdersChanged } from '@/lib/broadcast-server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Tolerância para diferenças de arredondamento (centavos) entre o valor
// enviado ao Mercado Pago e o valor gravado no pedido.
const AMOUNT_TOLERANCE = 0.01

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    console.log('[Webhook MP] Notificação recebida:', JSON.stringify(body))

    const type = body?.type
    const paymentId = body?.data?.id

    if (type !== 'payment' || !paymentId) {
      console.log('[Webhook MP] Ignorado — type:', type, 'paymentId:', paymentId)
      return NextResponse.json({ ok: true })
    }

    const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN
    if (!accessToken) {
      console.error('[Webhook MP] MERCADOPAGO_ACCESS_TOKEN não configurado')
      return NextResponse.json({ error: 'token MP ausente' }, { status: 500 })
    }

    // Busca detalhes do pagamento DIRETO na API do Mercado Pago — nunca confiamos
    // no corpo da notificação em si, só usamos ele para saber qual ID consultar.
    const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    const payment = await mpRes.json()
    console.log(
      `[Webhook MP] Payment ${paymentId} — status: ${payment.status}, valor: ${payment.transaction_amount}, ref: ${payment.external_reference}`
    )

    if (payment.status !== 'approved') {
      console.log('[Webhook MP] Não aprovado, ignorando.')
      return NextResponse.json({ ok: true })
    }

    const orderNumber = Number(payment.external_reference)
    if (!orderNumber || isNaN(orderNumber)) {
      console.error('[Webhook MP] external_reference inválido:', payment.external_reference)
      return NextResponse.json({ error: 'external_reference inválido' }, { status: 400 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceRoleKey) {
      console.error('[Webhook MP] Supabase env vars ausentes')
      return NextResponse.json({ error: 'supabase não configurado' }, { status: 500 })
    }

    // 1) Busca o pedido real no banco para saber o valor e o status atuais.
    const orderRes = await fetch(
      `${supabaseUrl}/rest/v1/pedidos?numero_pedido=eq.${orderNumber}&select=id,total,status,forma_pagamento`,
      {
        headers: {
          apikey: serviceRoleKey,
          Authorization: `Bearer ${serviceRoleKey}`,
        },
      }
    )
    const orders = await orderRes.json()
    const order = Array.isArray(orders) ? orders[0] : null

    if (!order) {
      console.error(`[Webhook MP] Pedido #${orderNumber} não encontrado no banco`)
      return NextResponse.json({ error: 'pedido não encontrado' }, { status: 404 })
    }

    // 2) Idempotência: se já está preparando/pronto/entregue, não reprocessa
    //    (evita reagir de novo a notificações duplicadas do Mercado Pago).
    if (['preparando', 'pronto', 'entregue'].includes(order.status)) {
      console.log(`[Webhook MP] Pedido #${orderNumber} já estava em "${order.status}", ignorando notificação repetida.`)
      return NextResponse.json({ ok: true })
    }

    if (order.status === 'cancelado') {
      console.warn(`[Webhook MP] Pagamento aprovado para pedido #${orderNumber} que está CANCELADO. Verifique manualmente — pode precisar de estorno.`)
      return NextResponse.json({ ok: true, warning: 'pedido cancelado recebeu pagamento' })
    }

    // 3) O PASSO MAIS IMPORTANTE: confere se o valor realmente pago bate com o
    //    valor do pedido gravado no banco. Sem isso, alguém poderia gerar uma
    //    cobrança PIX de valor menor do que o pedido de verdade.
    const valorPago = Number(payment.transaction_amount)
    const valorPedido = Number(order.total)
    const diferenca = Math.abs(valorPago - valorPedido)

    if (diferenca > AMOUNT_TOLERANCE) {
      console.error(
        `[Webhook MP] 🚨 DIVERGÊNCIA DE VALOR — Pedido #${orderNumber}: esperado R$${valorPedido}, pago R$${valorPago}. Pedido NÃO foi marcado como pago. Verifique manualmente.`
      )
      return NextResponse.json(
        { error: 'valor pago não confere com o valor do pedido', esperado: valorPedido, pago: valorPago },
        { status: 409 }
      )
    }

    // 4) Tudo confere — marca como preparando.
    const updateRes = await fetch(
      `${supabaseUrl}/rest/v1/pedidos?numero_pedido=eq.${orderNumber}`,
      {
        method: 'PATCH',
        headers: {
          apikey: serviceRoleKey,
          Authorization: `Bearer ${serviceRoleKey}`,
          'Content-Type': 'application/json',
          Prefer: 'return=minimal',
        },
        body: JSON.stringify({ status: 'preparando' }),
      }
    )

    if (!updateRes.ok) {
      const errText = await updateRes.text()
      console.error('[Webhook MP] Erro ao atualizar pedido:', errText)
      return NextResponse.json({ error: 'erro ao atualizar pedido' }, { status: 500 })
    }

    console.log(`[Webhook MP] Pedido #${orderNumber} atualizado para "preparando" (valor conferido: R$${valorPago})`)
    broadcastOrdersChanged()
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[Webhook MP] Erro interno:', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({ ok: true, endpoint: 'Mercado Pago Webhook' })
}
