'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { RotateCcw, ChevronDown, ChevronUp } from 'lucide-react'
import { useStore } from '@/lib/store'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { Product, SelectedAddon } from '@/lib/types'

export const HISTORY_KEY = 'cremoso-order-history'

interface HistoryItem {
  product: Product
  quantity: number
  addons: SelectedAddon[]
  observation: string
}

export interface HistoryOrder {
  id: string
  number: number
  date: string
  items: HistoryItem[]
  total: number
}

export function OrderAgain() {
  const [history, setHistory] = useState<HistoryOrder[]>([])
  const [expanded, setExpanded] = useState(false)
  const { addToCart, addToCartWithOptions, setCartOpen } = useStore()

  useEffect(() => {
    try {
      const saved = localStorage.getItem(HISTORY_KEY)
      if (saved) setHistory(JSON.parse(saved))
    } catch { /* ignore */ }
  }, [])

  if (history.length === 0) return null

  const displayed = expanded ? history : history.slice(0, 3)

  const fmt = (v: number) =>
    v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

  const reorder = (order: HistoryOrder) => {
    order.items.forEach(item => {
      const times = item.quantity || 1
      if (item.addons && item.addons.length > 0) {
        for (let i = 0; i < times; i++) {
          addToCartWithOptions(item.product, item.addons, item.observation)
        }
      } else {
        for (let i = 0; i < times; i++) {
          addToCart(item.product)
        }
      }
    })
    setCartOpen(true)
  }

  return (
    <section className="py-5 px-4 bg-background">
      <div className="container mx-auto max-w-5xl">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <RotateCcw className="w-4 h-4 text-primary" />
            <span className="text-sm font-bold text-foreground tracking-wide">PEDIR NOVAMENTE</span>
          </div>
          {history.length > 3 && (
            <button
              onClick={() => setExpanded(v => !v)}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
            >
              {expanded ? 'Ver menos' : `Ver todos (${history.length})`}
              {expanded
                ? <ChevronUp className="w-3 h-3" />
                : <ChevronDown className="w-3 h-3" />}
            </button>
          )}
        </div>

        <div className="flex gap-3 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
          {displayed.map(order => {
            const first = order.items[0]
            const extra = order.items.length - 1
            const summary = first
              ? `${first.quantity}x ${first.product.name}${extra > 0 ? ` +${extra}` : ''}`
              : 'Pedido'

            return (
              <div
                key={order.id}
                className="flex-shrink-0 w-56 bg-card border border-border rounded-xl p-3 flex gap-3 items-start"
              >
                {first?.product?.image ? (
                  <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-muted">
                    <Image
                      src={first.product.image}
                      alt={first.product.name}
                      width={48}
                      height={48}
                      className="w-full h-full object-cover"
                      unoptimized
                    />
                  </div>
                ) : (
                  <div className="w-12 h-12 rounded-lg bg-muted flex-shrink-0 flex items-center justify-center">
                    <RotateCcw className="w-4 h-4 text-muted-foreground" />
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-foreground truncate leading-tight">{summary}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {formatDistanceToNow(new Date(order.date), { locale: ptBR, addSuffix: true })}
                  </p>
                  <p className="text-xs font-bold text-primary mt-0.5">{fmt(order.total)}</p>
                  <button
                    onClick={() => reorder(order)}
                    className="mt-2 w-full bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold py-2 rounded-lg transition-colors flex items-center justify-center gap-1.5"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Pedir novamente
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
