import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface PedidoRow {
  id: string
  numero_pedido: number
  cliente_nome: string
  telefone: string | null
  endereco: string | null
  bairro: string | null
  forma_pagamento: string
  observacoes: string | null
  status: string
  subtotal: number | string
  taxa_entrega: number | string
  total: number | string
  created_at: string
}

function rowToOrder(row: PedidoRow) {
  let items: unknown[] = []
  let observation = ''
  try {
    if (row.observacoes) {
      const parsed = JSON.parse(row.observacoes)
      if (Array.isArray(parsed?.items)) items = parsed.items
      if (typeof parsed?.observation === 'string') observation = parsed.observation
    }
  } catch {
    /* ignore */
  }
  return {
    id: row.id,
    number: row.numero_pedido,
    customer: {
      name: row.cliente_nome,
      phone: row.telefone ?? '',
      address: row.endereco ?? '',
      neighborhood: row.bairro ?? '',
    },
    items,
    observation,
    subtotal: Number(row.subtotal) || 0,
    deliveryFee: Number(row.taxa_entrega) || 0,
    total: Number(row.total) || 0,
    paymentMethod: row.forma_pagamento,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.created_at,
  }
}

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('pedidos')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ orders: (data ?? []).map((r) => rowToOrder(r as PedidoRow)) })
}
