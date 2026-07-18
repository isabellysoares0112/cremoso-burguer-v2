'use client'

import { useState, useEffect, useCallback } from 'react'
import { Tag, Plus, Trash2, ToggleLeft, ToggleRight, RefreshCw, Copy, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface Cupom {
  id: string
  codigo: string
  desconto_tipo: 'percentual' | 'fixo'
  desconto_valor: number
  ativo: boolean
  validade: string | null
  limite_uso: number | null
  uso_atual: number
  created_at: string
}

const SETUP_SQL = `CREATE TABLE IF NOT EXISTS cupons (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  codigo text UNIQUE NOT NULL,
  desconto_tipo text NOT NULL CHECK (desconto_tipo IN ('percentual', 'fixo')),
  desconto_valor numeric(10,2) NOT NULL,
  ativo boolean DEFAULT true,
  validade date,
  limite_uso integer,
  uso_atual integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);`

export function CuponsPanel() {
  const [cupons, setCupons] = useState<Cupom[]>([])
  const [loading, setLoading] = useState(true)
  const [needsSetup, setNeedsSetup] = useState(false)
  const [copied, setCopied] = useState(false)

  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    codigo: '',
    desconto_tipo: 'percentual' as 'percentual' | 'fixo',
    desconto_valor: '',
    validade: '',
    limite_uso: '',
  })
  const [formError, setFormError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/cupons')
      const json = await res.json()
      if (json.needsSetup) {
        setNeedsSetup(true)
      } else {
        setCupons(json.cupons || [])
        setNeedsSetup(false)
      }
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const handleToggle = async (cupom: Cupom) => {
    const res = await fetch(`/api/admin/cupons/${cupom.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ativo: !cupom.ativo }),
    })
    if (res.ok) {
      setCupons((prev) => prev.map((c) => c.id === cupom.id ? { ...c, ativo: !c.ativo } : c))
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir este cupom?')) return
    const res = await fetch(`/api/admin/cupons/${id}`, { method: 'DELETE' })
    if (res.ok) setCupons((prev) => prev.filter((c) => c.id !== id))
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')
    setSaving(true)
    try {
      const res = await fetch('/api/admin/cupons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          codigo: form.codigo,
          desconto_tipo: form.desconto_tipo,
          desconto_valor: form.desconto_valor,
          validade: form.validade || null,
          limite_uso: form.limite_uso || null,
        }),
      })
      const json = await res.json()
      if (!res.ok) { setFormError(json.error || 'Erro ao criar cupom'); return }
      setCupons((prev) => [json.cupom, ...prev])
      setForm({ codigo: '', desconto_tipo: 'percentual', desconto_valor: '', validade: '', limite_uso: '' })
      setShowForm(false)
    } catch {
      setFormError('Erro ao criar cupom')
    } finally {
      setSaving(false)
    }
  }

  const handleCopySQL = () => {
    navigator.clipboard.writeText(SETUP_SQL).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const formatDesconto = (c: Cupom) =>
    c.desconto_tipo === 'percentual'
      ? `${c.desconto_valor}%`
      : `R$ ${Number(c.desconto_valor).toFixed(2).replace('.', ',')}`

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <RefreshCw className="w-6 h-6 animate-spin text-primary" />
      </div>
    )
  }

  if (needsSetup) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-3">
          <Tag className="w-6 h-6 text-primary" />
          <h2 className="text-2xl font-bold text-foreground">Cupons</h2>
        </div>
        <div className="bg-yellow-500/10 border border-yellow-500/40 rounded-lg p-6 space-y-4">
          <p className="text-foreground font-semibold">Configuração necessária</p>
          <p className="text-muted-foreground text-sm">
            Crie a tabela de cupons no seu banco Supabase. Abra o{' '}
            <strong>SQL Editor</strong> no painel Supabase e execute o SQL abaixo:
          </p>
          <div className="relative">
            <pre className="bg-muted rounded-md p-4 text-xs text-foreground overflow-x-auto whitespace-pre-wrap">
              {SETUP_SQL}
            </pre>
            <button
              onClick={handleCopySQL}
              className="absolute top-2 right-2 p-1.5 rounded bg-muted-foreground/20 hover:bg-muted-foreground/30 transition-colors"
            >
              {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4 text-foreground" />}
            </button>
          </div>
          <Button onClick={load} variant="outline" className="flex items-center gap-2">
            <RefreshCw className="w-4 h-4" />
            Verificar novamente
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Tag className="w-6 h-6 text-primary" />
          <h2 className="text-2xl font-bold text-foreground">Cupons</h2>
        </div>
        <Button
          onClick={() => { setShowForm(!showForm); setFormError('') }}
          className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground"
        >
          <Plus className="w-4 h-4" />
          Novo Cupom
        </Button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="bg-card border border-border rounded-lg p-5 space-y-4">
          <h3 className="font-bold text-foreground">Criar Cupom</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label className="text-foreground text-sm">Código *</Label>
              <Input
                placeholder="EX: CREMOSO10"
                value={form.codigo}
                onChange={(e) => setForm({ ...form, codigo: e.target.value.toUpperCase() })}
                className="bg-muted border-border text-foreground"
                required
              />
            </div>

            <div className="space-y-1">
              <Label className="text-foreground text-sm">Tipo de desconto *</Label>
              <select
                value={form.desconto_tipo}
                onChange={(e) => setForm({ ...form, desconto_tipo: e.target.value as 'percentual' | 'fixo' })}
                className="w-full h-10 px-3 rounded-md bg-muted border border-border text-foreground"
                required
              >
                <option value="percentual">Percentual (%)</option>
                <option value="fixo">Valor fixo (R$)</option>
              </select>
            </div>

            <div className="space-y-1">
              <Label className="text-foreground text-sm">
                Valor do desconto * {form.desconto_tipo === 'percentual' ? '(%)' : '(R$)'}
              </Label>
              <Input
                type="number"
                min="0.01"
                step="0.01"
                max={form.desconto_tipo === 'percentual' ? 100 : undefined}
                placeholder={form.desconto_tipo === 'percentual' ? 'Ex: 10' : 'Ex: 5.00'}
                value={form.desconto_valor}
                onChange={(e) => setForm({ ...form, desconto_valor: e.target.value })}
                className="bg-muted border-border text-foreground"
                required
              />
            </div>

            <div className="space-y-1">
              <Label className="text-foreground text-sm">Validade (opcional)</Label>
              <Input
                type="date"
                value={form.validade}
                onChange={(e) => setForm({ ...form, validade: e.target.value })}
                className="bg-muted border-border text-foreground"
              />
            </div>

            <div className="space-y-1 sm:col-span-2">
              <Label className="text-foreground text-sm">Limite de uso (opcional)</Label>
              <Input
                type="number"
                min="1"
                step="1"
                placeholder="Ex: 100 (deixe vazio para ilimitado)"
                value={form.limite_uso}
                onChange={(e) => setForm({ ...form, limite_uso: e.target.value })}
                className="bg-muted border-border text-foreground"
              />
            </div>
          </div>

          {formError && <p className="text-destructive text-sm">{formError}</p>}

          <div className="flex gap-3">
            <Button type="submit" disabled={saving} className="bg-primary hover:bg-primary/90 text-primary-foreground">
              {saving ? 'Salvando...' : 'Criar Cupom'}
            </Button>
            <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
              Cancelar
            </Button>
          </div>
        </form>
      )}

      {cupons.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Tag className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p>Nenhum cupom cadastrado</p>
          <p className="text-sm mt-1">Clique em &quot;Novo Cupom&quot; para começar</p>
        </div>
      ) : (
        <div className="space-y-3">
          {cupons.map((cupom) => (
            <div
              key={cupom.id}
              className={`bg-card border rounded-lg p-4 flex items-center justify-between gap-4 ${
                cupom.ativo ? 'border-border' : 'border-border/40 opacity-60'
              }`}
            >
              <div className="flex items-center gap-4 flex-1 min-w-0">
                <div className="bg-primary/10 border border-primary/30 rounded-md px-3 py-1.5 font-mono font-bold text-primary text-sm">
                  {cupom.codigo}
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-foreground font-semibold text-sm">
                    {formatDesconto(cupom)} de desconto
                  </span>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                    <span>Usos: {cupom.uso_atual}{cupom.limite_uso !== null ? `/${cupom.limite_uso}` : ''}</span>
                    {cupom.validade && (
                      <span>Válido até: {new Date(cupom.validade + 'T00:00:00').toLocaleDateString('pt-BR')}</span>
                    )}
                    {!cupom.validade && <span>Sem validade</span>}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => handleToggle(cupom)}
                  title={cupom.ativo ? 'Desativar' : 'Ativar'}
                  className="text-muted-foreground hover:text-primary transition-colors"
                >
                  {cupom.ativo
                    ? <ToggleRight className="w-6 h-6 text-primary" />
                    : <ToggleLeft className="w-6 h-6" />}
                </button>
                <button
                  onClick={() => handleDelete(cupom.id)}
                  title="Excluir"
                  className="text-muted-foreground hover:text-destructive transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
