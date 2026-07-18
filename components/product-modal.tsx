'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import { X, Plus, Minus, Search, ShoppingCart, Loader2 } from 'lucide-react'
import { useStore } from '@/lib/store'
import type { Product, Addon, SelectedAddon } from '@/lib/types'

const BEBIDAS_SLUG = 'bebidas'
const MAX_ADDON_QTY = 3

interface ProductModalProps {
  product: Product | null
  onClose: () => void
}

export function ProductModal({ product, onClose }: ProductModalProps) {
  const { addToCartWithOptions, setCartOpen } = useStore()
  const [selectedAddons, setSelectedAddons] = useState<Record<string, number>>({})
  const [observation, setObservation] = useState('')
  const [search, setSearch] = useState('')
  const [addons, setAddons] = useState<Addon[]>([])
  const [loadingAddons, setLoadingAddons] = useState(false)

  const isBebidas = product?.category === BEBIDAS_SLUG

  const fetchAddons = useCallback(async (categorySlug: string) => {
    if (!categorySlug || categorySlug === BEBIDAS_SLUG) {
      setAddons([])
      return
    }
    setLoadingAddons(true)
    try {
      const res = await fetch(
        `/api/admin/adicionais?categoria_slug=${encodeURIComponent(categorySlug)}`
      )
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Erro')
      const active: Addon[] = (json.adicionais ?? [])
        .filter((a: { ativo: boolean }) => a.ativo)
        .map((a: { id: string; nome: string; preco: number }) => ({
          id: a.id,
          name: a.nome,
          price: a.preco,
        }))
      setAddons(active)
    } catch {
      setAddons([])
    } finally {
      setLoadingAddons(false)
    }
  }, [])

  useEffect(() => {
    if (product) {
      setSelectedAddons({})
      setObservation('')
      setSearch('')
      fetchAddons(product.category)
    }
  }, [product?.id, product?.category, fetchAddons])

  useEffect(() => {
    if (product) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [product])

  if (!product) return null

  const filteredAddons = addons.filter((a) =>
    a.name.toLowerCase().includes(search.toLowerCase())
  )

  const selectedAddonsList: SelectedAddon[] = Object.entries(selectedAddons)
    .filter(([, qty]) => qty > 0)
    .map(([id, qty]) => {
      const addon = addons.find((a) => a.id === id)
      if (!addon) return null
      return { addon, quantity: qty }
    })
    .filter(Boolean) as SelectedAddon[]

  const addonsTotalCount = Object.values(selectedAddons).reduce((s, q) => s + q, 0)
  const addonsTotalPrice = selectedAddonsList.reduce(
    (s, sa) => s + sa.addon.price * sa.quantity,
    0
  )
  const totalPrice = product.price + addonsTotalPrice

  const formatPrice = (price: number) =>
    price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

  const incrementAddon = (addonId: string) => {
    setSelectedAddons((prev) => {
      const current = prev[addonId] || 0
      if (current >= MAX_ADDON_QTY) return prev
      return { ...prev, [addonId]: current + 1 }
    })
  }

  const decrementAddon = (addonId: string) => {
    setSelectedAddons((prev) => {
      const current = prev[addonId] || 0
      if (current <= 0) return prev
      const next = current - 1
      const updated = { ...prev, [addonId]: next }
      if (next === 0) delete updated[addonId]
      return updated
    })
  }

  const handleAddToCart = () => {
    addToCartWithOptions(product, selectedAddonsList, observation.trim())
    setCartOpen(true)
    onClose()
  }

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50"
        style={{ animation: 'fadeIn 200ms ease' }}
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className="fixed inset-x-0 bottom-0 z-50 flex flex-col bg-card rounded-t-2xl shadow-2xl border-t border-border sm:inset-0 sm:m-auto sm:max-w-lg sm:max-h-[90vh] sm:rounded-2xl sm:border"
        style={{
          maxHeight: '92dvh',
          animation: 'slideUp 280ms cubic-bezier(0.32, 0.72, 0, 1)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-black/60 flex items-center justify-center hover:bg-black/80 transition-colors"
        >
          <X className="w-4 h-4 text-white" />
        </button>

        {/* Product Image */}
        <div
          className="relative w-full flex-shrink-0 overflow-hidden rounded-t-2xl bg-muted sm:rounded-t-2xl"
          style={{ aspectRatio: '16/7' }}
        >
          <Image
            src={product.image}
            alt={product.name}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 100vw, 512px"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-card via-card/20 to-transparent" />
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto overscroll-contain">

          {/* Product Info */}
          <div className="px-5 pt-5 pb-2">
            <h2 className="text-xl font-black text-foreground leading-tight">{product.name}</h2>
            <p className="text-2xl font-black text-primary mt-1">{formatPrice(product.price)}</p>
            {product.description && (
              <p className="text-muted-foreground text-sm mt-2 leading-relaxed">
                {product.description}
              </p>
            )}
          </div>

          {/* Addons Section — only for non-bebidas */}
          {!isBebidas && (
            <>
              <div className="mx-5 border-t border-border my-5" />

              <div className="px-5">
                {/* Header */}
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-foreground text-base">Adicionais</h3>
                  {addonsTotalCount > 0 && (
                    <span className="text-xs bg-primary/20 text-primary font-semibold px-2.5 py-0.5 rounded-full">
                      {addonsTotalCount} selecionado{addonsTotalCount !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>

                {loadingAddons ? (
                  <div className="flex items-center justify-center gap-2 py-8 text-muted-foreground text-sm">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Carregando adicionais...
                  </div>
                ) : addons.length === 0 ? (
                  <p className="text-center text-muted-foreground text-sm py-6">
                    Nenhum adicional disponível para esta categoria.
                  </p>
                ) : (
                  <>
                    {/* Search */}
                    <div className="relative mb-4">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                      <input
                        type="text"
                        placeholder="Pesquisar adicionais..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full h-10 pl-9 pr-4 rounded-lg bg-muted border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
                      />
                    </div>

                    {/* Addon List */}
                    <div className="divide-y divide-border/50">
                      {filteredAddons.map((addon) => {
                        const qty = selectedAddons[addon.id] || 0
                        const isSelected = qty > 0
                        return (
                          <div
                            key={addon.id}
                            className="flex items-center justify-between py-3.5"
                          >
                            <div className="flex-1 min-w-0">
                              <p className={`font-medium text-sm ${isSelected ? 'text-foreground' : 'text-muted-foreground'}`}>
                                {addon.name}
                              </p>
                              <p className={`text-xs mt-0.5 font-semibold ${isSelected ? 'text-primary' : 'text-muted-foreground/70'}`}>
                                {formatPrice(addon.price)}
                              </p>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                              {isSelected && (
                                <>
                                  <button
                                    onClick={() => decrementAddon(addon.id)}
                                    className="w-7 h-7 rounded-full border border-primary/60 flex items-center justify-center text-primary hover:bg-primary/10 transition-colors"
                                  >
                                    <Minus className="w-3 h-3" />
                                  </button>
                                  <span className="w-5 text-center text-sm font-bold text-foreground tabular-nums">
                                    {qty}
                                  </span>
                                </>
                              )}
                              <button
                                onClick={() => incrementAddon(addon.id)}
                                disabled={qty >= MAX_ADDON_QTY}
                                className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                                  isSelected
                                    ? 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm'
                                    : 'border-2 border-primary/50 text-primary hover:border-primary hover:bg-primary/10'
                                } disabled:opacity-30 disabled:cursor-not-allowed`}
                              >
                                <Plus className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        )
                      })}

                      {filteredAddons.length === 0 && search && (
                        <p className="text-center text-muted-foreground text-sm py-8">
                          Nenhum adicional encontrado.
                        </p>
                      )}
                    </div>
                  </>
                )}
              </div>
            </>
          )}

          {/* Observation */}
          <div className="px-5 mt-4 pb-2">
            <div className="border-t border-border mb-5" />
            <h3 className="font-bold text-foreground text-base mb-3">Observação</h3>
            <textarea
              rows={3}
              placeholder="Ex: Sem cebola, carne bem passada..."
              value={observation}
              onChange={(e) => setObservation(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg bg-muted border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary resize-none transition-colors"
            />
          </div>

          <div className="h-6" />
        </div>

        {/* Fixed Bottom Button */}
        <div className="flex-shrink-0 px-4 py-3 border-t border-border bg-card">
          <button
            onClick={handleAddToCart}
            className="w-full h-14 rounded-xl bg-primary hover:bg-primary/90 active:scale-[0.98] text-primary-foreground font-bold text-base flex items-center justify-between px-5 transition-all glow-yellow"
          >
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5" />
              <span>Adicionar ao carrinho</span>
            </div>
            <span className="font-black text-lg">{formatPrice(totalPrice)}</span>
          </button>
        </div>
      </div>

      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes slideUp {
          from { transform: translateY(100%); opacity: 0.6; }
          to   { transform: translateY(0);    opacity: 1;   }
        }
        @media (min-width: 640px) {
          @keyframes slideUp {
            from { transform: translate(-50%, -46%) scale(0.96); opacity: 0; }
            to   { transform: translate(-50%, -50%) scale(1);    opacity: 1; }
          }
        }
      `}</style>
    </>
  )
}
