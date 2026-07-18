'use client'

import Image from 'next/image'
import Link from 'next/link'
import { ShoppingCart, Menu, X, User, ClipboardList } from 'lucide-react'
import { useState } from 'react'
import { useStore } from '@/lib/store'

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false)
  const { cart, setCartOpen } = useStore()

  const cartItemsCount = cart.reduce((sum, item) => sum + item.quantity, 0)

  const navItems = [
    { label: 'Início', href: '#inicio' },
    { label: 'Cardápio', href: '#cardapio' },
    { label: 'Quem somos', href: '#quem-somos' },
    { label: 'Contato', href: '#contato' },
  ]

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">

          {/* Logo */}
          <Link href="/" className="flex items-center gap-3">
            <Image
              src="/logo.png"
              alt="Cremoso Burguer"
              width={50}
              height={50}
              className="w-10 h-10"
            />
            <div className="flex flex-col">
              <span className="text-primary font-black text-lg tracking-wide fire-text">
                CREMOSO
              </span>
              <span className="text-secondary font-bold text-sm -mt-1 tracking-widest">
                BURGUER
              </span>
            </div>
          </Link>

          {/* Actions: Cart + Menu */}
          <div className="flex items-center gap-3">

            {/* Cart Button */}
            <button
              onClick={() => setCartOpen(true)}
              className="relative p-2 rounded-full bg-muted hover:bg-muted/80 transition-colors"
            >
              <ShoppingCart className="w-5 h-5 text-foreground" />
              {cartItemsCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">
                  {cartItemsCount}
                </span>
              )}
            </button>

            {/* Menu Button — always visible */}
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="p-2 rounded-full bg-muted hover:bg-muted/80 transition-colors"
            >
              {menuOpen ? (
                <X className="w-5 h-5 text-foreground" />
              ) : (
                <Menu className="w-5 h-5 text-foreground" />
              )}
            </button>
          </div>
        </div>

        {/* Dropdown Menu */}
        {menuOpen && (
          <nav className="py-4 border-t border-border">
            <div className="flex flex-col gap-2">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMenuOpen(false)}
                  className="px-4 py-3 text-foreground/80 hover:text-primary hover:bg-muted rounded-lg transition-colors font-medium"
                >
                  {item.label}
                </Link>
              ))}
              <Link
                href="/acompanhar"
                onClick={() => setMenuOpen(false)}
                className="px-4 py-3 text-foreground/80 hover:text-primary hover:bg-muted rounded-lg transition-colors font-medium flex items-center gap-2"
              >
                <ClipboardList className="w-4 h-4" />
                Acompanhar pedido
              </Link>
              <Link
                href="/equipe"
                onClick={() => setMenuOpen(false)}
                className="px-4 py-3 text-primary hover:bg-primary/10 rounded-lg transition-colors font-medium flex items-center gap-2"
              >
                <User className="w-4 h-4" />
                Área da equipe
              </Link>
            </div>
          </nav>
        )}
      </div>
    </header>
  )
}
