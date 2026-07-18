'use client'

import { useEffect, useCallback, useState } from 'react'
import { ShoppingBag, Phone, MapPin, Printer, RefreshCw, ChefHat } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useStore } from '@/lib/store'
import type { Order, OrderStatus } from '@/lib/types'
import { format } from 'date-fns'

const statusColors: Record<OrderStatus, { bg: string; text: string }> = {
  novo:       { bg: 'bg-primary',    text: 'text-primary-foreground' },
  preparando: { bg: 'bg-secondary',  text: 'text-secondary-foreground' },
  pronto:     { bg: 'bg-green-600',  text: 'text-white' },
  entregue:   { bg: 'bg-muted',      text: 'text-muted-foreground' },
  cancelado:  { bg: 'bg-destructive', text: 'text-destructive-foreground' },
}

const statusLabels: Record<OrderStatus, string> = {
  novo: 'NOVO', preparando: 'PREPARANDO', pronto: 'PRONTO', entregue: 'ENTREGUE', cancelado: 'CANCELADO',
}

function getNextStatus(s: OrderStatus): OrderStatus | null {
  const flow: OrderStatus[] = ['novo', 'preparando', 'pronto', 'entregue']
  const idx = flow.indexOf(s)
  return idx < flow.length - 1 ? flow[idx + 1] : null
}

function handlePrint(order: Order) {
  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  const obsLine = order.observation?.trim()
    ? `\n      OBSERVAÇÃO:\n      ${order.observation.replace(/\n/g, '\n      ')}`
    : ''
  const content = `
      CREMOSO BURGUER
      ================
      Pedido #${String(order.number).padStart(3, '0')}
      ${format(new Date(order.createdAt), 'dd/MM/yyyy HH:mm')}

      Cliente: ${order.customer.name}
      Tel: ${order.customer.phone}
      End: ${order.customer.address}
      Bairro: ${order.customer.neighborhood}

      ITENS:
      ${order.items.map(i => `${i.quantity}x ${i.product?.name}`).join('\n      ')}${obsLine}

      Pagamento: ${order.paymentMethod?.toUpperCase()}
      TOTAL: ${fmt(order.total)}
    `
  const win = window.open('', '_blank')
  if (win) {
    win.document.write(`<!DOCTYPE html><html><head><title>Pedido #${String(order.number).padStart(3,'0')}</title><style>body{font-family:monospace;font-size:14px;padding:20px}pre{white-space:pre-wrap}</style></head><body><pre>${content}</pre></body></html>`)
    win.document.close()
    win.focus()
    win.print()
  }
}

