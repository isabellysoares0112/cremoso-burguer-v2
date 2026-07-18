'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, Search, CheckCircle2, Clock, ChefHat, Package, Truck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { formatPrice } from '@/lib/utils'

type OrderStatus = 'novo' | 'preparando' | 'pronto' | 'entregue'

const statusSteps: { id: OrderStatus; label: string; icon: React.ElementType }[] = [
  { id: 'novo', label: 'Pedido recebido', icon: Clock },
  { id: 'preparando', label: 'Preparando', icon: ChefHat },
  { id: 'pronto', label: 'Pronto para entrega', icon: Package },
  { id: 'entregue', label: 'Entregue', icon: Truck },
]

function getStatusMessage(status: OrderStatus): string {
  switch (status) {
    case 'novo': return '🕐 Pedido recebido! Aguarde a confirmação.'
    case 'preparando': return '👨‍🍳 Seu pedido está sendo preparado!'
    case 'pronto': return '🍔 Pedido pronto! Já saiu para entrega.'
    case 'entregue': return '✅ Pedido entregue! Bom apetite!'
    default: return ''
  }
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })
}

function parseItems(observacoes: string | null) {
  try {
    if (!observacoes) return []
    const parsed = JSON.parse(observacoes)
    if (Array.isArray(parsed?.items)) return parsed.items
  } catch { /* ignore */ }
  return []
}

