'use client'

import { useEffect, useCallback, useState, useRef, useMemo } from 'react'
import { ShoppingBag, Phone, MapPin, Printer, RefreshCw, ChefHat, Maximize, Minimize, Volume2, VolumeX } from 'lucide-react'
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

// As 3 colunas do quadro do KDS, na ordem do fluxo de preparo.
const KDS_COLUMNS: { status: OrderStatus; title: string }[] = [
  { status: 'novo', title: 'NOVOS' },
  { status: 'preparando', title: 'EM PREPARO' },
  { status: 'pronto', title: 'PRONTOS' },
]

const MUTE_KEY = 'cremoso-kds-mute'

function getNextStatus(s: OrderStatus): OrderStatus | null {
  const flow: OrderStatus[] = ['novo', 'preparando', 'pronto', 'entregue']
  const idx = flow.indexOf(s)
  return idx < flow.length - 1 ? flow[idx + 1] : null
}

function minutesSince(date: Date | string, now: number): number {
  return Math.max(0, Math.floor((now - new Date(date).getTime()) / 60000))
}

// Cor do cronômetro escala conforme o pedido vai envelhecendo na fila —
// ajuda a enxergar de longe quais pedidos estão atrasando.
function elapsedStyle(mins: number): string {
  if (mins >= 15) return 'text-destructive font-bold animate-pulse'
  if (mins >= 8) return 'text-amber-500 font-bold'
  return 'text-muted-foreground'
}

// Beep curto gerado na hora via Web Audio API — sem precisar de nenhum
// arquivo de áudio externo.
function playBeep() {
  try {
    const Ctx = window.AudioContext || (window as any).webkitAudioContext
    const ctx = new Ctx()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.value = 880
    gain.gain.setValueAtTime(0.0001, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.5)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start()
    osc.stop(ctx.currentTime + 0.55)
    // segundo bipe, pra chamar mais atenção
    setTimeout(() => {
      const osc2 = ctx.createOscillator()
      const gain2 = ctx.createGain()
      osc2.type = 'sine'
      osc2.frequency.value = 1100
      gain2.gain.setValueAtTime(0.0001, ctx.currentTime)
      gain2.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + 0.02)
      gain2.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.4)
      osc2.connect(gain2)
      gain2.connect(ctx.destination)
      osc2.start()
      osc2.stop(ctx.currentTime + 0.45)
    }, 250)
  } catch {
    // navegador sem suporte a Web Audio — ignora silenciosamente
  }
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

