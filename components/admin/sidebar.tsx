'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'
import {
  ChefHat,
  ShoppingBag,
  UtensilsCrossed,
  Landmark,
  LayoutDashboard,
  Package,
  Tag,
  Users2,
  BarChart3,
  Settings,
  Users,
  LogOut,
} from 'lucide-react'
import { useStore } from '@/lib/store'
import { useRouter } from 'next/navigation'

const menuItems = [
  { href: '/equipe/admin/cozinha',        label: 'Cozinha',        icon: ChefHat },
  { href: '/equipe/admin/pedidos',         label: 'Pedidos',        icon: ShoppingBag },
  { href: '/equipe/admin/cardapio',        label: 'Cardápio',       icon: UtensilsCrossed },
  { href: '/equipe/admin/caixa',           label: 'Caixa',          icon: Landmark },
  { href: '/equipe/admin',                 label: 'Dashboard',      icon: LayoutDashboard },
  { href: '/equipe/admin/estoque',         label: 'Estoque',        icon: Package },
  { href: '/equipe/admin/cupons',          label: 'Cupons',         icon: Tag },
  { href: '/equipe/admin/crm',             label: 'CRM Clientes',   icon: Users2 },
  { href: '/equipe/admin/relatorios',      label: 'Relatórios',     icon: BarChart3 },
  { href: '/equipe/admin/configuracoes',   label: 'Configurações',  icon: Settings },
  { href: '/equipe/admin/usuarios',        label: 'Usuários',       icon: Users },
]

export function AdminSidebar() {
  const pathname = usePathname()
  const { logout } = useStore()
  const router = useRouter()
  const [expanded, setExpanded] = useState(false)
  const sidebarRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setExpanded(false)
  }, [pathname])

  useEffect(() => {
    if (!expanded) return
    const handler = (e: MouseEvent) => {
      if (sidebarRef.current && !sidebarRef.current.contains(e.target as Node)) {
        setExpanded(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [expanded])

  const handleLogout = async () => {
    await logout()
    router.push('/equipe')
  }

  return (
    <>
      {expanded && (
        <div
          className="fixed inset-0 bg-black/50 z-30 sm:hidden"
          onClick={() => setExpanded(false)}
        />
      )}

      <aside
        ref={sidebarRef}
        className={[
          'fixed left-0 top-0 h-full bg-card border-r border-border flex flex-col z-40',
          'transition-[width] duration-300 ease-in-out overflow-hidden',
          'sm:w-64',
          expanded ? 'w-64' : 'w-14',
        ].join(' ')}
      >
        <div className="border-b border-border flex items-center min-h-[64px] px-2 sm:px-4 gap-2">
          {/* Mobile toggle — icon only when collapsed */}
          <button
            onClick={() => setExpanded(v => !v)}
            className="sm:hidden flex items-center justify-center w-10 h-10 shrink-0 rounded-lg hover:bg-muted transition-colors"
            aria-label="Menu"
          >
            <Image src="/logo.png" alt="Menu" width={28} height={28} className="rounded" />
          </button>

          {/* Brand text: visible on desktop always; on mobile only when expanded */}
          <Link
            href="/"
            className={[
              'items-center gap-2 overflow-hidden',
              'hidden sm:flex',
              expanded ? '!flex' : '',
            ].join(' ')}
          >
            <Image
              src="/logo.png"
              alt="Cremoso Burguer"
              width={36}
              height={36}
              className="shrink-0 hidden sm:block"
            />
            <div className="whitespace-nowrap">
              <span className="block text-base sm:text-lg font-bold fire-text leading-tight">Cremoso</span>
              <span className="block text-[10px] sm:text-xs text-foreground/70 sm:text-foreground/80 tracking-widest">BURGUER</span>
            </div>
          </Link>
        </div>

        <nav className="flex-1 p-2 overflow-y-auto">
          <ul className="space-y-1">
            {menuItems.map((item) => {
              const isActive = item.href === '/equipe/admin'
                ? pathname === '/equipe/admin'
                : pathname === item.href || pathname.startsWith(item.href + '/')
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    title={item.label}
                    className={[
                      'flex items-center gap-3 px-2.5 py-2.5 rounded-lg transition-colors',
                      isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                    ].join(' ')}
                  >
                    <item.icon className="w-5 h-5 shrink-0" />
                    <span
                      className={[
                        'font-medium whitespace-nowrap transition-all duration-300',
                        'sm:opacity-100 sm:max-w-[160px]',
                        expanded ? 'opacity-100 max-w-[160px]' : 'opacity-0 max-w-0 overflow-hidden',
                      ].join(' ')}
                    >
                      {item.label}
                    </span>
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>

        <div className="p-2 border-t border-border">
          <button
            onClick={handleLogout}
            title="Sair"
            className="flex items-center gap-3 px-2.5 py-2.5 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive w-full transition-colors"
          >
            <LogOut className="w-5 h-5 shrink-0" />
            <span
              className={[
                'font-medium whitespace-nowrap transition-all duration-300',
                'sm:opacity-100 sm:max-w-[160px]',
                expanded ? 'opacity-100 max-w-[160px]' : 'opacity-0 max-w-0 overflow-hidden',
              ].join(' ')}
            >
              Sair
            </span>
          </button>
        </div>
      </aside>
    </>
  )
}
