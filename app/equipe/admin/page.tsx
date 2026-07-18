'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useStore } from '@/lib/store'
import { AdminSidebar } from '@/components/admin/sidebar'
import { DashboardPanel } from '@/components/admin/dashboard-panel'

export default function AdminPage() {
  const router = useRouter()
  const { user } = useStore()

  useEffect(() => {
    if (!user) {
      router.push('/equipe')
    }
  }, [user, router])

  if (!user) return null

  return (
    <div className="min-h-screen bg-background">
      <AdminSidebar />
      <main className="ml-14 sm:ml-64">
        <DashboardPanel />
      </main>
    </div>
  )
}
