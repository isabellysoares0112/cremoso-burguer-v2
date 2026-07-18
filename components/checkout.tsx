'use client'

import { useState, useEffect } from 'react'
import { ArrowLeft, Phone, MapPin, CreditCard, Banknote, QrCode, Link, MessageSquare, Loader2, Tag, X, Check } from 'lucide-react'
import { useStore } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PixPayment } from '@/components/pix-payment'
import type { Customer, PaymentMethod, Order } from '@/lib/types'
import { HISTORY_KEY, type HistoryOrder } from '@/components/order-again'

interface CheckoutProps {
  onBack: () => void
  onComplete: (order: Order) => void
}

interface Bairro {
  id: string
  nome: string
  taxa_entrega: number
}

interface CupomValidado {
  id: string
  codigo: string
  desconto_tipo: 'percentual' | 'fixo'
  desconto_valor: number
}

const paymentMethods: { id: PaymentMethod; label: string; icon: React.ElementType }[] = [
  { id: 'pix', label: 'Pix', icon: QrCode },
  { id: 'cartao', label: 'Cartão', icon: CreditCard },
  { id: 'dinheiro', label: 'Dinheiro', icon: Banknote },
  { id: 'link', label: 'Link de pagamento', icon: Link },
]

function saveOrderHistory(order: Order) {
  try {
    const prev: HistoryOrder[] = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]')
    const entry: HistoryOrder = {
      id: order.id,
      number: order.number,
      date: new Date().toISOString(),
      items: order.items.map(i => ({
        product: i.product,
        quantity: i.quantity,
        addons: i.addons || [],
        observation: i.observation || '',
      })),
      total: order.total,
    }
    const updated = [entry, ...prev.filter(o => o.id !== order.id)].slice(0, 10)
    localStorage.setItem(HISTORY_KEY, JSON.stringify(updated))
  } catch { /* ignore */ }
}

