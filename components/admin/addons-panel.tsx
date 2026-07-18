'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  Plus, Pencil, Trash2, Check, X,
  ToggleLeft, ToggleRight, Loader2, AlertTriangle,
  Copy, CheckCheck, ExternalLink,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { AddonDB } from '@/lib/types'

interface Category {
  id: string
  slug: string
  name: string
}

const BEBIDAS_SLUG = 'bebidas'

const MIGRATION_SQL = `create table if not exists adicionais_categoria (
  id uuid primary key default gen_random_uuid(),
  categoria_slug text not null,
  nome text not null,
  preco numeric(10,2) not null default 0,
  ativo boolean not null default true,
  ordem int default 0,
  created_at timestamptz default now()
);
alter table adicionais_categoria enable row level security;
create policy "Public read" on adicionais_categoria
  for select using (true);
create policy "Service role write" on adicionais_categoria
  using (auth.role() = 'service_role');`

interface FormState {
  nome: string
  preco: string
  ativo: boolean
  ordem: string
  categoria_slug: string
}

const emptyForm = (slug: string): FormState => ({
  nome: '',
  preco: '',
  ativo: true,
  ordem: '0',
  categoria_slug: slug,
})

export function AddonsPanel() {
  const [categories, setCategories] = useState<Category[]>([])
  const [selectedSlug, setSelectedSlug] = useState<string>('')
  const [addonsList, setAddonsList] = useState<AddonDB[]>([])
  const [loadingCats, setLoadingCats] = useState(true)
  const [loadingAddons, setLoadingAddons] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [tableNotFound, setTableNotFound] = useState(false)
  const [checking, setChecking] = useState(false)
  const [copied, setCopied] = useState(false)

  const [isAdding, setIsAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm(''))

  const nonDrinksCategories = categories.filter((c) => c.slug !== BEBIDAS_SLUG)

  const fetchCategories = useCallback(async () => {
    setLoadingCats(true)
    try {
      const res = await fetch('/api/admin/categories')
      const json = await res.json()
      const cats: Category[] = json.categories ?? []
      setCategories(cats)
      const nonDrinks = cats.filter((c) => c.slug !== BEBIDAS_SLUG)
      if (nonDrinks.length > 0) {
        setSelectedSlug((prev) => prev || nonDrinks[0].slug)
      }
    } catch {
      setError('Erro ao carregar categorias.')
    } finally {
      setLoadingCats(false)
    }
  }, [])

  const fetchAddons = useCallback(async (slug: string) => {
    if (!slug || slug === BEBIDAS_SLUG) {
      setAddonsList([])
      return
    }
    setLoadingAddons(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/adicionais?categoria_slug=${encodeURIComponent(slug)}`)
      const json = await res.json()
      if (json.tableNotFound) {
        setTableNotFound(true)
        setAddonsList([])
        return
      }
      if (!res.ok) throw new Error(json.error || 'Erro')
      setTableNotFound(false)
      setAddonsList(json.adicionais ?? [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar adicionais')
    } finally {
      setLoadingAddons(false)
    }
  }, [])

  useEffect(() => { fetchCategories() }, [fetchCategories])

  useEffect(() => {
    if (selectedSlug) fetchAddons(selectedSlug)
  }, [selectedSlug, fetchAddons])

  const handleCheckAgain = async () => {
    setChecking(true)
    await fetchCategories()
    if (selectedSlug) await fetchAddons(selectedSlug)
    setChecking(false)
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(MIGRATION_SQL)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch { /* ignore */ }
  }

  const formatPrice = (price: number) =>
    price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

  const handleOpenAdd = () => {
    setForm(emptyForm(selectedSlug))
    setIsAdding(true)
    setEditingId(null)
  }

  const handleOpenEdit = (a: AddonDB) => {
    setForm({
      nome: a.nome,
      preco: a.preco.toFixed(2),
      ativo: a.ativo,
      ordem: String(a.ordem),
      categoria_slug: a.categoriaSlug,
    })
    setEditingId(a.id)
    setIsAdding(false)
  }

  const handleCancel = () => {
    setIsAdding(false)
    setEditingId(null)
    setForm(emptyForm(selectedSlug))
  }

  const handleSave = async () => {
    if (!form.nome.trim()) return
    setBusy(true)
    setError(null)
    try {
      const payload = {
        nome: form.nome.trim(),
        preco: parseFloat(form.preco) || 0,
        ativo: form.ativo,
        ordem: parseInt(form.ordem) || 0,
        categoria_slug: form.categoria_slug || selectedSlug,
      }
      const res = isAdding
        ? await fetch('/api/admin/adicionais', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })
        : await fetch(`/api/admin/adicionais/${editingId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })
      const json = await res.json()
      if (json.tableNotFound) { setTableNotFound(true); return }
      if (!res.ok) throw new Error(json.error || 'Erro ao salvar')
      await fetchAddons(selectedSlug)
      handleCancel()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao salvar')
    } finally {
      setBusy(false)
    }
  }

  const handleDelete = async (id: string, nome: string) => {
    if (!confirm(`Excluir adicional "${nome}"?`)) return
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/adicionais/${id}`, { method: 'DELETE' })
      const json = await res.json()
      if (json.tableNotFound) { setTableNotFound(true); return }
      if (!res.ok) throw new Error(json.error || 'Erro ao excluir')
      await fetchAddons(selectedSlug)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao excluir')
    } finally {
      setBusy(false)
    }
  }

  const handleToggleAtivo = async (a: AddonDB) => {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/adicionais/${a.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ativo: !a.ativo }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Erro')
      setAddonsList((prev) =>
        prev.map((item) => (item.id === a.id ? { ...item, ativo: !a.ativo } : item))
      )
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro')
    } finally {
      setBusy(false)
    }
  }

  const isBebidas = selectedSlug === BEBIDAS_SLUG

  // ── One-time setup needed ──
  if (tableNotFound) {
    return (
      <div className="space-y-5 max-w-2xl">
        <div>
          <h2 className="text-lg font-bold text-foreground">Adicionais por Categoria</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Configuração única necessária.</p>
        </div>

        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-5 space-y-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-foreground">Tabela não encontrada no Supabase</p>
              <p className="text-sm text-muted-foreground mt-1">
                Execute o SQL abaixo no{' '}
                <a
                  href="https://supabase.com/dashboard/project/zhzlctetqzfypztvpzfg/editor"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline text-primary"
                >
                  SQL Editor do Supabase
                </a>
                {' '}e clique em "Verificar".
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-end gap-2">
              <a
                href="https://supabase.com/dashboard/project/zhzlctetqzfypztvpzfg/editor"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-muted hover:bg-muted/80 text-sm text-foreground transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Abrir SQL Editor
              </a>
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary hover:bg-primary/90 text-primary-foreground text-sm transition-colors"
              >
                {copied ? <CheckCheck className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copiado!' : 'Copiar SQL'}
              </button>
            </div>
            <pre className="bg-card border border-border rounded-lg p-4 text-xs text-muted-foreground overflow-x-auto leading-relaxed whitespace-pre-wrap select-all">
              {MIGRATION_SQL}
            </pre>
          </div>

          <div className="border-t border-yellow-500/20 pt-4">
            <Button
              onClick={handleCheckAgain}
              disabled={checking}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {checking
                ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Verificando...</>
                : <><Check className="w-4 h-4 mr-2" />Já executei — Verificar</>}
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // ── Normal UI ──
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-foreground">Adicionais por Categoria</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Adicionais são exibidos no modal do produto, agrupados por categoria.
          </p>
        </div>
        {!isBebidas && selectedSlug && (
          <Button
            onClick={handleOpenAdd}
            className="bg-primary hover:bg-primary/90 text-primary-foreground shrink-0"
            disabled={isAdding || !!editingId}
          >
            <Plus className="w-4 h-4 mr-2" />
            Novo adicional
          </Button>
        )}
      </div>

      {/* Category tabs */}
      {loadingCats ? (
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          <Loader2 className="w-4 h-4 animate-spin" />
          Carregando categorias...
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {categories.map((cat) => (
            <button
              key={cat.slug}
              onClick={() => {
                setSelectedSlug(cat.slug)
                setIsAdding(false)
                setEditingId(null)
              }}
              className={`px-4 py-2 rounded-full font-semibold text-sm transition-all ${
                selectedSlug === cat.slug
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground'
              }`}
            >
              {cat.name}
              {cat.slug === BEBIDAS_SLUG && (
                <span className="ml-1.5 text-xs opacity-60">— sem adicionais</span>
              )}
            </button>
          ))}
        </div>
      )}

      {isBebidas && (
        <div className="flex items-start gap-3 bg-muted/50 border border-border rounded-lg p-4 text-sm text-muted-foreground">
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-yellow-500" />
          <div>
            <p className="font-semibold text-foreground mb-1">Bebidas não possuem adicionais</p>
            <p>Esta categoria não aceita adicionais. Selecione outra categoria para gerenciar.</p>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-destructive/10 border border-destructive/30 text-destructive text-sm rounded-lg p-3 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Add/Edit form */}
      {(isAdding || editingId) && !isBebidas && (
        <div className="bg-card border border-border rounded-lg p-5">
          <h3 className="font-bold text-foreground mb-4">
            {isAdding ? 'Novo Adicional' : 'Editar Adicional'}
          </h3>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-foreground text-sm">Nome *</Label>
              <Input
                value={form.nome}
                onChange={(e) => setForm({ ...form, nome: e.target.value })}
                placeholder="Ex: Bacon"
                className="bg-muted border-border"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-foreground text-sm">Preço (R$) *</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={form.preco}
                onChange={(e) => setForm({ ...form, preco: e.target.value })}
                placeholder="Ex: 5.00"
                className="bg-muted border-border"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-foreground text-sm">Categoria</Label>
              <select
                value={form.categoria_slug}
                onChange={(e) => setForm({ ...form, categoria_slug: e.target.value })}
                className="w-full h-10 px-3 rounded-md bg-muted border border-border text-foreground text-sm"
              >
                {nonDrinksCategories.map((c) => (
                  <option key={c.slug} value={c.slug}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-foreground text-sm">Ordem</Label>
              <Input
                type="number"
                min="0"
                value={form.ordem}
                onChange={(e) => setForm({ ...form, ordem: e.target.value })}
                placeholder="0"
                className="bg-muted border-border"
              />
            </div>
            <div className="flex items-center gap-3 sm:col-span-2">
              <Label className="text-foreground text-sm">Status</Label>
              <button
                type="button"
                onClick={() => setForm({ ...form, ativo: !form.ativo })}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                  form.ativo
                    ? 'bg-green-600/20 text-green-500 border border-green-600/30'
                    : 'bg-muted text-muted-foreground border border-border'
                }`}
              >
                {form.ativo
                  ? <><ToggleRight className="w-4 h-4" /> Ativo</>
                  : <><ToggleLeft className="w-4 h-4" /> Inativo</>}
              </button>
            </div>
          </div>
          <div className="flex gap-2 mt-5">
            <Button
              onClick={handleSave}
              disabled={busy || !form.nome.trim()}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {busy
                ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Salvando...</>
                : <><Check className="w-4 h-4 mr-2" />{isAdding ? 'Adicionar' : 'Salvar'}</>}
            </Button>
            <Button variant="outline" onClick={handleCancel} disabled={busy}>
              <X className="w-4 h-4 mr-2" />Cancelar
            </Button>
          </div>
        </div>
      )}

      {/* List */}
      {!isBebidas && selectedSlug && (
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          {loadingAddons ? (
            <div className="flex items-center justify-center gap-2 py-10 text-muted-foreground text-sm">
              <Loader2 className="w-5 h-5 animate-spin" />
              Carregando adicionais...
            </div>
          ) : addonsList.length === 0 ? (
            <div className="py-10 text-center text-muted-foreground text-sm">
              <p>Nenhum adicional cadastrado para esta categoria.</p>
              <p className="mt-1">Clique em "+ Novo adicional" para começar.</p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-muted">
                <tr>
                  <th className="text-left p-4 text-foreground font-bold text-sm">Adicional</th>
                  <th className="text-left p-4 text-foreground font-bold text-sm">Preço</th>
                  <th className="text-left p-4 text-foreground font-bold text-sm hidden sm:table-cell">Ordem</th>
                  <th className="text-left p-4 text-foreground font-bold text-sm">Status</th>
                  <th className="text-left p-4 text-foreground font-bold text-sm">Ações</th>
                </tr>
              </thead>
              <tbody>
                {addonsList.map((a) => (
                  <tr key={a.id} className="border-t border-border hover:bg-muted/20 transition-colors">
                    <td className="p-4">
                      <p className="font-semibold text-foreground text-sm">{a.nome}</p>
                    </td>
                    <td className="p-4 text-foreground font-bold text-sm">{formatPrice(a.preco)}</td>
                    <td className="p-4 text-muted-foreground text-sm hidden sm:table-cell">{a.ordem}</td>
                    <td className="p-4">
                      <button
                        onClick={() => handleToggleAtivo(a)}
                        disabled={busy}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-all ${
                          a.ativo
                            ? 'bg-green-600/20 text-green-500'
                            : 'bg-destructive/20 text-destructive'
                        } disabled:opacity-50`}
                      >
                        {a.ativo
                          ? <><ToggleRight className="w-3.5 h-3.5" /> Ativo</>
                          : <><ToggleLeft className="w-3.5 h-3.5" /> Inativo</>}
                      </button>
                    </td>
                    <td className="p-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleOpenEdit(a)}
                          disabled={busy}
                          className="p-2 rounded-lg bg-muted hover:bg-primary/20 text-muted-foreground hover:text-primary transition-colors disabled:opacity-50"
                          title="Editar"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(a.id, a.nome)}
                          disabled={busy}
                          className="p-2 rounded-lg bg-muted hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-colors disabled:opacity-50"
                          title="Excluir"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  )
}
