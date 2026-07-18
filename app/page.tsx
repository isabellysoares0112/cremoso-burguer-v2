'use client'

import { useEffect, useState } from 'react'
import { Header } from '@/components/header'
import { Hero } from '@/components/hero'
import { Benefits } from '@/components/benefits'
import { Menu } from '@/components/menu'
import { About } from '@/components/about'
import { Footer } from '@/components/footer'
import { Cart } from '@/components/cart'
import { Checkout } from '@/components/checkout'
import { OrderTracking } from '@/components/order-tracking'
import { StatusBanner } from '@/components/status-banner'
import { OrderAgain } from '@/components/order-again'
import { useStore } from '@/lib/store'
import type { Order } from '@/lib/types'

const TRACK_KEY = 'cremoso-track-order'

type View = 'home' | 'checkout' | 'tracking'

export default function Home() {
  const [view, setView] = useState<View>('home')
  const [completedOrder, setCompletedOrder] = useState<Order | null>(null)
  const { setCartOpen, loadSettings } = useStore()

  useEffect(() => {
    loadSettings()
    // Auto-restore last order if not yet delivered
    try {
      const saved = localStorage.getItem(TRACK_KEY)
      if (saved) {
        const order = JSON.parse(saved) as Order
        if (order?.id && order?.status !== 'entregue') {
          setCompletedOrder(order)
          setView('tracking')
        }
      }
    } catch { /* ignore */ }
  }, [])

  const handleCheckout = () => {
    setCartOpen(false)
    setView('checkout')
  }

  const handleOrderComplete = (order: Order) => {
    try { localStorage.setItem(TRACK_KEY, JSON.stringify(order)) } catch { /* ignore */ }
    setCompletedOrder(order)
    setView('tracking')
  }

  const handleDelivered = () => {
    try { localStorage.removeItem(TRACK_KEY) } catch { /* ignore */ }
  }

  const handleBackToHome = () => {
    setView('home')
    setCompletedOrder(null)
  }

  return (
    <main className="min-h-screen bg-background">
      {view === 'home' && (
        <>
          <Header />
          <div className="pt-16">
            <StatusBanner />
          </div>
          <Hero />
          <Benefits />
          <OrderAgain />
          <Menu />
          <About />
          <Footer />
          <Cart onCheckout={handleCheckout} />
        </>
      )}

      {view === 'checkout' && (
        <Checkout
          onBack={handleBackToHome}
          onComplete={handleOrderComplete}
        />
      )}

      {view === 'tracking' && completedOrder && (
        <OrderTracking
          order={completedOrder}
          onBack={handleBackToHome}
          onDelivered={handleDelivered}
        />
      )}
    </main>
  )
}
