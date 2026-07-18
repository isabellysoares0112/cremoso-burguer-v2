'use client'

import { useEffect, useState } from 'react'
import { Search, Filter, MessageCircle } from 'lucide-react'
import { useStore } from '@/lib/store'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { subscribeToOrders } from '@/lib/api'
import type { OrderStatus } from '@/lib/types'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { getWhatsAppMessage, openWhatsApp } from '@/lib/whatsapp-messages'

const statusColors: Record<OrderStatus, { bg: string; text: string }> = {
  novo: { bg: 'bg-primary', text: 'text-primary-foreground' },
  preparando: { bg: 'bg-secondary', text: 'text-secondary-foreground' },
  pronto: { bg: 'bg-green-600', text: 'text-white' },
  entregue: { bg: 'bg-muted', text: 'text-muted-foreground' },
  cancelado: { bg: 'bg-red-600', text: 'text-white' },
}

const statusLabels: Record<OrderStatus, string> = {
  novo: 'Novo',
  preparando: 'Preparando',
  pronto: 'Pronto',
  entregue: 'Entregue',
  cancelado: 'Cancelado',
}

export function OrdersPanel() {
  const { orders, updateOrderStatus, loadOrders } = useStore()
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all'>('all')
  const [pendingCancel, setPendingCancel] = useState<{ orderId: string; previousStatus: OrderStatus } | null>(null)

  useEffect(() => {
    loadOrders()
    const unsubscribe = subscribeToOrders(() => {
      loadOrders()
    })
    return () => {
      unsubscribe()
    }
  }, [loadOrders])

  const filteredOrders = orders.filter(order => {
    const matchesSearch = 
      order.customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customer.phone.includes(searchTerm) ||
      String(order.number).includes(searchTerm)
    
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter
    
    return matchesSearch && matchesStatus
  })

  const formatPrice = (price: number) => {
    return price.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    })
  }

  const handleStatusChange = (orderId: string, newStatus: OrderStatus, currentStatus: OrderStatus) => {
    if (newStatus === 'cancelado') {
      setPendingCancel({ orderId, previousStatus: currentStatus })
      return
    }
    updateOrderStatus(orderId, newStatus)
  }

  const confirmCancel = async () => {
    if (!pendingCancel) return
    await updateOrderStatus(pendingCancel.orderId, 'cancelado')
    setPendingCancel(null)
  }

  const dismissCancel = () => setPendingCancel(null)

  const handleWhatsApp = (order: Parameters<typeof getWhatsAppMessage>[0], status: OrderStatus) => {
    const msg = getWhatsAppMessage(order, status)
    if (!msg) return
    openWhatsApp(order.customer.phone, msg)
  }

  const whatsappStatuses: OrderStatus[] = ['preparando', 'pronto', 'entregue']

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-foreground mb-6">PEDIDOS</h1>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nome, telefone ou número do pedido..."
            className="pl-10 bg-muted border-border"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as OrderStatus | 'all')}
            className="h-10 px-3 rounded-md bg-muted border border-border text-foreground"
          >
            <option value="all">Todos os status</option>
            <option value="novo">Novo</option>
            <option value="preparando">Preparando</option>
            <option value="pronto">Pronto</option>
            <option value="entregue">Entregue</option>
            <option value="cancelado">Cancelado</option>
          </select>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted">
              <tr>
                <th className="text-left p-4 text-foreground font-bold">#</th>
                <th className="text-left p-4 text-foreground font-bold">Cliente</th>
                <th className="text-left p-4 text-foreground font-bold hidden md:table-cell">Itens</th>
                <th className="text-left p-4 text-foreground font-bold">Total</th>
                <th className="text-left p-4 text-foreground font-bold">Status</th>
                <th className="text-left p-4 text-foreground font-bold hidden lg:table-cell">Data</th>
                <th className="text-left p-4 text-foreground font-bold hidden lg:table-cell">WhatsApp</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-muted-foreground">
                    Nenhum pedido encontrado
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => {
                  const statusStyle = statusColors[order.status]

                  return (
                    <tr key={order.id} className="border-t border-border hover:bg-muted/50">
                      <td className="p-4 font-bold text-foreground">
                        #{String(order.number).padStart(3, '0')}
                      </td>
                      <td className="p-4">
                        <p className="font-bold text-foreground">{order.customer.name}</p>
                        <p className="text-sm text-muted-foreground">{order.customer.phone}</p>
                      </td>
                      <td className="p-4 hidden md:table-cell">
                        <p className="text-sm text-muted-foreground">
                          {order.items.map(i => `${i.quantity}x ${i.product.name}`).join(', ')}
                        </p>
                      </td>
                      <td className="p-4 font-bold text-primary">
                        {formatPrice(order.total)}
                      </td>
                      <td className="p-4">
                        <select
                          value={order.status}
                          onChange={(e) => handleStatusChange(order.id, e.target.value as OrderStatus, order.status)}
                          className={`px-3 py-1 rounded-full text-xs font-bold border-0 ${statusStyle.bg} ${statusStyle.text}`}
                        >
                          <option value="novo">Novo</option>
                          <option value="preparando">Preparando</option>
                          <option value="pronto">Pronto</option>
                          <option value="entregue">Entregue</option>
                          {order.status !== 'entregue' && (
                            <option value="cancelado">Cancelado</option>
                          )}
                        </select>
                      </td>
                      <td className="p-4 text-muted-foreground text-sm hidden lg:table-cell">
                        {format(new Date(order.createdAt), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                      </td>
                      <td className="p-4 hidden lg:table-cell">
                        <div className="flex gap-1">
                          {whatsappStatuses.map(s => (
                            <button
                              key={s}
                              onClick={() => handleWhatsApp(order, s)}
                              title={`Enviar WhatsApp: ${statusLabels[s]}`}
                              className="p-1.5 rounded-lg bg-green-600/10 hover:bg-green-600/20 text-green-500 transition-colors flex items-center gap-1 text-xs font-medium"
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                              <span className="hidden xl:inline">{statusLabels[s]}</span>
                            </button>
                          ))}
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary */}
      <div className="mt-6 grid sm:grid-cols-4 gap-4">
        {(['novo', 'preparando', 'pronto', 'entregue', 'cancelado'] as OrderStatus[]).map((status) => {
          const count = orders.filter(o => o.status === status).length
          const style = statusColors[status]
          
          return (
            <div
              key={status}
              className="bg-card border border-border rounded-lg p-4 flex items-center justify-between"
            >
              <span className="text-muted-foreground capitalize">{statusLabels[status]}</span>
              <span className={`px-3 py-1 rounded-full text-sm font-bold ${style.bg} ${style.text}`}>
                {count}
              </span>
            </div>
          )
        })}
      </div>

      {/* Confirmation dialog — cancelamento */}
      {pendingCancel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60" onClick={dismissCancel} />
          <div className="relative bg-card border border-border rounded-xl shadow-xl p-6 w-full max-w-sm mx-4 space-y-4">
            <h2 className="text-lg font-bold text-foreground">Cancelar pedido?</h2>
            <p className="text-sm text-muted-foreground">
              Esta ação não pode ser desfeita. O pedido será marcado como cancelado e removido dos cálculos financeiros.
            </p>
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={dismissCancel} className="border-border">
                Manter pedido
              </Button>
              <Button onClick={confirmCancel} className="bg-red-600 hover:bg-red-700 text-white">
                Confirmar cancelamento
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
