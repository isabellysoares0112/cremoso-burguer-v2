'use client'

import Image from 'next/image'
import { Phone, Clock, Instagram, MessageCircle } from 'lucide-react'
import { useEffect, useState } from 'react'

interface LiveSettings {
  phone: string
  whatsapp: string
  instagram: string
  openingHours: string
  workingDays: string[]
}

const ALL_DAYS = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo']

function formatWorkingDays(days: string[]): string {
  if (!days || days.length === 0) return ''

  if (days.length === 7) return 'Segunda a Domingo'

  const indices = days
    .map((d) => ALL_DAYS.indexOf(d))
    .filter((i) => i !== -1)
    .sort((a, b) => a - b)

  if (indices.length === 0) return ''

  const ranges: string[] = []
  let start = indices[0]
  let end = indices[0]

  for (let i = 1; i <= indices.length; i++) {
    if (i < indices.length && indices[i] === end + 1) {
      end = indices[i]
    } else {
      if (end - start >= 2) {
        ranges.push(`${ALL_DAYS[start]} a ${ALL_DAYS[end]}`)
      } else if (end - start === 1) {
        ranges.push(`${ALL_DAYS[start]}, ${ALL_DAYS[end]}`)
      } else {
        ranges.push(ALL_DAYS[start])
      }
      if (i < indices.length) {
        start = indices[i]
        end = indices[i]
      }
    }
  }

  return ranges.join(' | ')
}

export function Footer() {
  const [live, setLive] = useState<LiveSettings | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/settings', { cache: 'no-store' })
        if (!res.ok) return
        const json = await res.json()
        if (json.settings) {
          setLive({
            phone: json.settings.phone || '',
            whatsapp: json.settings.whatsapp || '',
            instagram: json.settings.instagram || '',
            openingHours: json.settings.openingHours || '',
            workingDays: Array.isArray(json.settings.workingDays) ? json.settings.workingDays : [],
          })
        }
      } catch {
        // silently ignore
      }
    }
    load()
  }, [])

  const phone = live?.phone || ''
  const whatsapp = live?.whatsapp || ''
  const instagram = live?.instagram || ''
  const openingHours = live?.openingHours || ''
  const workingDays = live?.workingDays || []

  // Aceita qualquer formato que a pessoa digitar no painel: "@cremoso",
  // "cremoso" ou a URL completa do perfil.
  const instagramUrl = instagram
    ? instagram.startsWith('http')
      ? instagram
      : `https://instagram.com/${instagram.replace(/^@/, '')}`
    : ''

  const daysLabel = formatWorkingDays(workingDays)

  return (
    <footer id="contato" className="bg-card border-t border-border py-12">
      <div className="container mx-auto px-4">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Logo & Description */}
          <div className="sm:col-span-2 lg:col-span-1">
            <div className="flex items-center mb-4">
              <Image
                src="/logo-header.png"
                alt="Cremoso Burguer"
                width={1834}
                height={640}
                className="h-12 w-auto"
              />
            </div>
            <p className="text-muted-foreground text-sm">
              Hambúrgueres caprichados e absurdamente cremosos, uma mordida e você entende o nome!
            </p>
          </div>

          {/* Contact */}
          <div>
            <h3 className="font-bold text-foreground mb-4">Contato</h3>
            <div className="space-y-3">
              {phone && (
                <a
                  href={`tel:${phone.replace(/\D/g, '')}`}
                  className="flex items-center gap-3 text-muted-foreground hover:text-primary transition-colors"
                >
                  <Phone className="w-4 h-4" />
                  <span className="text-sm">{phone}</span>
                </a>
              )}
              {whatsapp && (
                <a
                  href={`https://wa.me/${whatsapp}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 text-muted-foreground hover:text-primary transition-colors"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span className="text-sm">WhatsApp</span>
                </a>
              )}
            </div>
          </div>

          {/* Hours */}
          <div>
            <h3 className="font-bold text-foreground mb-4">Horário</h3>
            <div className="space-y-2">
              {openingHours ? (
                <div className="flex items-center gap-3 text-muted-foreground">
                  <Clock className="w-4 h-4 shrink-0" />
                  <span className="text-sm">{openingHours}</span>
                </div>
              ) : null}
              {daysLabel ? (
                <p className="text-muted-foreground text-sm">{daysLabel}</p>
              ) : null}
              {!openingHours && !daysLabel && (
                <p className="text-muted-foreground text-sm">—</p>
              )}
            </div>
          </div>

          {/* Social */}
          {instagramUrl && (
            <div>
              <h3 className="font-bold text-foreground mb-4">Redes Sociais</h3>
              <div className="flex gap-3">
                <a
                  href={instagramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:bg-primary hover:text-primary-foreground transition-colors"
                >
                  <Instagram className="w-5 h-5" />
                </a>
              </div>
            </div>
          )}
        </div>

        {/* Copyright */}
        <div className="mt-12 pt-6 border-t border-border text-center">
          <p className="text-muted-foreground text-sm">
            &copy; {new Date().getFullYear()} Cremoso Burguer. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </footer>
  )
}