export function KitchenView() {
  const { orders, loadOrders, updateOrderStatus } = useStore()
  const [pendingCancel, setPendingCancel] = useState<Order | null>(null)

  const load = useCallback(async () => {
    try { await loadOrders() } catch { /* silent */ }
  }, [loadOrders])

  useEffect(() => {
    load()
    let cleanup: (() => void) | null = null
    import('@/lib/api').then(({ subscribeToOrders }) => {
      cleanup = subscribeToOrders(() => loadOrders())
    })
    return () => { if (cleanup) cleanup() }
  }, [load, loadOrders])

  const activeOrders = orders.filter(o => o.status !== 'entregue' && o.status !== 'cancelado')

  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

  const handleStatusUpdate = async (order: Order, nextStatus: OrderStatus) => {
    await updateOrderStatus(order.id, nextStatus)
    if (nextStatus === 'pronto') {
      let phone = order.customer.phone.replace(/\D/g, '')
      if (phone.length === 10 || phone.length === 11) phone = '55' + phone
      if (phone.length >= 12) {
        const msg = `🚚 Seu pedido saiu para entrega!\n🍔 Pedido #${String(order.number).padStart(3, '0')}\nEm breve chegará até você!`
        window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank')
      }
    }
  }

  return (
    <div className="p-3 sm:p-6 space-y-4 sm:space-y-6 overflow-x-hidden">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ChefHat className="w-6 h-6 text-primary" />
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">COZINHA</h1>
          {activeOrders.some(o => o.status === 'novo') && (
            <span className="px-3 py-1 bg-primary text-primary-foreground text-sm font-bold rounded-full animate-pulse">
              Novo pedido!
            </span>
          )}
        </div>
        <button
          onClick={load}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Atualizar
        </button>
      </div>

      <div>
        <h2 className="text-lg font-bold text-foreground mb-4">
          Pedidos em andamento {activeOrders.length > 0 && `(${activeOrders.length})`}
        </h2>

        {activeOrders.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <ShoppingBag className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p>Nenhum pedido no momento</p>
            <p className="text-sm">Os novos pedidos aparecerão aqui automaticamente</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {activeOrders.map(order => {
              const statusStyle = statusColors[order.status]
              const nextStatus = getNextStatus(order.status)
              return (
                <div key={order.id} className="bg-card border border-border rounded-lg overflow-hidden">
                  <div className="flex items-center justify-between p-4 border-b border-border">
                    <div>
                      <span className="text-xl font-bold text-foreground">
                        #{String(order.number).padStart(3, '0')}
                      </span>
                      <span className="ml-2 text-xs text-muted-foreground">
                        {format(new Date(order.createdAt), 'HH:mm')}
                      </span>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${statusStyle.bg} ${statusStyle.text}`}>
                      {statusLabels[order.status]}
                    </span>
                  </div>

                  <div className="p-4 space-y-3">
                    <div className="space-y-2 text-sm">
                      <p className="font-bold text-foreground">{order.customer.name}</p>
                      <p className="flex items-center gap-2 text-muted-foreground">
                        <Phone className="w-4 h-4" />{order.customer.phone}
                      </p>
                      <p className="flex items-center gap-2 text-muted-foreground">
                        <MapPin className="w-4 h-4" />{order.customer.address}
                      </p>
                      <p className="text-muted-foreground pl-6">{order.customer.neighborhood}</p>
                    </div>

                    <div className="border-t border-border pt-3">
                      <ul className="space-y-1">
                        {order.items.map((item, idx) => (
                          <li key={idx} className="text-sm text-foreground">
                            {item.quantity}x {item.product?.name}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {order.observation && (
                      <div className="border-t border-border pt-3">
                        <p className="text-xs font-bold text-secondary mb-1">OBSERVAÇÃO:</p>
                        <p className="text-sm text-foreground bg-secondary/10 rounded p-2 whitespace-pre-wrap">
                          {order.observation}
                        </p>
                      </div>
                    )}

                    <div className="border-t border-border pt-3">
                      <p className="text-sm text-muted-foreground">
                        Pagamento: <span className="text-foreground capitalize">{order.paymentMethod}</span>
                      </p>
                      <p className="text-lg font-bold text-primary">{fmt(order.total)}</p>
                    </div>
                  </div>

                  <div className="p-4 border-t border-border flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePrint(order)}
                      className="flex-1"
                    >
                      <Printer className="w-4 h-4 mr-2" />
                      Imprimir
                    </Button>
                    {(order.status === 'novo' || order.status === 'preparando') && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPendingCancel(order)}
                        className="border-destructive text-destructive hover:bg-destructive/10"
                      >
                        Cancelar
                      </Button>
                    )}
                    {nextStatus && (
                      <Button
                        size="sm"
                        onClick={() => handleStatusUpdate(order, nextStatus)}
                        className={`flex-1 ${
                          nextStatus === 'preparando'
                            ? 'bg-secondary text-secondary-foreground hover:bg-secondary/90'
                            : nextStatus === 'pronto'
                            ? 'bg-green-600 text-white hover:bg-green-700'
                            : 'bg-muted text-muted-foreground hover:bg-muted/90'
                        }`}
                      >
                        {statusLabels[nextStatus]}
                      </Button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Diálogo de confirmação de cancelamento */}
      {pendingCancel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60" onClick={() => setPendingCancel(null)} />
          <div className="relative bg-card border border-border rounded-xl shadow-xl p-6 w-full max-w-sm mx-4 space-y-4">
            <h2 className="text-lg font-bold text-foreground">Tem certeza que deseja cancelar este pedido?</h2>
            <div className="bg-muted rounded-lg p-3 space-y-1 text-sm">
              <p className="font-bold text-foreground">#{String(pendingCancel.number).padStart(3, '0')} — {pendingCancel.customer.name}</p>
              <p className="text-primary font-bold">{fmt(pendingCancel.total)}</p>
            </div>
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setPendingCancel(null)} className="border-border">
                Voltar
              </Button>
              <Button
                onClick={async () => {
                  await updateOrderStatus(pendingCancel.id, 'cancelado')
                  setPendingCancel(null)
                }}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                Confirmar Cancelamento
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
