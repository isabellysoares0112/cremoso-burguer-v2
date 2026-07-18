'use client'

import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, CheckCircle2, Clock, ChefHat, Package, Truck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { Order, OrderStatus, EstimatedMinutes } from '@/lib/types'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface OrderTrackingProps {
  order: Order
  onBack: () => void
  onDelivered?: () => void
}

const statusSteps: { id: OrderStatus; label: string; icon: React.ElementType; description: string }[] = [
  { id: 'novo',       label: 'Novo',       icon: Clock,    description: 'Seu pedido foi recebido' },
  { id: 'preparando', label: 'Preparando', icon: ChefHat,  description: 'Estamos preparando seu pedido' },
  { id: 'pronto',     label: 'Pronto',     icon: Package,  description: 'Seu pedido está pronto para entrega' },
  { id: 'entregue',   label: 'Entregue',   icon: Truck,    description: 'Seu pedido foi entregue' },
]

const DEFAULT_MINUTES: EstimatedMinutes = { novo: 40, preparando: 30, pronto: 15 }

export function OrderTracking({ order, onBack, onDelivered }: OrderTrackingProps) {
  const [currentStatus, setCurrentStatus] = useState<OrderStatus>(order.status)
  const [lastUpdate, setLastUpdate] = useState(new Date())
  const [estMinutes, setEstMinutes] = useState<EstimatedMinutes>(DEFAULT_MINUTES)
  const deliveredCalled = useRef(false)

  // Load configurable estimated minutes from settings
  useEffect(() => {
    fetch('/api/admin/settings')
      .then(r => r.ok ? r.json() : null)
      .then(json => {
        const em = json?.settings?.estimatedMinutes
        if (em?.novo && em?.preparando && em?.pronto) setEstMinutes(em)
      })
      .catch(() => { /* use defaults */ })
  }, [])

  useEffect(() => {
    if (!order?.id) return

    async function poll() {
      try {
        const res = await fetch(`/api/track/${order.id}`)
        if (res.ok) {
          const json = await res.json()
          if (json.order?.status) {
            const s = json.order.status as OrderStatus
            setCurrentStatus(s)
            setLastUpdate(new Date())
            if (s === 'entregue' && !deliveredCalled.current) {
              deliveredCalled.current = true
              onDelivered?.()
            }
          }
        }
      } catch { /* silent */ }
    }

    poll()
    const interval = setInterval(poll, 15000)
    return () => clearInterval(interval)
  }, [order?.id, onDelivered])

  const currentStepIndex = statusSteps.findIndex((s) => s.id === currentStatus)

  const estMins: number | null = currentStatus === 'entregue'
    ? null
    : estMinutes[currentStatus as keyof EstimatedMinutes] ?? null

  const formatPrice = (price: number) =>
    price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

  const estLabel = (() => {
    if (estMins === null) return null
    const now = new Date()
    now.setMinutes(now.getMinutes() + estMins)
    return now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  })()

  return (
    <div className="fixed inset-0 bg-background z-50 overflow-y-auto">
      <div className="min-h-screen">

        {/* Header */}
        <div className="sticky top-0 bg-background border-b border-border p-4 flex items-center gap-4">
          <button onClick={onBack} className="p-2 rounded-full hover:bg-muted transition-colors">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <h2 className="text-xl font-bold text-foreground">ACOMPANHE SEU PEDIDO</h2>
        </div>

        <div className="p-4 max-w-lg mx-auto">

          {/* Order Number */}
          <div className="text-center mb-6">
            <h3 className="text-3xl font-black text-primary mb-2">
              Pedido #{String(order.number).padStart(3, '0')}
            </h3>
            <p className="text-muted-foreground text-sm">
              Realizado em {format(new Date(order.createdAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
            </p>
          </div>

          {/* Status Message + ETA */}
          <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 mb-6 text-center space-y-2">
            {currentStatus === 'novo' && (
              <p className="font-semibold text-primary">Seu pedido foi recebido e está aguardando confirmação 🍔</p>
            )}
            {currentStatus === 'preparando' && (
              <p className="font-semibold text-primary">Estamos preparando seu pedido com muito carinho 👨‍🍳</p>
            )}
            {currentStatus === 'pronto' && (
              <p className="font-semibold text-primary">Pedido pronto! Nosso entregador já está saindo 🛵</p>
            )}
            {currentStatus === 'entregue' && (
              <p className="font-semibold text-green-500">Pedido entregue! Bom apetite 🍔</p>
            )}

            {estLabel && (
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Clock className="w-3.5 h-3.5" />
                <span>Previsão de entrega: <strong className="text-foreground">{estLabel}</strong></span>
                <span className="text-xs">(~{estMins} min)</span>
              </div>
            )}
          </div>

          {/* Status Timeline */}
          <div className="relative mb-8">
            {statusSteps.map((step, index) => {
              const isCompleted = index < currentStepIndex
              const isCurrent = index === currentStepIndex

              return (
                <div key={step.id} className="flex gap-4 mb-6 last:mb-0">
                  <div className="flex flex-col items-center">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      isCompleted || isCurrent
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground'
                    }`}>
                      {isCompleted
                        ? <CheckCircle2 className="w-5 h-5" />
                        : <step.icon className="w-5 h-5" />}
                    </div>
                    {index < statusSteps.length - 1 && (
                      <div className={`w-0.5 h-12 ${isCompleted ? 'bg-primary' : 'bg-muted'}`} />
                    )}
                  </div>

                  <div className="flex-1 pb-6">
                    <h4 className={`font-bold ${
                      isCurrent ? 'text-primary' : isCompleted ? 'text-foreground' : 'text-muted-foreground'
                    }`}>{step.label}</h4>
                    <p className="text-muted-foreground text-sm">{step.description}</p>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Order Details */}
          <div className="bg-card border border-border rounded-lg p-4 mb-6">
            <h4 className="font-bold text-foreground mb-4">Detalhes do Pedido</h4>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Cliente</span>
                <span className="text-foreground">{order.customer.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Telefone</span>
                <span className="text-foreground">{order.customer.phone}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Endereço</span>
                <span className="text-foreground">{order.customer.address}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Bairro</span>
                <span className="text-foreground">{order.customer.neighborhood}</span>
              </div>

              <div className="border-t border-border pt-3 mt-3">
                <p className="text-muted-foreground mb-2">Itens:</p>
                {order.items.map((item, i) => (
                  <div key={item.product.id + i} className="flex justify-between">
                    <span className="text-foreground">{item.quantity}x {item.product.name}</span>
                    <span className="text-foreground">{formatPrice(item.product.price * item.quantity)}</span>
                  </div>
                ))}
              </div>

              <div className="border-t border-border pt-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Taxa de entrega</span>
                  <span className="text-foreground">{formatPrice(order.deliveryFee)}</span>
                </div>
                {order.discount && order.discount > 0 && (
                  <div className="flex justify-between text-green-400">
                    <span>Desconto {order.couponCode ? `(${order.couponCode})` : ''}</span>
                    <span>-{formatPrice(order.discount)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-lg mt-2">
                  <span className="text-foreground">TOTAL</span>
                  <span className="text-primary">{formatPrice(order.total)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Auto-update notice */}
          <p className="text-center text-muted-foreground text-xs">
            Atualizando automaticamente a cada 15 segundos
            <br />
            Última atualização: {format(lastUpdate, 'HH:mm:ss')}
          </p>

          <Button
            onClick={onBack}
            variant="outline"
            className="w-full mt-6 border-primary text-primary hover:bg-primary hover:text-primary-foreground"
          >
            Voltar ao Cardápio
          </Button>
        </div>
      </div>
    </div>
  )
}