export default function AcompanharPedido() {
  const [numeroPedido, setNumeroPedido] = useState('')
  const [telefone, setTelefone] = useState('')
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')

  async function buscarPedido(e: React.FormEvent) {
    e.preventDefault()
    setErro('')
    setOrders([])

    if (!numeroPedido.trim() || !telefone.trim()) {
      setErro('Informe o número do pedido e o telefone usado no pedido.')
      return
    }

    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('numero', numeroPedido.trim())
      params.set('telefone', telefone.trim().replace(/\D/g, ''))

      const res = await fetch(`/api/track?${params}`)
      const json = await res.json()

      if (!res.ok) {
        setErro(json.error || 'Pedido não encontrado. Verifique os dados informados.')
      } else {
        setOrders(json.orders || [])
      }
    } catch {
      setErro('Erro ao buscar pedido. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  // Atualização automática do status: em vez de assinar mudanças em tempo real
  // direto no banco (o que exigiria permitir leitura pública na tabela de
  // pedidos), consultamos de novo a mesma rota /api/track — que já exige
  // número do pedido + telefone — a cada 12s, enquanto o pedido não estiver
  // finalizado.
  useEffect(() => {
    if (orders.length === 0) return
    const algumPendente = orders.some((o) => o.status !== 'entregue' && o.status !== 'cancelado')
    if (!algumPendente) return

    const numero = numeroPedido.trim()
    const tel = telefone.trim().replace(/\D/g, '')
    if (!numero || !tel) return

    const interval = setInterval(async () => {
      try {
        const params = new URLSearchParams()
        params.set('numero', numero)
        params.set('telefone', tel)
        const res = await fetch(`/api/track?${params}`)
        if (!res.ok) return
        const json = await res.json()
        if (json.orders) setOrders(json.orders)
      } catch {
        // silencia erro de rede, tenta de novo no próximo ciclo
      }
    }, 12000)

    return () => clearInterval(interval)
  }, [orders, numeroPedido, telefone])

  return (
    <main className="min-h-screen bg-background">

      {/* HEADER */}
      <header className="w-full border-b bg-background sticky top-0 z-50">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link href="/" className="p-1 rounded hover:bg-muted transition-colors">
            <ArrowLeft size={22} />
          </Link>
          <span className="font-bold text-lg">🍔 Cremoso Burguer — Acompanhar Pedido</span>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-8">

        {/* FORM */}
        <form onSubmit={buscarPedido} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="numero">Número do pedido</Label>
            <Input
              id="numero"
              type="text"
              placeholder="Ex: 12"
              value={numeroPedido}
              onChange={(e) => setNumeroPedido(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="telefone">Telefone usado no pedido</Label>
            <Input
              id="telefone"
              type="text"
              placeholder="Ex: 11999990000"
              value={telefone}
              onChange={(e) => setTelefone(e.target.value)}
              required
            />
          </div>
          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold"
          >
            {loading ? (
              'Buscando...'
            ) : (
              <span className="flex items-center justify-center gap-2">
                <Search size={16} />
                Buscar pedido
              </span>
            )}
          </Button>
        </form>

        {/* ERRO */}
        {erro && (
          <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4 text-sm text-destructive">
            {erro}
          </div>
        )}

        {/* RESULTADOS */}
        {orders.length > 0 && (
          <div className="space-y-6">
            {orders.map((order) => {
              const currentStepIndex = statusSteps.findIndex((s) => s.id === order.status)
              const items = parseItems(order.observacoes)
              const statusMessage = getStatusMessage(order.status as OrderStatus)

              return (
                <div key={order.id} className="border rounded-xl p-5 space-y-5 bg-card">

                  {/* PEDIDO HEADER */}
                  <div>
                    <h2 className="text-xl font-bold text-orange-500">
                      Pedido #{String(order.numero_pedido).padStart(3, '0')}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      {order.cliente_nome} — {order.telefone}
                    </p>
                    {order.endereco && (
                      <p className="text-sm text-muted-foreground">
                        📍 {order.endereco}, {order.bairro}
                      </p>
                    )}
                    {order.created_at && (
                      <p className="text-xs text-muted-foreground mt-1">
                        🕒 {formatDate(order.created_at)}
                      </p>
                    )}
                  </div>

                  {/* TEMPO ESTIMADO */}
                  <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-3 text-sm text-orange-500 font-medium">
                    ⏱ Tempo estimado de entrega: até 60 minutos
                  </div>

                  {/* TIMELINE */}
                  <div className="space-y-0">
                    {statusSteps.map((step, index) => {
                      const isDone = index < currentStepIndex
                      const isActive = index === currentStepIndex
                      const isLast = index === statusSteps.length - 1
                      const Icon = step.icon

                      return (
                        <div key={step.id} className="flex items-start gap-3">
                          <div className="flex flex-col items-center">
                            <div
                              className={`p-2 rounded-full transition-colors z-10 ${
                                isDone
                                  ? 'bg-green-500 text-white'
                                  : isActive
                                  ? 'bg-orange-500 text-white ring-4 ring-orange-500/20'
                                  : 'bg-muted text-muted-foreground'
                              }`}
                            >
                              {isDone ? <CheckCircle2 size={18} /> : <Icon size={18} />}
                            </div>
                            {!isLast && (
                              <div
                                className={`w-0.5 h-6 transition-colors ${
                                  isDone ? 'bg-green-500' : 'bg-border'
                                }`}
                              />
                            )}
                          </div>
                          <div className="pt-2 pb-4">
                            <span
                              className={`text-sm font-medium ${
                                isActive
                                  ? 'text-orange-500 font-bold'
                                  : isDone
                                  ? 'text-foreground'
                                  : 'text-muted-foreground'
                              }`}
                            >
                              {step.label}
                            </span>
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {/* MENSAGEM DE STATUS */}
                  {statusMessage && (
                    <div
                      className={`rounded-lg p-3 text-sm font-medium border ${
                        order.status === 'entregue'
                          ? 'bg-green-500/10 border-green-500/30 text-green-500'
                          : 'bg-orange-500/10 border-orange-500/30 text-orange-500'
                      }`}
                    >
                      {statusMessage}
                    </div>
                  )}

                  {/* ITENS */}
                  {items.length > 0 && (
                    <div className="space-y-2">
                      <h3 className="font-semibold text-sm">Itens do pedido</h3>
                      <ul className="space-y-1">
                        {items.map((item: any, idx: number) => (
                          <li key={idx} className="flex justify-between text-sm">
                            <span>{item.quantity || 1}x {item.name || item.product?.name}</span>
                            <span className="text-muted-foreground">
                              {formatPrice(Number(item.price || item.product?.price || 0) * Number(item.quantity || 1))}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* TOTAIS */}
                  <div className="border-t pt-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span>{formatPrice(Number(order.subtotal || 0))}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Taxa de entrega</span>
                      <span>{formatPrice(Number(order.taxa_entrega || 0))}</span>
                    </div>
                    <div className="flex justify-between font-bold">
                      <span>Total</span>
                      <span className="text-orange-500">
                        {formatPrice(Number(order.total || 0))}
                      </span>
                    </div>
                  </div>

                </div>
              )
            })}
          </div>
        )}

      </div>
    </main>
  )
}
