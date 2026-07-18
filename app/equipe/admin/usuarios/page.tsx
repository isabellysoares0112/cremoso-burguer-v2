'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useStore } from '@/lib/store'
import { AdminSidebar } from '@/components/admin/sidebar'
import { UsersPanel } from '@/components/admin/users-panel'

export default function UsuariosPage() {
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
        <UsersPanel />
      </main>
    </div>
  )
}
