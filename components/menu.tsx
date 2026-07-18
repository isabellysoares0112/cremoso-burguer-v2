'use client'

import { useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import { Plus } from 'lucide-react'
import { useStore } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { ProductModal } from '@/components/product-modal'
import type { Product } from '@/lib/types'

const FALLBACK_CATEGORIES = [
  { slug: 'hamburgueres', name: 'HAMBÚRGUERES' },
  { slug: 'combos', name: 'COMBOS' },
  { slug: 'acompanhamentos', name: 'ACOMPANHAMENTOS' },
  { slug: 'bebidas', name: 'BEBIDAS' },
]

export function Menu() {
  const { products, categories, loadMenu } = useStore()
  const [activeCategory, setActiveCategory] = useState<string>('hamburgueres')
  const [loading, setLoading] = useState(true)
  const [modalProduct, setModalProduct] = useState<Product | null>(null)

  useEffect(() => {
    let mounted = true
    loadMenu().finally(() => {
      if (mounted) setLoading(false)
    })
    return () => {
      mounted = false
    }
  }, [loadMenu])

  const displayedCategories = useMemo(() => {
    if (categories && categories.length > 0) {
      return categories.map((c) => ({ slug: c.slug, name: c.name.toUpperCase() }))
    }
    return FALLBACK_CATEGORIES
  }, [categories])

  useEffect(() => {
    if (displayedCategories.length > 0 && !displayedCategories.find((c) => c.slug === activeCategory)) {
      setActiveCategory(displayedCategories[0].slug)
    }
  }, [displayedCategories, activeCategory])

  const filteredProducts = products.filter((p) => p.category === activeCategory && p.active)

  const formatPrice = (price: number) =>
    price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

  return (
    <>
      <section id="cardapio" className="py-16 lg:py-24">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-black text-foreground mb-4">
              NOSSO <span className="fire-text">CARDÁPIO</span>
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Escolha seu hambúrguer favorito e faça seu pedido agora mesmo
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-2 mb-10">
            {displayedCategories.map((category) => (
              <button
                key={category.slug}
                onClick={() => setActiveCategory(category.slug)}
                className={`px-4 py-2 rounded-full font-bold text-sm transition-all ${
                  activeCategory === category.slug
                    ? 'bg-primary text-primary-foreground glow-yellow'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground'
                }`}
              >
                {category.name}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-6">
            {filteredProducts.map((product) => (
              <div
                key={product.id}
                className="bg-card border border-border rounded-xl overflow-hidden hover:border-primary/50 transition-all group"
              >
                <div className="relative aspect-square overflow-hidden bg-muted">
                  <Image
                    src={product.image}
                    alt={product.name}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                  />
                  {product.isBestSeller && (
                    <span className="absolute top-2 left-2 bg-primary text-primary-foreground text-[10px] font-bold px-2 py-0.5 rounded-full leading-tight z-10">
                      🔥 MAIS PEDIDO
                    </span>
                  )}
                  {product.isNew && !product.isBestSeller && (
                    <span className="absolute top-2 left-2 bg-secondary text-secondary-foreground text-[10px] font-bold px-2 py-0.5 rounded-full leading-tight z-10">
                      🆕 NOVIDADE
                    </span>
                  )}
                </div>

                <div className="p-4">
                  <h3 className="font-bold text-foreground text-lg mb-1">{product.name}</h3>
                  <p className="text-muted-foreground text-sm mb-4 line-clamp-2">
                    {product.description}
                  </p>

                  <div className="flex items-center justify-between">
                    <span className="text-xl font-black text-primary">{formatPrice(product.price)}</span>
                    <Button
                      onClick={() => setModalProduct(product)}
                      size="icon"
                      className="w-10 h-10 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground"
                    >
                      <Plus className="w-5 h-5" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {!loading && filteredProducts.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <p>Nenhum produto disponível nesta categoria.</p>
            </div>
          )}

          {loading && filteredProducts.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <p>Carregando cardápio...</p>
            </div>
          )}
        </div>
      </section>

      <ProductModal
        product={modalProduct}
        onClose={() => setModalProduct(null)}
      />
    </>
  )
}
