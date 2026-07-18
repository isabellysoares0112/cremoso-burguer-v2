'use client'

import { useState, useEffect } from 'react'
import { Save, Plus, Trash2, Loader2, Clock, Calendar, ToggleLeft, Timer } from 'lucide-react'
import { useStore } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { StatusMode } from '@/lib/types'

interface Bairro {
  id: string
  nome: string
  taxa_entrega: number
}

const ALL_DAYS = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo']

const STATUS_OPTIONS: { value: StatusMode; label: string; desc: string; color: string }[] = [
  {
    value: 'automatic',
    label: 'Automático',
    desc: 'Usa o horário e dias configurados',
    color: 'border-blue-500 bg-blue-500/10 text-blue-400',
  },
  {
    value: 'force_open',
    label: 'Forçar Aberto',
    desc: 'Sempre mostra "Aberto agora"',
    color: 'border-green-500 bg-green-500/10 text-green-400',
  },
  {
    value: 'force_closed',
    label: 'Forçar Fechado',
    desc: 'Sempre mostra "Fechado no momento"',
    color: 'border-red-500 bg-red-500/10 text-red-400',
  },
]

export function SettingsPanel() {
  const { settings, updateSettings } = useStore()

  const [formData, setFormData] = useState({
    phone: '',
    whatsapp: '',
    openingHours: '',
    deliveryFee: 0,
    workingDays: ALL_DAYS,
    statusMode: 'automatic' as StatusMode,
    estimatedMinutes: { novo: 40, preparando: 30, pronto: 15 },
  })

  const [bairros, setBairros] = useState<Bairro[]>([])
  const [novoBairro, setNovoBairro] = useState('')
  const [novaTaxa, setNovaTaxa] = useState<number>(0)
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const [loadingBairros, setLoadingBairros] = useState(true)
  const [addingBairro, setAddingBairro] = useState(false)
  const [loadingSettings, setLoadingSettings] = useState(true)

  // Always fetch fresh from Supabase — never trust stale store
  useEffect(() => {
    async function fetchSettings() {
      try {
        const res = await fetch('/api/admin/settings', { cache: 'no-store' })
        if (!res.ok) return
        const json = await res.json()
        if (json.settings) {
          const s = json.settings
          setFormData({
            phone: s.phone || '',
            whatsapp: s.whatsapp || '',
            openingHours: s.openingHours || '',
            deliveryFee: s.deliveryFee || 0,
            workingDays: Array.isArray(s.workingDays) && s.workingDays.length > 0 ? s.workingDays : ALL_DAYS,
            statusMode: s.statusMode || 'automatic',
            estimatedMinutes: {
              novo:       s.estimatedMinutes?.novo       ?? 40,
              preparando: s.estimatedMinutes?.preparando ?? 30,
              pronto:     s.estimatedMinutes?.pronto     ?? 15,
            },
          })
        }
      } catch (err) {
        console.error('Erro ao carregar configurações:', err)
      } finally {
        setLoadingSettings(false)
      }
    }
    fetchSettings()
  }, [])

  const fetchBairros = async () => {
    setLoadingBairros(true)
    try {
      const res = await fetch('/api/admin/bairros')
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Erro ao buscar bairros')
      setBairros(json.bairros || [])
    } catch (err) {
      console.error('Erro ao buscar bairros:', err)
    } finally {
      setLoadingBairros(false)
    }
  }

  useEffect(() => {
    fetchBairros()
  }, [])

  const toggleDay = (day: string) => {
    setFormData((prev) => {
      const already = prev.workingDays.includes(day)
      return {
        ...prev,
        workingDays: already
          ? prev.workingDays.filter((d) => d !== day)
          : [...prev.workingDays, day],
      }
    })
  }

  const handleSave = async () => {
    if (formData.deliveryFee < 0) {
      alert('A taxa de entrega não pode ser negativa.')
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      if (!res.ok) throw new Error('Falha ao salvar')
      updateSettings(formData)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (err) {
      console.error('Erro ao salvar configurações:', err)
      alert('Erro ao salvar configurações. Tente novamente.')
    } finally {
      setSaving(false)
    }
  }

  const addBairro = async () => {
    if (!novoBairro.trim()) {
      alert('Informe o nome do bairro.')
      return
    }
    if (novaTaxa < 0) {
      alert('A taxa de entrega não pode ser negativa.')
      return
    }

    setAddingBairro(true)
    try {
      const res = await fetch('/api/admin/bairros', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome: novoBairro.trim(), taxa_entrega: novaTaxa }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Erro ao adicionar')
      setNovoBairro('')
      setNovaTaxa(0)
      await fetchBairros()
    } catch (err) {
      console.error('Erro ao adicionar bairro:', err)
      alert('Erro ao adicionar bairro. Tente novamente.')
    } finally {
      setAddingBairro(false)
    }
  }

  const removeBairro = async (id: string, nome: string) => {
    const confirmed = window.confirm(`Remover o bairro "${nome}"?`)
    if (!confirmed) return

    try {
      const res = await fetch(`/api/admin/bairros/${id}`, { method: 'DELETE' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Erro ao remover')
      await fetchBairros()
    } catch (err) {
      console.error('Erro ao remover bairro:', err)
      alert('Erro ao remover bairro. Tente novamente.')
    }
  }

  const updateTaxa = async (id: string, taxa: number) => {
    if (taxa < 0) {
      alert('A taxa de entrega não pode ser negativa.')
      return
    }
    try {
      const res = await fetch(`/api/admin/bairros/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taxa_entrega: taxa }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Erro ao atualizar')
      setBairros(prev =>
        prev.map(b => (b.id === id ? { ...b, taxa_entrega: taxa } : b))
      )
    } catch (err) {
      console.error('Erro ao atualizar taxa:', err)
    }
  }

  if (loadingSettings) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[300px]">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-foreground">CONFIGURAÇÕES</h1>
        <Button
          onClick={handleSave}
          disabled={saving}
          className="bg-primary hover:bg-primary/90 text-primary-foreground"
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Salvando...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              {saved ? 'Salvo!' : 'Salvar'}
            </>
          )}
        </Button>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">

        {/* Status Mode — full width, top priority */}
        <div className="bg-card border border-border rounded-lg p-6 lg:col-span-2">
          <div className="flex items-center gap-2 mb-2">
            <ToggleLeft className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-bold text-foreground">Status do Restaurante</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Controla o que o banner na página principal exibe para todos os clientes. Salve após escolher.
          </p>
          <div className="grid sm:grid-cols-3 gap-3">
            {STATUS_OPTIONS.map((opt) => {
              const active = formData.statusMode === opt.value
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setFormData({ ...formData, statusMode: opt.value })}
                  className={`flex flex-col items-start gap-1 p-4 rounded-lg border-2 text-left transition-all ${
                    active
                      ? opt.color
                      : 'border-border bg-muted/30 text-muted-foreground hover:border-muted-foreground/50'
                  }`}
                >
                  <span className="font-semibold text-sm">{opt.label}</span>
                  <span className="text-xs opacity-80">{opt.desc}</span>
                </button>
              )
            })}
          </div>
          {formData.statusMode !== 'automatic' && (
            <p className="mt-3 text-xs text-yellow-500 font-medium">
              ⚠ Modo manual ativo — o horário e dias configurados serão ignorados pelo banner.
            </p>
          )}
        </div>

        {/* Contact Info */}
        <div className="bg-card border border-border rounded-lg p-6">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-bold text-foreground">Informações de Contato</h2>
          </div>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-foreground">Telefone</Label>
              <Input
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="bg-muted border-border"
                placeholder="(33) 99999-9999"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-foreground">WhatsApp (apenas números com código do país)</Label>
              <Input
                value={formData.whatsapp}
                onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                className="bg-muted border-border"
                placeholder="5533999999999"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-foreground">Horário de Funcionamento</Label>
              <Input
                value={formData.openingHours}
                onChange={(e) => setFormData({ ...formData, openingHours: e.target.value })}
                className="bg-muted border-border"
                placeholder="18:00 às 23:00"
              />
            </div>
          </div>
        </div>

        {/* Working Days */}
        <div className="bg-card border border-border rounded-lg p-6">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-bold text-foreground">Dias de Funcionamento</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Usado pelo modo Automático para calcular se está aberto.
          </p>
          <div className="grid grid-cols-2 gap-3">
            {ALL_DAYS.map((day) => {
              const active = formData.workingDays.includes(day)
              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => toggleDay(day)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                    active
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-muted text-muted-foreground border-border hover:border-primary/50'
                  }`}
                >
                  <span
                    className={`w-4 h-4 rounded flex items-center justify-center border ${
                      active ? 'bg-primary-foreground border-primary-foreground' : 'border-muted-foreground'
                    }`}
                  >
                    {active && (
                      <svg className="w-3 h-3 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </span>
                  {day}
                </button>
              )
            })}
          </div>
        </div>

        {/* Delivery Settings */}
        <div className="bg-card border border-border rounded-lg p-6">
          <h2 className="text-lg font-bold text-foreground mb-4">Configurações de Entrega</h2>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-foreground">Taxa de Entrega Padrão (R$)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={formData.deliveryFee}
                onChange={(e) => setFormData({ ...formData, deliveryFee: Math.max(0, parseFloat(e.target.value) || 0) })}
                className="bg-muted border-border"
              />
              <p className="text-xs text-muted-foreground">
                Usada quando o bairro selecionado não tiver taxa definida.
              </p>
            </div>
          </div>
        </div>

        {/* Estimated Delivery Time */}
        <div className="bg-card border border-border rounded-lg p-6">
          <div className="flex items-center gap-2 mb-2">
            <Timer className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-bold text-foreground">Tempo Estimado de Entrega</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Exibido automaticamente para o cliente no acompanhamento do pedido.
          </p>
          <div className="space-y-3">
            {(
              [
                { key: 'novo',       label: 'Pedido recebido (aguardando)',  emoji: '🕐' },
                { key: 'preparando', label: 'Em preparo na cozinha',         emoji: '👨‍🍳' },
                { key: 'pronto',     label: 'Pronto / saindo para entrega',  emoji: '🛵' },
              ] as const
            ).map(({ key, label, emoji }) => (
              <div key={key} className="flex items-center gap-3">
                <span className="text-lg w-7 text-center">{emoji}</span>
                <div className="flex-1">
                  <Label className="text-foreground text-xs">{label}</Label>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Input
                    type="number"
                    min="1"
                    max="180"
                    step="5"
                    value={formData.estimatedMinutes[key]}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        estimatedMinutes: {
                          ...formData.estimatedMinutes,
                          [key]: Math.max(1, parseInt(e.target.value) || 1),
                        },
                      })
                    }
                    className="bg-muted border-border w-20 text-center"
                  />
                  <span className="text-sm text-muted-foreground w-6">min</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Neighborhoods */}
        <div className="bg-card border border-border rounded-lg p-6 lg:col-span-2">
          <h2 className="text-lg font-bold text-foreground mb-4">Bairros Atendidos</h2>

          <div className="flex gap-4 mb-6">
            <div className="flex-1">
              <Input
                value={novoBairro}
                onChange={(e) => setNovoBairro(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addBairro())}
                className="bg-muted border-border"
                placeholder="Nome do bairro"
              />
            </div>
            <div className="w-36">
              <Input
                type="number"
                step="0.01"
                min="0"
                value={novaTaxa || ''}
                onChange={(e) => setNovaTaxa(Math.max(0, parseFloat(e.target.value) || 0))}
                className="bg-muted border-border"
                placeholder="Taxa (R$)"
              />
            </div>
            <Button onClick={addBairro} variant="outline" disabled={addingBairro}>
              {addingBairro ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            </Button>
          </div>

          {loadingBairros ? (
            <div className="flex items-center gap-2 text-muted-foreground text-sm py-4">
              <Loader2 className="w-4 h-4 animate-spin" />
              Carregando bairros...
            </div>
          ) : bairros.length === 0 ? (
            <p className="text-muted-foreground text-sm py-4">Nenhum bairro cadastrado.</p>
          ) : (
            <div className="space-y-3">
              {bairros.map((bairro) => (
                <div key={bairro.id} className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg">
                  <span className="flex-1 text-foreground font-medium">{bairro.nome}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground text-sm">R$</span>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      defaultValue={bairro.taxa_entrega}
                      onBlur={(e) => updateTaxa(bairro.id, Math.max(0, parseFloat(e.target.value) || 0))}
                      className="w-24 bg-muted border-border text-center"
                    />
                  </div>
                  <button
                    onClick={() => removeBairro(bairro.id, bairro.nome)}
                    className="p-2 rounded-lg hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-colors"
                    title="Remover bairro"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
