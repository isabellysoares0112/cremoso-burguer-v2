'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useStore } from '@/lib/store'
import { AdminSidebar } from '@/components/admin/sidebar'
import { CuponsPanel } from '@/components/admin/cupons-panel'

export default function CuponsPage() {
  const { user } = useStore()
  const router = useRouter()

  useEffect(() => {
    if (!user || user.role !== 'admin') router.replace('/equipe')
  }, [user, router])

  if (!user || user.role !== 'admin') return null

  return (
    <div className="flex h-screen bg-background">
      <AdminSidebar />
      <main className="flex-1 ml-14 sm:ml-64 overflow-y-auto">
        <CuponsPanel />
      </main>
    </div>
  )
}
