'use client'

import { X, Minus, Plus, Trash2, ShoppingBag } from 'lucide-react'
import Image from 'next/image'
import { useStore } from '@/lib/store'
import { Button } from '@/components/ui/button'

interface CartProps {
  onCheckout: () => void
}

function cartKey(item: { cartItemId?: string; product: { id: string } }): string {
  return item.cartItemId || item.product.id
}

export function Cart({ onCheckout }: CartProps) {
  const {
    cart,
    isCartOpen,
    setCartOpen,
    updateQuantity,
    removeFromCart,
    getCartSubtotal,
    settings,
  } = useStore()

  const subtotal = getCartSubtotal()
  const deliveryFee = settings.deliveryFee
  const total = subtotal + deliveryFee

  const formatPrice = (price: number) =>
    price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

  if (!isCartOpen) return null

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50"
        onClick={() => setCartOpen(false)}
      />

      {/* Cart Panel */}
      <div className="fixed top-0 right-0 h-full w-full max-w-md bg-card border-l border-border z-50 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-xl font-bold text-foreground">MEU CARRINHO</h2>
          <button
            onClick={() => setCartOpen(false)}
            className="p-2 rounded-full hover:bg-muted transition-colors"
          >
            <X className="w-5 h-5 text-foreground" />
          </button>
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto p-4">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <ShoppingBag className="w-16 h-16 mb-4 opacity-50" />
              <p className="text-lg">Seu carrinho está vazio</p>
              <p className="text-sm">Adicione itens do cardápio</p>
            </div>
          ) : (
            <div className="space-y-4">
              {cart.map((item) => {
                const key = cartKey(item)
                const addonsPrice = (item.addons || []).reduce(
                  (s, sa) => s + sa.addon.price * sa.quantity,
                  0
                )
                const unitPrice = item.product.price + addonsPrice

                return (
                  <div key={key} className="flex gap-4 p-3 bg-muted/50 rounded-lg">
                    {/* Product Image */}
                    <div className="relative w-20 h-20 rounded-lg overflow-hidden flex-shrink-0">
                      <Image
                        src={item.product.image}
                        alt={item.product.name}
                        fill
                        className="object-cover"
                      />
                    </div>

                    {/* Product Info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-foreground text-sm truncate">
                        {item.product.name}
                      </h3>

                      {/* Addons */}
                      {item.addons && item.addons.length > 0 && (
                        <div className="mt-0.5 space-y-0.5">
                          {item.addons.map((sa) => (
                            <p key={sa.addon.id} className="text-xs text-muted-foreground leading-tight">
                              + {sa.quantity > 1 ? `${sa.quantity}x ` : ''}{sa.addon.name}
                            </p>
                          ))}
                        </div>
                      )}

                      {/* Observation */}
                      {item.observation && item.observation.trim() && (
                        <p className="text-xs text-muted-foreground/70 italic mt-0.5 leading-tight line-clamp-2">
                          "{item.observation.trim()}"
                        </p>
                      )}

                      <p className="text-primary font-bold text-sm mt-1">
                        {formatPrice(unitPrice)}
                      </p>

                      {/* Quantity Controls */}
                      <div className="flex items-center gap-2 mt-2">
                        <button
                          onClick={() => updateQuantity(key, item.quantity - 1)}
                          className="w-7 h-7 rounded-full bg-muted flex items-center justify-center hover:bg-border transition-colors"
                        >
                          <Minus className="w-4 h-4 text-foreground" />
                        </button>
                        <span className="w-8 text-center font-bold text-foreground">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(key, item.quantity + 1)}
                          className="w-7 h-7 rounded-full bg-muted flex items-center justify-center hover:bg-border transition-colors"
                        >
                          <Plus className="w-4 h-4 text-foreground" />
                        </button>
                      </div>
                    </div>

                    {/* Remove Button */}
                    <button
                      onClick={() => removeFromCart(key)}
                      className="p-2 text-muted-foreground hover:text-destructive transition-colors self-start"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer with Totals */}
        {cart.length > 0 && (
          <div className="border-t border-border p-4 space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Subtotal</span>
                <span>{formatPrice(subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Taxa de entrega</span>
                <span>{formatPrice(deliveryFee)}</span>
              </div>
              <div className="flex justify-between font-bold text-lg text-foreground pt-2 border-t border-border">
                <span>TOTAL</span>
                <span className="text-primary">{formatPrice(total)}</span>
              </div>
            </div>

            <Button
              onClick={onCheckout}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-6 text-lg glow-yellow"
            >
              FINALIZAR PEDIDO
            </Button>
          </div>
        )}
      </div>
    </>
  )
}
