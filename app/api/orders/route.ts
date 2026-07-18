import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { broadcastOrdersChanged } from '@/lib/broadcast-server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const VALID_PAYMENT_METHODS = ['pix', 'cartao', 'dinheiro', 'link']

interface IncomingAddon {
  addon: { id: string }
  quantity: number
}

interface IncomingItem {
  product: { id: string }
  quantity: number
  addons?: IncomingAddon[]
  observation?: string
}

async function computeDiscount(codigo: string | undefined, subtotal: number) {
  if (!codigo) return { discount: 0, error: null as string | null }

  const { data, error } = await supabaseAdmin
    .from('coupons')
    .select('*')
    .eq('code', codigo.trim().toUpperCase())
    .single()

  if (error || !data) return { discount: 0, error: 'Cupom não encontrado' }
  if (!data.active) return { discount: 0, error: 'Cupom inativo' }

  if (data.expires_at) {
    const hoje = new Date()
    hoje.setHours(0, 0, 0, 0)
    const validade = new Date(String(data.expires_at).split('T')[0] + 'T00:00:00')
    if (validade < hoje) return { discount: 0, error: 'Cupom expirado' }
  }

  if (data.usage_limit !== null && data.usage_count >= data.usage_limit) {
    return { discount: 0, error: 'Cupom esgotado' }
  }

  const discount =
    data.discount_type === 'percentage'
      ? Math.round(subtotal * Number(data.discount_value)) / 100
      : Math.min(Number(data.discount_value), subtotal)

  return { discount, error: null }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const customer = body?.customer
    const items = body?.items as IncomingItem[] | undefined
    const paymentMethod = String(body?.paymentMethod || '')
    const observation = String(body?.observation || '')
    const couponCode = body?.couponCode ? String(body.couponCode) : undefined

    if (!customer?.name || !customer?.phone || !customer?.address || !customer?.neighborhood) {
      return NextResponse.json({ error: 'Dados do cliente incompletos' }, { status: 400 })
    }
    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Carrinho vazio' }, { status: 400 })
    }
    if (!VALID_PAYMENT_METHODS.includes(paymentMethod)) {
      return NextResponse.json({ error: 'Forma de pagamento inválida' }, { status: 400 })
    }

    // ---- 1) Recalcula o subtotal a partir dos preços REAIS no banco ----
    const productIds = [...new Set(items.map((i) => i.product?.id).filter(Boolean))]
    const addonIds = [
      ...new Set(items.flatMap((i) => (i.addons || []).map((a) => a.addon?.id)).filter(Boolean)),
    ]

    const [{ data: produtos, error: prodErr }, { data: addons, error: addonErr }] = await Promise.all([
      productIds.length
        ? supabaseAdmin.from('produtos').select('id, preco, ativo').in('id', productIds)
        : Promise.resolve({ data: [], error: null }),
      addonIds.length
        ? supabaseAdmin.from('adicionais_categoria').select('id, preco, ativo').in('id', addonIds)
        : Promise.resolve({ data: [], error: null }),
    ])

    if (prodErr || addonErr) {
      return NextResponse.json({ error: 'Erro ao validar itens do pedido' }, { status: 500 })
    }

    const productMap = new Map((produtos ?? []).map((p) => [p.id, p]))
    const addonMap = new Map((addons ?? []).map((a) => [a.id, a]))

    let subtotal = 0
    for (const item of items) {
      const qty = Number(item.quantity)
      if (!item.product?.id || !Number.isFinite(qty) || qty <= 0) {
        return NextResponse.json({ error: 'Item de pedido inválido' }, { status: 400 })
      }
      const produto = productMap.get(item.product.id)
      if (!produto || !produto.ativo) {
        return NextResponse.json(
          { error: 'Um dos produtos do carrinho não está mais disponível. Atualize o cardápio e tente de novo.' },
          { status: 409 }
        )
      }
      let itemPrice = Number(produto.preco)
      for (const sel of item.addons || []) {
        const addonQty = Number(sel.quantity) || 0
        const addonRow = sel.addon?.id ? addonMap.get(sel.addon.id) : null
        if (sel.addon?.id && (!addonRow || !addonRow.ativo)) {
          return NextResponse.json(
            { error: 'Um dos adicionais escolhidos não está mais disponível.' },
            { status: 409 }
          )
        }
        if (addonRow) itemPrice += Number(addonRow.preco) * addonQty
      }
      subtotal += itemPrice * qty
    }
    subtotal = Math.round(subtotal * 100) / 100

    // ---- 2) Taxa de entrega REAL a partir do bairro cadastrado ----
    const { data: bairro } = await supabaseAdmin
      .from('bairros')
      .select('taxa_entrega')
      .eq('nome', customer.neighborhood)
      .maybeSingle()

    let deliveryFee: number
    if (bairro) {
      deliveryFee = Number(bairro.taxa_entrega)
    } else {
      const { data: settings } = await supabaseAdmin
        .from('configuracoes')
        .select('taxa_padrao')
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle()
      deliveryFee = settings ? Number(settings.taxa_padrao) || 5 : 5
    }

    // ---- 3) Cupom validado de novo, no servidor (não confia no valor do navegador) ----
    const { discount, error: couponError } = await computeDiscount(couponCode, subtotal)
    if (couponCode && couponError) {
      return NextResponse.json({ error: `Cupom inválido: ${couponError}` }, { status: 400 })
    }

    const total = Math.round((subtotal + deliveryFee - discount) * 100) / 100

    // ---- 4) Número do pedido (sequência atômica) ----
    const { data: numeroData, error: numeroError } = await supabaseAdmin.rpc('next_pedido_number')
    if (numeroError) {
      return NextResponse.json({ error: 'Erro ao gerar número do pedido' }, { status: 500 })
    }
    const numero_pedido = Number(numeroData)

    const id = crypto.randomUUID()
    const observacoes = JSON.stringify({ items, observation })

    const { error: insertError } = await supabaseAdmin.from('pedidos').insert({
      id,
      numero_pedido,
      cliente_nome: customer.name,
      telefone: customer.phone,
      endereco: customer.address,
      bairro: customer.neighborhood,
      forma_pagamento: paymentMethod,
      observacoes,
      status: 'novo',
      subtotal,
      taxa_entrega: deliveryFee,
      total,
    })

    if (insertError) {
      console.error('[POST /api/orders] Erro ao inserir pedido:', insertError.message)
      return NextResponse.json({ error: 'Erro ao criar pedido' }, { status: 500 })
    }

    // Best-effort: também salva/atualiza o cliente para o CRM.
    supabaseAdmin
      .from('clientes')
      .insert({ nome: customer.name, telefone: customer.phone })
      .then(({ error }: { error: unknown }) => {
        if (error) console.error('[POST /api/orders] clientes insert:', error)
      })

    broadcastOrdersChanged()

    return NextResponse.json({
      order: {
        id,
        number: numero_pedido,
        subtotal,
        deliveryFee,
        discount,
        total,
        status: 'novo',
        createdAt: new Date().toISOString(),
      },
    })
  } catch (err) {
    console.error('[POST /api/orders] Erro interno:', err)
    return NextResponse.json({ error: 'Erro interno ao criar pedido' }, { status: 500 })
  }
}