function OrderCard({
  order,
  now,
  onPrint,
  onCancel,
  onAdvance,
}: {
  order: Order
  now: number
  onPrint: (o: Order) => void
  onCancel: (o: Order) => void
  onAdvance: (o: Order, next: OrderStatus) => void
}) {
  const statusStyle = statusColors[order.status]
  const nextStatus = getNextStatus(order.status)
  const mins = minutesSince(order.createdAt, now)
  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <div className="flex items-center justify-between p-3 border-b border-border">
        <div>
          <span className="text-lg font-bold text-foreground">
            #{String(order.number).padStart(3, '0')}
          </span>
          <span className="ml-2 text-xs text-muted-foreground">
            {format(new Date(order.createdAt), 'HH:mm')}
          </span>
        </div>
        <span className={`text-sm ${elapsedStyle(mins)}`}>
          há {mins} min
        </span>
      </div>

      <div className="p-3 space-y-3">
        <div className="space-y-1 text-sm">
          <p className="font-bold text-foreground">{order.customer.name}</p>
          <p className="flex items-center gap-2 text-muted-foreground text-xs">
            <Phone className="w-3.5 h-3.5" />{order.customer.phone}
          </p>
          <p className="flex items-center gap-2 text-muted-foreground text-xs">
            <MapPin className="w-3.5 h-3.5" />{order.customer.address} — {order.customer.neighborhood}
          </p>
        </div>

        <div className="border-t border-border pt-2">
          <ul className="space-y-1">
            {order.items.map((item, idx) => (
              <li key={idx} className="text-sm text-foreground font-medium">
                {item.quantity}x {item.product?.name}
              </li>
            ))}
          </ul>
        </div>

        {order.observation && (
          <div className="border-t border-border pt-2">
            <p className="text-xs font-bold text-secondary mb-1">OBSERVAÇÃO:</p>
            <p className="text-sm text-foreground bg-secondary/10 rounded p-2 whitespace-pre-wrap">
              {order.observation}
            </p>
          </div>
        )}

        <div className="border-t border-border pt-2 flex items-center justify-between">
          <span className="text-xs text-muted-foreground capitalize">{order.paymentMethod}</span>
          <span className="font-bold text-primary">{fmt(order.total)}</span>
        </div>
      </div>

      <div className="p-3 border-t border-border flex gap-2">
        <Button variant="outline" size="sm" onClick={() => onPrint(order)}>
          <Printer className="w-4 h-4" />
        </Button>
        {(order.status === 'novo' || order.status === 'preparando') && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onCancel(order)}
            className="border-destructive text-destructive hover:bg-destructive/10"
          >
            Cancelar
          </Button>
        )}
        {nextStatus && (
          <Button
            size="sm"
            onClick={() => onAdvance(order, nextStatus)}
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
}

export function KitchenView() {
  const { orders, loadOrders, updateOrderStatus } = useStore()
  const [pendingCancel, setPendingCancel] = useState<Order | null>(null)
  const [now, setNow] = useState(() => Date.now())
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [muted, setMuted] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const seenNovoIds = useRef<Set<string> | null>(null)

  useEffect(() => {
    setMuted(localStorage.getItem(MUTE_KEY) === '1')
  }, [])

  const toggleMute = () => {
    setMuted((prev) => {
      const next = !prev
      localStorage.setItem(MUTE_KEY, next ? '1' : '0')
      return next
    })
  }

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

  // Cronômetro dos cards: atualiza a cada 30s (só o relógio, não recarrega pedidos).
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', handler)
    return () => document.removeEventListener('fullscreenchange', handler)
  }, [])

  const toggleFullscreen = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen()
    } else {
      containerRef.current?.requestFullscreen?.()
    }
  }

  const activeOrders = orders.filter(o => o.status !== 'entregue' && o.status !== 'cancelado')

  // Alerta sonoro: toca quando um pedido "novo" aparece que a gente ainda não tinha visto.
  // Na primeira carga da tela não toca (evita barulho ao simplesmente abrir a página).
  useEffect(() => {
    const currentNovoIds = new Set(orders.filter(o => o.status === 'novo').map(o => o.id))

    if (seenNovoIds.current === null) {
      seenNovoIds.current = currentNovoIds
      return
    }

    const hasNewOrder = [...currentNovoIds].some(id => !seenNovoIds.current!.has(id))
    if (hasNewOrder && !muted) {
      playBeep()
    }
    seenNovoIds.current = currentNovoIds
  }, [orders, muted])

  const columns = useMemo(() => {
    const byStatus: Record<string, Order[]> = { novo: [], preparando: [], pronto: [] }
    for (const o of activeOrders) {
      if (byStatus[o.status]) byStatus[o.status].push(o)
    }
    // Mais antigo primeiro — o pedido que está esperando há mais tempo aparece no topo.
    for (const key of Object.keys(byStatus)) {
      byStatus[key].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    }
    return byStatus
  }, [activeOrders])

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
    <div ref={containerRef} className="p-3 sm:p-6 space-y-4 sm:space-y-6 overflow-x-hidden bg-background min-h-screen">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <ChefHat className="w-6 h-6 text-primary" />
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">COZINHA (KDS)</h1>
          {columns.novo.length > 0 && (
            <span className="px-3 py-1 bg-primary text-primary-foreground text-sm font-bold rounded-full animate-pulse">
              {columns.novo.length} novo{columns.novo.length > 1 ? 's' : ''}!
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={toggleMute}
            title={muted ? 'Ativar som de pedido novo' : 'Silenciar som de pedido novo'}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors"
          >
            {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
          <button
            onClick={toggleFullscreen}
            title={isFullscreen ? 'Sair da tela cheia' : 'Tela cheia (bom pra deixar num tablet montado)'}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors"
          >
            {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
          </button>
          <button
            onClick={load}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Atualizar
          </button>
        </div>
      </div>

      {activeOrders.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <ShoppingBag className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p>Nenhum pedido no momento</p>
          <p className="text-sm">Os novos pedidos aparecerão aqui automaticamente</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {KDS_COLUMNS.map(({ status, title }) => {
            const list = columns[status] || []
            const style = statusColors[status]
            return (
              <div key={status} className="space-y-3">
                <div className={`flex items-center justify-between px-3 py-2 rounded-lg ${style.bg} ${style.text}`}>
                  <span className="font-bold text-sm tracking-wide">{title}</span>
                  <span className="font-bold text-sm">{list.length}</span>
                </div>
                <div className="space-y-3">
                  {list.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-6">Nenhum pedido aqui</p>
                  ) : (
                    list.map(order => (
                      <OrderCard
                        key={order.id}
                        order={order}
                        now={now}
                        onPrint={handlePrint}
                        onCancel={setPendingCancel}
                        onAdvance={handleStatusUpdate}
                      />
                    ))
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Diálogo de confirmação de cancelamento */}
      {pendingCancel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60" onClick={() => setPendingCancel(null)} />
          <div className="relative bg-card border border-border rounded-xl shadow-xl p-6 w-full max-w-sm mx-4 space-y-4">
            <h2 className="text-lg font-bold text-foreground">Tem certeza que deseja cancelar este pedido?</h2>
            <div className="bg-muted rounded-lg p-3 space-y-1 text-sm">
              <p className="font-bold text-foreground">#{String(pendingCancel.number).padStart(3, '0')} — {pendingCancel.customer.name}</p>
              <p className="text-primary font-bold">
                {pendingCancel.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </p>
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
