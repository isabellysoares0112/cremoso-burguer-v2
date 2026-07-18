'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useStore } from '@/lib/store'
import { AdminSidebar } from '@/components/admin/sidebar'
import { CaixaPanel } from '@/components/admin/caixa-panel'

export default function CaixaPage() {
  const router = useRouter()
  const { user } = useStore()

  useEffect(() => {
    if (!user || user.role !== 'admin') router.push('/equipe')
  }, [user, router])

  if (!user || user.role !== 'admin') return null

  return (
    <div className="flex h-screen bg-background">
      <AdminSidebar />
      <main className="flex-1 ml-14 sm:ml-64 overflow-y-auto">
        <CaixaPanel />
      </main>
    </div>
  )
}
