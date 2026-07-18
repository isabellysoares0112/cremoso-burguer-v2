'use client'

import { useEffect, useRef } from 'react'
import { useStore } from '@/lib/store'

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const setUser = useStore((s) => s.setUser)
  const restored = useRef(false)

  useEffect(() => {
    if (restored.current) return
    restored.current = true

    fetch('/api/auth/me')
      .then((r) => r.json())
      .then(({ user }) => {
        setUser(user ?? null)
      })
      .catch(() => {
        setUser(null)
      })
  }, [setUser])

  return <>{children}</>
}
