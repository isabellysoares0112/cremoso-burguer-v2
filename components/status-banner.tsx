'use client'

import { useEffect, useState } from 'react'
import { CheckCircle, XCircle } from 'lucide-react'
import type { StatusMode } from '@/lib/types'

const DAY_NAMES_PT: Record<number, string> = {
  0: 'Domingo',
  1: 'Segunda',
  2: 'Terça',
  3: 'Quarta',
  4: 'Quinta',
  5: 'Sexta',
  6: 'Sábado',
}

function parseTime(timeStr: string): { h: number; m: number } | null {
  const match = timeStr.match(/(\d{1,2}):(\d{2})/)
  if (!match) return null
  return { h: parseInt(match[1], 10), m: parseInt(match[2], 10) }
}

function isOpenBySchedule(openingHours: string, workingDays: string[]): boolean {
  const now = new Date()
  const todayName = DAY_NAMES_PT[now.getDay()]

  if (!workingDays || !workingDays.includes(todayName)) return false

  const parts = openingHours.split(/às|as|-/i)
  if (parts.length < 2) return false

  const start = parseTime(parts[0].trim())
  const end = parseTime(parts[1].trim())
  if (!start || !end) return false

  const nowMinutes = now.getHours() * 60 + now.getMinutes()
  const startMinutes = start.h * 60 + start.m
  let endMinutes = end.h * 60 + end.m

  if (endMinutes < startMinutes) endMinutes += 24 * 60

  return nowMinutes >= startMinutes && nowMinutes < endMinutes
}

interface LiveSettings {
  openingHours: string
  workingDays: string[]
  statusMode: StatusMode
}

export function StatusBanner() {
  const [liveSettings, setLiveSettings] = useState<LiveSettings | null>(null)
  const [currentTime, setCurrentTime] = useState('')

  useEffect(() => {
    async function fetchFresh() {
      try {
        const res = await fetch('/api/admin/settings', { cache: 'no-store' })
        if (!res.ok) return
        const json = await res.json()
        if (json.settings) {
          setLiveSettings({
            openingHours: json.settings.openingHours || '',
            workingDays: Array.isArray(json.settings.workingDays) ? json.settings.workingDays : [],
            statusMode: json.settings.statusMode || 'automatic',
          })
        }
      } catch {
        // silently ignore — banner won't show
      }
    }

    fetchFresh()
  }, [])

  useEffect(() => {
    const tick = () => {
      const now = new Date()
      setCurrentTime(now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }))
    }
    tick()
    const interval = setInterval(tick, 60000)
    return () => clearInterval(interval)
  }, [])

  if (!liveSettings) return null

  const { statusMode, openingHours, workingDays } = liveSettings

  let isOpen: boolean
  if (statusMode === 'force_open') {
    isOpen = true
  } else if (statusMode === 'force_closed') {
    isOpen = false
  } else {
    isOpen = isOpenBySchedule(openingHours, workingDays)
  }

  return (
    <div
      className={`w-full py-2 px-4 flex items-center justify-center gap-2 text-sm font-semibold transition-colors ${
        isOpen ? 'bg-green-600/90 text-white' : 'bg-red-700/90 text-white'
      }`}
    >
      {isOpen ? (
        <>
          <CheckCircle className="w-4 h-4 shrink-0" />
          <span>Aberto agora</span>
          {openingHours && statusMode === 'automatic' && (
            <span className="opacity-80 font-normal">&nbsp;· {openingHours}</span>
          )}
        </>
      ) : (
        <>
          <XCircle className="w-4 h-4 shrink-0" />
          <span>Fechado no momento</span>
          {openingHours && statusMode === 'automatic' && (
            <span className="opacity-80 font-normal">&nbsp;· Abrimos {openingHours}</span>
          )}
        </>
      )}
      <span className="opacity-60 font-normal ml-1">({currentTime})</span>
    </div>
  )
}