export function Checkout({ onBack, onComplete }: CheckoutProps) {
  const { cart, getCartSubtotal, settings, addOrder } = useStore()

  const [customer, setCustomer] = useState<Customer>({
    name: '',
    phone: '',
    address: '',
    neighborhood: '',
  })
  const [selectedPayment, setSelectedPayment] = useState<PaymentMethod>('pix')
  const [observation, setObservation] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [neighborhoods, setNeighborhoods] = useState<Bairro[]>([])
  const [loadingNeighborhoods, setLoadingNeighborhoods] = useState(true)
  const [neighborhoodsError, setNeighborhoodsError] = useState(false)
  const [pixOrder, setPixOrder] = useState<Order | null>(null)
  const [pixTotal, setPixTotal] = useState<number>(0)

  const [couponCode, setCouponCode] = useState('')
  const [couponValidating, setCouponValidating] = useState(false)
  const [couponError, setCouponError] = useState('')
  const [cupomValidado, setCupomValidado] = useState<CupomValidado | null>(null)

  useEffect(() => {
    const fetchBairros = async () => {
      setLoadingNeighborhoods(true)
      setNeighborhoodsError(false)
      try {
        const res = await fetch('/api/admin/bairros')
        const json = await res.json()
        if (!res.ok) throw new Error(json.error || 'Erro ao buscar bairros')
        setNeighborhoods(json.bairros || [])
      } catch (err) {
        console.error(err)
        setNeighborhoodsError(true)
      } finally {
        setLoadingNeighborhoods(false)
      }
    }
    fetchBairros()
  }, [])

  const subtotal = getCartSubtotal()
  const neighborhoodFee =
    neighborhoods.find((n) => n.nome === customer.neighborhood)?.taxa_entrega ??
    settings.deliveryFee

  const discountValue = cupomValidado
    ? cupomValidado.desconto_tipo === 'percentual'
      ? Math.round(subtotal * cupomValidado.desconto_valor) / 100
      : Math.min(cupomValidado.desconto_valor, subtotal)
    : 0

  const total = subtotal + neighborhoodFee - discountValue

  const formatPrice = (price: number) =>
    price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

  const handleValidateCoupon = async () => {
    const code = couponCode.trim().toUpperCase()
    if (!code) return
    setCouponValidating(true)
    setCouponError('')
    try {
      const res = await fetch('/api/cupom/validar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ codigo: code }),
      })
      const json = await res.json()
      if (!res.ok) {
        setCouponError(json.error || 'Cupom inválido')
        setCupomValidado(null)
      } else {
        setCupomValidado(json.cupom)
        setCouponError('')
      }
    } catch {
      setCouponError('Erro ao validar cupom')
    } finally {
      setCouponValidating(false)
    }
  }

  const handleRemoveCoupon = () => {
    setCupomValidado(null)
    setCouponCode('')
    setCouponError('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!customer.name || !customer.phone || !customer.address || !customer.neighborhood) {
      alert('Por favor, preencha todos os campos.')
      return
    }

    if (cupomValidado?.codigo) {
      try {
        const revalRes = await fetch('/api/cupom/validar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ codigo: cupomValidado.codigo }),
        })
        const revalJson = await revalRes.json()
        if (!revalRes.ok) {
          setCupomValidado(null)
          setCouponCode('')
          setCouponError(revalJson.error || 'Cupom inválido')
          alert(`Não foi possível aplicar o cupom: ${revalJson.error || 'Cupom inválido'}. O pedido não foi criado.`)
          return
        }
      } catch {
        setCupomValidado(null)
        setCouponCode('')
        setCouponError('Erro ao revalidar cupom')
        alert('Não foi possível verificar o cupom. Tente novamente.')
        return
      }
    }

    setIsSubmitting(true)

    const order = await addOrder(
      customer,
      selectedPayment,
      neighborhoodFee,
      observation,
      discountValue > 0 ? discountValue : undefined,
      cupomValidado?.codigo,
    )
    if (!order) {
      setIsSubmitting(false)
      alert('Não foi possível criar o pedido. Tente novamente.')
      return
    }

    const itemsList = cart
      .map((item) => {
        const addonsPrice = (item.addons || []).reduce(
          (s, sa) => s + sa.addon.price * sa.quantity,
          0
        )
        const unitPrice = item.product.price + addonsPrice
        const addonsStr =
          item.addons && item.addons.length > 0
            ? `\n   Adicionais: ${item.addons.map((sa) => `${sa.quantity > 1 ? `${sa.quantity}x ` : ''}${sa.addon.name}`).join(', ')}`
            : ''
        const itemObsStr =
          item.observation && item.observation.trim()
            ? `\n   Obs: ${item.observation.trim()}`
            : ''
        return `• ${item.quantity}x ${item.product.name} — ${formatPrice(unitPrice * item.quantity)}${addonsStr}${itemObsStr}`
      })
      .join('\n')

    const globalObsLine = observation.trim()
      ? `\n📝 *Observação geral:*\n${observation.trim()}`
      : ''

    const discountLine = discountValue > 0
      ? `\n💸 *Desconto${cupomValidado ? ` (${cupomValidado.codigo})` : ''}:* -${formatPrice(discountValue)}`
      : ''

    const message = `🍔 *NOVO PEDIDO - CREMOSO BURGUER*

📦 *Pedido:* #${String(order.number).padStart(3, '0')}

👤 *Cliente:* ${customer.name}
📞 *Telefone:* ${customer.phone}
📍 *Endereço:* ${customer.address}
🏘️ *Bairro:* ${customer.neighborhood}

🍟 *Itens:*
${itemsList}${globalObsLine}

🚚 *Taxa de entrega:* ${formatPrice(neighborhoodFee)}${discountLine}
💰 *TOTAL:* ${formatPrice(total)}

💳 *Pagamento:* ${paymentMethods.find((p) => p.id === selectedPayment)?.label}`

    const rawPhone = settings?.whatsapp
    if (!rawPhone) {
      alert('WhatsApp não configurado. Acesse Área da Equipe → Configurações para cadastrar o número.')
      setIsSubmitting(false)
      if (cupomValidado?.codigo) {
        fetch('/api/cupom/usar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ codigo: cupomValidado.codigo }),
        }).catch((err) => { console.error('[cupom/usar] falhou silenciosamente:', err) })
      }
      saveOrderHistory(order)
      onComplete(order)
      return
    }

    const phone = rawPhone.replace(/\D/g, '')
    if (!phone || phone.length < 10) {
      alert('Número de WhatsApp inválido. Verifique nas Configurações.')
      setIsSubmitting(false)
      if (cupomValidado?.codigo) {
        fetch('/api/cupom/usar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ codigo: cupomValidado.codigo }),
        }).catch((err) => { console.error('[cupom/usar] falhou silenciosamente:', err) })
      }
      saveOrderHistory(order)
      onComplete(order)
      return
    }

    if (selectedPayment === 'pix') {
      setIsSubmitting(false)
      console.log(`[PIX Checkout] subtotal: ${subtotal}, taxa: ${neighborhoodFee}, desconto: ${discountValue}, total final: ${total}`)
      setPixTotal(total)
      setPixOrder(order)
      return
    }

    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank')
    setIsSubmitting(false)

    if (cupomValidado?.codigo) {
      fetch('/api/cupom/usar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ codigo: cupomValidado.codigo }),
      }).catch((err) => { console.error('[cupom/usar] falhou silenciosamente:', err) })
    }

    saveOrderHistory(order)
    onComplete(order)
  }

  const handlePixConfirmed = () => {
    if (!pixOrder) return
    const rawPhone = settings?.whatsapp
    if (rawPhone) {
      const phone = rawPhone.replace(/\D/g, '')
      const itemsList = cart
        .map((item) => {
          const addonsPrice = (item.addons || []).reduce(
            (s, sa) => s + sa.addon.price * sa.quantity,
            0
          )
          const unitPrice = item.product.price + addonsPrice
          const addonsStr =
            item.addons && item.addons.length > 0
              ? `\n   Adicionais: ${item.addons.map((sa) => `${sa.quantity > 1 ? `${sa.quantity}x ` : ''}${sa.addon.name}`).join(', ')}`
              : ''
          return `• ${item.quantity}x ${item.product.name} — ${formatPrice(unitPrice * item.quantity)}${addonsStr}`
        })
        .join('\n')
      const neighborhoodFeeVal =
        neighborhoods.find((n) => n.nome === customer.neighborhood)?.taxa_entrega ??
        settings.deliveryFee
      const totalVal = pixTotal
      const discountLine = discountValue > 0
        ? `\n💸 *Desconto${cupomValidado ? ` (${cupomValidado.codigo})` : ''}:* -${formatPrice(discountValue)}`
        : ''
      const message = `🍔 *NOVO PEDIDO - CREMOSO BURGUER*

📦 *Pedido:* #${String(pixOrder.number).padStart(3, '0')}

👤 *Cliente:* ${customer.name}
📞 *Telefone:* ${customer.phone}
📍 *Endereço:* ${customer.address}
🏘️ *Bairro:* ${customer.neighborhood}

🍟 *Itens:*
${itemsList}

🚚 *Taxa de entrega:* ${formatPrice(neighborhoodFeeVal)}${discountLine}
💰 *TOTAL:* ${formatPrice(totalVal)}

💳 *Pagamento:* PIX ✅ Pago`
      if (phone && phone.length >= 10) {
        window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank')
      }
    }
    if (cupomValidado?.codigo) {
      fetch('/api/cupom/usar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ codigo: cupomValidado.codigo }),
      }).catch((err) => { console.error('[cupom/usar PIX] falhou silenciosamente:', err) })
    }

    saveOrderHistory(pixOrder)
    onComplete(pixOrder)
  }

  if (pixOrder) {
    return (
      <div className="fixed inset-0 bg-background z-50 overflow-y-auto">
        <div className="min-h-screen">
          <div className="sticky top-0 bg-background border-b border-border p-4 flex items-center gap-4 z-10">
            <button onClick={() => setPixOrder(null)} className="p-2 rounded-full hover:bg-muted transition-colors">
              <ArrowLeft className="w-5 h-5 text-foreground" />
            </button>
            <h2 className="text-xl font-bold text-foreground">PAGAR COM PIX</h2>
          </div>
          <div className="max-w-lg mx-auto">
            <PixPayment
              total={pixTotal}
              orderNumber={pixOrder.number}
              onPaymentConfirmed={handlePixConfirmed}
            />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-background z-50 overflow-y-auto">
      <div className="min-h-screen">
        {/* Header */}
        <div className="sticky top-0 bg-background border-b border-border p-4 flex items-center gap-4 z-10">
          <button onClick={onBack} className="p-2 rounded-full hover:bg-muted transition-colors">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <h2 className="text-xl font-bold text-foreground">FINALIZAR PEDIDO</h2>
        </div>

        <form onSubmit={handleSubmit} className="p-4 max-w-lg mx-auto pb-10">
          <div className="space-y-6">

            {/* Customer Info */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-foreground">Nome completo</Label>
                <Input
                  id="name"
                  placeholder="João da Silva"
                  value={customer.name}
                  onChange={(e) => setCustomer({ ...customer, name: e.target.value })}
                  className="bg-muted border-border text-foreground placeholder:text-muted-foreground"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone" className="text-foreground flex items-center gap-2">
                  <Phone className="w-4 h-4" /> Telefone
                </Label>
                <Input
                  id="phone"
                  placeholder="(33) 99999-9999"
                  value={customer.phone}
                  onChange={(e) => setCustomer({ ...customer, phone: e.target.value })}
                  className="bg-muted border-border text-foreground placeholder:text-muted-foreground"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="address" className="text-foreground flex items-center gap-2">
                  <MapPin className="w-4 h-4" /> Endereço
                </Label>
                <Input
                  id="address"
                  placeholder="Rua das Flores, 123"
                  value={customer.address}
                  onChange={(e) => setCustomer({ ...customer, address: e.target.value })}
                  className="bg-muted border-border text-foreground placeholder:text-muted-foreground"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="neighborhood" className="text-foreground">Bairro</Label>
                {loadingNeighborhoods ? (
                  <div className="flex items-center gap-2 h-10 px-3 rounded-md bg-muted border border-border text-muted-foreground text-sm">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Carregando bairros...
                  </div>
                ) : neighborhoodsError ? (
                  <div className="text-sm text-destructive bg-destructive/10 border border-destructive/30 rounded-md p-2">
                    Erro ao carregar bairros. Recarregue a página.
                  </div>
                ) : (
                  <select
                    id="neighborhood"
                    value={customer.neighborhood}
                    onChange={(e) => setCustomer({ ...customer, neighborhood: e.target.value })}
                    className="w-full h-10 px-3 rounded-md bg-muted border border-border text-foreground"
                    required
                  >
                    <option value="">Selecione o bairro</option>
                    {neighborhoods.map((n) => (
                      <option key={n.id} value={n.nome}>
                        {n.nome} — Taxa: {formatPrice(Number(n.taxa_entrega))}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* General Observation */}
              <div className="space-y-2">
                <Label htmlFor="observation" className="text-foreground flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" /> Observação geral (opcional)
                </Label>
                <textarea
                  id="observation"
                  rows={3}
                  placeholder={`Ex:\nSem cebola\nCarne bem passada`}
                  value={observation}
                  onChange={(e) => setObservation(e.target.value)}
                  className="w-full px-3 py-2 rounded-md bg-muted border border-border text-foreground placeholder:text-muted-foreground resize-none text-sm"
                />
              </div>
            </div>

            {/* Payment Method */}
            <div className="space-y-4">
              <Label className="text-foreground">Forma de pagamento</Label>
              <div className="grid grid-cols-2 gap-3">
                {paymentMethods.map((method) => (
                  <button
                    key={method.id}
                    type="button"
                    onClick={() => setSelectedPayment(method.id)}
                    className={`p-4 rounded-lg border flex items-center gap-3 transition-all ${
                      selectedPayment === method.id
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border bg-muted text-muted-foreground hover:border-primary/50'
                    }`}
                  >
                    <method.icon className="w-5 h-5" />
                    <span className="font-medium text-sm">{method.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Coupon Code */}
            <div className="space-y-2">
              <Label className="text-foreground flex items-center gap-2">
                <Tag className="w-4 h-4" /> Cupom de desconto (opcional)
              </Label>
              {cupomValidado ? (
                <div className="flex items-center justify-between bg-green-500/10 border border-green-500/40 rounded-lg px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-400" />
                    <span className="font-mono font-bold text-green-400">{cupomValidado.codigo}</span>
                    <span className="text-sm text-green-400">
                      — {cupomValidado.desconto_tipo === 'percentual'
                        ? `${cupomValidado.desconto_valor}% de desconto`
                        : `${formatPrice(cupomValidado.desconto_valor)} de desconto`}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleRemoveCoupon}
                    className="text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Input
                    placeholder="Ex: CREMOSO10"
                    value={couponCode}
                    onChange={(e) => { setCouponCode(e.target.value.toUpperCase()); setCouponError('') }}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleValidateCoupon() } }}
                    className="bg-muted border-border text-foreground placeholder:text-muted-foreground font-mono"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleValidateCoupon}
                    disabled={couponValidating || !couponCode.trim()}
                    className="shrink-0"
                  >
                    {couponValidating ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Aplicar'}
                  </Button>
                </div>
              )}
              {couponError && (
                <p className="text-destructive text-sm">{couponError}</p>
              )}
            </div>

            {/* Order Summary */}
            <div className="bg-muted/50 rounded-lg p-4 space-y-3">
              <h3 className="font-bold text-foreground">Resumo do Pedido</h3>
              {cart.map((item, idx) => {
                const addonsPrice = (item.addons || []).reduce(
                  (s, sa) => s + sa.addon.price * sa.quantity,
                  0
                )
                const unitPrice = item.product.price + addonsPrice
                const key = item.cartItemId || `${item.product.id}-${idx}`
                return (
                  <div key={key} className="space-y-0.5">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        {item.quantity}x {item.product.name}
                      </span>
                      <span className="text-foreground">{formatPrice(unitPrice * item.quantity)}</span>
                    </div>
                    {item.addons && item.addons.length > 0 && (
                      <div className="pl-3">
                        {item.addons.map((sa) => (
                          <p key={sa.addon.id} className="text-xs text-muted-foreground/70">
                            + {sa.quantity > 1 ? `${sa.quantity}x ` : ''}{sa.addon.name}
                          </p>
                        ))}
                      </div>
                    )}
                    {item.observation && item.observation.trim() && (
                      <p className="pl-3 text-xs text-muted-foreground/60 italic">
                        &quot;{item.observation.trim()}&quot;
                      </p>
                    )}
                  </div>
                )
              })}
              {observation.trim() && (
                <div className="border-t border-border pt-3 text-sm">
                  <p className="text-muted-foreground font-medium mb-1">Observação geral:</p>
                  <p className="text-foreground whitespace-pre-wrap">{observation.trim()}</p>
                </div>
              )}
              <div className="border-t border-border pt-3 space-y-2">
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Subtotal</span>
                  <span>{formatPrice(subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Taxa de entrega</span>
                  <span>{formatPrice(neighborhoodFee)}</span>
                </div>
                {discountValue > 0 && (
                  <div className="flex justify-between text-sm text-green-400 font-medium">
                    <span>Desconto {cupomValidado?.codigo ? `(${cupomValidado.codigo})` : ''}</span>
                    <span>-{formatPrice(discountValue)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-lg text-foreground">
                  <span>TOTAL</span>
                  <span className="text-primary">{formatPrice(total)}</span>
                </div>
              </div>
            </div>

            <Button
              type="submit"
              disabled={isSubmitting || loadingNeighborhoods}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-6 text-lg glow-yellow"
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  PROCESSANDO...
                </span>
              ) : loadingNeighborhoods ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  CARREGANDO...
                </span>
              ) : (
                'CONFIRMAR PEDIDO'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
