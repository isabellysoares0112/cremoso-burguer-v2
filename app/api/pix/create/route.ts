import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { total, orderNumber } = await req.json()

    const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN

    // Debug: confirma se o token está sendo lido (sem expor o valor)
    if (!accessToken) {
      console.error('[PIX] MERCADOPAGO_ACCESS_TOKEN não encontrado no ambiente')
      return NextResponse.json(
        { error: 'MERCADOPAGO_ACCESS_TOKEN não configurado' },
        { status: 500 }
      )
    }
    console.log(`[PIX] Token lido com sucesso. Prefixo: ${accessToken.slice(0, 8)}... Tamanho: ${accessToken.length}`)
    console.log(`[PIX] Criando cobrança — Pedido #${orderNumber}, Valor: R$${total}`)

    const body = {
      transaction_amount: Number(Number(total).toFixed(2)),
      description: `Pedido #${String(orderNumber).padStart(3, '0')} - Cremoso Burguer`,
      payment_method_id: 'pix',
      external_reference: String(orderNumber),
      payer: {
        email: 'cliente@cremoso.com.br',
        first_name: 'Cliente',
        last_name: 'Cremoso',
      },
    }
    console.log('[PIX] Body enviado ao Mercado Pago:', JSON.stringify(body))

    const response = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        // Chave determinística por pedido: se essa rota for chamada de novo
        // para o mesmo pedido (ex: o componente remontou), o Mercado Pago
        // devolve o MESMO pagamento em vez de criar uma cobrança duplicada.
        'X-Idempotency-Key': `cremoso-burguer-pedido-${orderNumber}`,
      },
      body: JSON.stringify(body),
    })

    const data = await response.json()
    console.log(`[PIX] Resposta Mercado Pago — Status HTTP: ${response.status}`)
    console.log('[PIX] Resposta completa:', JSON.stringify(data))

    if (!response.ok) {
      console.error(`[PIX] Erro Mercado Pago — error: ${data.error}, message: ${data.message}, cause: ${JSON.stringify(data.cause)}`)
      return NextResponse.json(
        {
          error: data.message || 'Erro ao criar cobrança PIX',
          mp_error: data.error,
          mp_cause: data.cause,
        },
        { status: response.status }
      )
    }

    return NextResponse.json({
      id: data.id,
      qr_code: data.point_of_interaction?.transaction_data?.qr_code ?? null,
      qr_code_base64: data.point_of_interaction?.transaction_data?.qr_code_base64 ?? null,
      status: data.status,
    })
  } catch (error) {
    console.error('[PIX] Erro interno na rota:', error)
    return NextResponse.json({ error: 'Erro interno ao criar PIX' }, { status: 500 })
  }
}
