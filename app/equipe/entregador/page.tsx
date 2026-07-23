'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { LogOut } from 'lucide-react'
import { useStore } from '@/lib/store'
import { DeliveryPanel } from '@/components/delivery/delivery-panel'

export default function EntregadorPage() {
  const router = useRouter()
  const { user, logout } = useStore()

  useEffect(() => {
    if (!user) {
      router.push('/equipe')
    }
  }, [user, router])

  const handleLogout = async () => {
    await logout()
    router.push('/equipe')
  }

  if (!user) return null

  return (
    <div className="min-h-screen bg-background">
      {/* Simple Header */}
      <header className="bg-card border-b border-border p-4">
        <div className="container mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center">
            <Image
              src="/logo-header.png"
              alt="Cremoso Burguer"
              width={1834}
              height={640}
              className="h-9 w-auto"
            />
          </Link>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-medium">Sair</span>
          </button>
        </div>
      </header>

      <main>
        <DeliveryPanel />
      </main>
    </div>
  )
}
