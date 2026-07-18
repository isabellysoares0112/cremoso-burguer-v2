'use client'

import { useEffect } from 'react'
import { MapPin, Phone, Navigation, CheckCircle2, RefreshCw } from 'lucide-react'
import { useStore } from '@/lib/store'
import { Button } from '@/components/ui/button'
import type { Order } from '@/lib/types'

const paymentLabels: Record<string, string> = {
  pix: 'Pix',
  cartao: 'Cartão',
  dinheiro: 'Dinheiro',
  link: 'Link de pagamento'
}

export function DeliveryPanel() {
  const { orders, updateOrderStatus, loadOrders } = useStore()

  useEffect(() => {
    loadOrders()
    const interval = setInterval(loadOrders, 20000)
    return () => clearInterval(interval)
  }, [loadOrders])

  const readyOrders = orders.filter(o => o.status === 'pronto')

  const formatPrice = (price: number) =>
    price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

  const openRoute = (order: Order) => {
    const address = encodeURIComponent(`${order.customer.address}, ${order.customer.neighborhood}`)
    window.open(`https://www.google.com/maps/search/?api=1&query=${address}`, '_blank')
  }

  const markDelivered = (orderId: string) => {
    updateOrderStatus(orderId, 'entregue')
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-foreground">PAINEL DO ENTREGADOR</h1>
        <button
          onClick={() => loadOrders()}
          className="flex items-center gap-2 text-sm px-3 py-2 rounded-lg bg-muted hover:bg-muted/80 transition-colors text-muted-foreground"
        >
          <RefreshCw className="w-4 h-4" />
          Atualizar
        </button>
      </div>

      {readyOrders.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground bg-card border border-border rounded-lg">
          <p className="text-lg font-medium">Nenhum pedido pronto para entrega</p>
          <p className="text-sm mt-2">Os pedidos prontos aparecerão aqui automaticamente</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {readyOrders.map((order) => (
            <div
              key={order.id}
              className="bg-card border border-border rounded-lg overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-border">
                <span className="text-xl font-bold text-foreground">
                  #{String(order.number).padStart(3, '0')}
                </span>
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-green-600 text-white">
                  PRONTO
                </span>
              </div>

              {/* Content */}
              <div className="p-4 space-y-4">
                <div className="space-y-3">
                  <p className="font-bold text-lg text-foreground">{order.customer.name}</p>

                  <a
                    href={`tel:${order.customer.phone.replace(/\D/g, '')}`}
                    className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors"
                  >
                    <Phone className="w-4 h-4 flex-shrink-0" />
                    <span>{order.customer.phone}</span>
                  </a>

                  <div className="flex items-start gap-2 text-muted-foreground">
                    <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <div>
                      <p>{order.customer.address}</p>
                      <p className="font-medium text-foreground">{order.customer.neighborhood}</p>
                    </div>
                  </div>
                </div>

                {/* Items */}
                <div className="border-t border-border pt-3">
                  <p className="text-sm text-muted-foreground mb-2">Itens:</p>
                  <ul className="space-y-1">
                    {order.items.map((item, idx) => (
                      <li key={idx} className="text-sm text-foreground">
                        {(item as { quantity: number }).quantity}x {(item as { product: { name: string } }).product?.name}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Observation */}
                {order.observation && (
                  <div className="border-t border-border pt-3">
                    <p className="text-sm text-muted-foreground mb-1">Observação:</p>
                    <p className="text-sm text-foreground whitespace-pre-wrap bg-muted/50 rounded p-2">
                      {order.observation}
                    </p>
                  </div>
                )}

                {/* Payment & Total */}
                <div className="border-t border-border pt-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{paymentLabels[order.paymentMethod] ?? order.paymentMethod}</p>
                    {order.paymentMethod === 'dinheiro' && (
                      <p className="text-xs text-secondary">Pagamento na entrega</p>
                    )}
                    {order.paymentMethod === 'pix' && (
                      <p className="text-xs text-green-500">Pago</p>
                    )}
                  </div>
                  <p className="text-xl font-bold text-primary">{formatPrice(order.total)}</p>
                </div>
              </div>

              {/* Actions */}
              <div className="p-4 border-t border-border space-y-2">
                <Button
                  onClick={() => openRoute(order)}
                  variant="outline"
                  className="w-full border-primary text-primary hover:bg-primary hover:text-primary-foreground"
                >
                  <Navigation className="w-4 h-4 mr-2" />
                  Abrir rota
                </Button>
                <Button
                  onClick={() => markDelivered(order.id)}
                  className="w-full bg-green-600 hover:bg-green-700 text-white"
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Entrega realizada
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
