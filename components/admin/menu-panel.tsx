'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { Plus, Pencil, Trash2, Check, X, Upload, UtensilsCrossed, Tags } from 'lucide-react'
import { useStore } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { uploadProductImage } from '@/lib/api'
import { AddonsPanel } from '@/components/admin/addons-panel'
import type { Product } from '@/lib/types'

const FALLBACK_CATEGORIES = [
  { slug: 'hamburgueres', name: 'Hambúrgueres' },
  { slug: 'combos', name: 'Combos' },
  { slug: 'acompanhamentos', name: 'Acompanhamentos' },
  { slug: 'bebidas', name: 'Bebidas' },
]

type Tab = 'produtos' | 'adicionais'

export function MenuPanel() {
  const {
    products,
    categories,
    loadProducts,
    loadCategories,
    addProduct,
    updateProduct,
    deleteProduct,
    addCategory,
    renameCategory,
    removeCategory,
  } = useStore()

  const [activeTab, setActiveTab] = useState<Tab>('produtos')
  const [isAdding, setIsAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [busy, setBusy] = useState(false)
  const [newCategory, setNewCategory] = useState('')
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const fileRef = useRef<HTMLInputElement | null>(null)

  const cats = categories.length > 0
    ? categories.map((c) => ({ slug: c.slug, name: c.name, id: c.id }))
    : FALLBACK_CATEGORIES.map((c) => ({ ...c, id: c.slug }))

  const [formData, setFormData] = useState<Partial<Product>>({
    name: '',
    description: '',
    price: 0,
    category: (cats[0]?.slug as Product['category']) || 'hamburgueres',
    image: '/images/cremoso-burguer.jpg',
    active: true,
  })

  useEffect(() => {
    loadProducts()
    loadCategories()
  }, [loadProducts, loadCategories])

  const formatPrice = (price: number) =>
    price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      price: 0,
      category: (cats[0]?.slug as Product['category']) || 'hamburgueres',
      image: '/images/cremoso-burguer.jpg',
      active: true,
    })
  }

  const handleAdd = async () => {
    if (!formData.name || !formData.price) return
    setBusy(true)
    await addProduct({
      name: formData.name || '',
      description: formData.description || '',
      price: Number(formData.price) || 0,
      category: (formData.category as Product['category']) || 'hamburgueres',
      image: formData.image || '/images/cremoso-burguer.jpg',
      active: formData.active ?? true,
      isBestSeller: !!formData.isBestSeller,
      isNew: !!formData.isNew,
    })
    setBusy(false)
    setIsAdding(false)
    resetForm()
  }

  const handleEdit = (product: Product) => {
    setEditingId(product.id)
    setFormData(product)
  }

  const handleUpdate = async () => {
    if (!editingId || !formData.name || !formData.price) return
    setBusy(true)
    await updateProduct(editingId, formData)
    setBusy(false)
    setEditingId(null)
    resetForm()
  }

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir este produto?')) {
      await deleteProduct(id)
    }
  }

  const toggleActive = async (id: string, active: boolean) => {
    await updateProduct(id, { active: !active })
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const url = await uploadProductImage(file)
      setFormData((prev) => ({ ...prev, image: url }))
    } catch (err) {
      alert(`Erro no upload: ${err instanceof Error ? err.message : 'desconhecido'}`)
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const handleAddCategory = async () => {
    const name = newCategory.trim()
    if (!name) return
    await addCategory({ name })
    setNewCategory('')
  }

  return (
    <div className="p-6 space-y-8">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">CARDÁPIO</h1>
        {activeTab === 'produtos' && (
          <Button
            onClick={() => setIsAdding(true)}
            className="bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            <Plus className="w-4 h-4 mr-2" />
            Adicionar produto
          </Button>
        )}
      </div>

      {/* Tab Switcher */}
      <div className="flex gap-1 bg-muted p-1 rounded-lg w-fit">
        <button
          onClick={() => setActiveTab('produtos')}
          className={`flex items-center gap-2 px-4 py-2 rounded-md font-semibold text-sm transition-all ${
            activeTab === 'produtos'
              ? 'bg-card text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <UtensilsCrossed className="w-4 h-4" />
          Produtos
        </button>
        <button
          onClick={() => setActiveTab('adicionais')}
          className={`flex items-center gap-2 px-4 py-2 rounded-md font-semibold text-sm transition-all ${
            activeTab === 'adicionais'
              ? 'bg-card text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Tags className="w-4 h-4" />
          Adicionais
        </button>
      </div>

      {/* ── ADICIONAIS TAB ── */}
      {activeTab === 'adicionais' && (
        <AddonsPanel />
      )}

      {/* ── PRODUTOS TAB ── */}
      {activeTab === 'produtos' && (
        <>
          {/* Categories management */}
          <div className="bg-card border border-border rounded-lg p-4">
            <h2 className="text-lg font-bold text-foreground mb-4">Categorias</h2>
            <div className="flex flex-wrap gap-2 mb-4">
              {categories.map((c) => (
                <div key={c.id} className="flex items-center gap-1 bg-muted rounded-full px-3 py-1">
                  {renamingId === c.id ? (
                    <>
                      <Input
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        className="h-7 w-32"
                      />
                      <button
                        onClick={async () => {
                          if (renameValue.trim()) await renameCategory(c.id, renameValue.trim())
                          setRenamingId(null)
                        }}
                        className="text-primary"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button onClick={() => setRenamingId(null)} className="text-muted-foreground">
                        <X className="w-4 h-4" />
                      </button>
                    </>
                  ) : (
                    <>
                      <span className="text-foreground text-sm">{c.name}</span>
                      <button
                        onClick={() => {
                          setRenamingId(c.id)
                          setRenameValue(c.name)
                        }}
                        className="text-muted-foreground hover:text-primary ml-1"
                        title="Renomear"
                      >
                        <Pencil className="w-3 h-3" />
                      </button>
                      <button
                        onClick={async () => {
                          if (confirm(`Excluir categoria "${c.name}"?`)) await removeCategory(c.id)
                        }}
                        className="text-muted-foreground hover:text-destructive"
                        title="Excluir"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </>
                  )}
                </div>
              ))}
            </div>
            <div className="flex gap-2 max-w-md">
              <Input
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                placeholder="Nova categoria"
                className="bg-muted border-border"
              />
              <Button onClick={handleAddCategory} className="bg-primary text-primary-foreground">
                Adicionar
              </Button>
            </div>
          </div>

          {/* Add/Edit Form */}
          {(isAdding || editingId) && (
            <div className="bg-card border border-border rounded-lg p-6">
              <h2 className="text-lg font-bold text-foreground mb-4">
                {isAdding ? 'Adicionar Produto' : 'Editar Produto'}
              </h2>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-foreground">Nome</Label>
                  <Input
                    value={formData.name || ''}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="bg-muted border-border"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-foreground">Categoria</Label>
                  <select
                    value={formData.category || cats[0]?.slug}
                    onChange={(e) =>
                      setFormData({ ...formData, category: e.target.value as Product['category'] })
                    }
                    className="w-full h-10 px-3 rounded-md bg-muted border border-border text-foreground"
                  >
                    {cats.map((cat) => (
                      <option key={cat.slug} value={cat.slug}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label className="text-foreground">Descrição</Label>
                  <Input
                    value={formData.description || ''}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="bg-muted border-border"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-foreground">Preço (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.price || ''}
                    onChange={(e) =>
                      setFormData({ ...formData, price: parseFloat(e.target.value) })
                    }
                    className="bg-muted border-border"
                  />
                </div>
                <div className="space-y-3">
                  <Label className="text-foreground">Badges</Label>
                  <div className="flex flex-col gap-2">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={!!formData.isBestSeller}
                        onChange={(e) => setFormData({ ...formData, isBestSeller: e.target.checked, isNew: e.target.checked ? false : formData.isNew })}
                        className="w-4 h-4 accent-primary"
                      />
                      <span className="text-sm text-foreground">🔥 Mais Pedido</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={!!formData.isNew}
                        onChange={(e) => setFormData({ ...formData, isNew: e.target.checked, isBestSeller: e.target.checked ? false : formData.isBestSeller })}
                        className="w-4 h-4 accent-primary"
                      />
                      <span className="text-sm text-foreground">🆕 Novidade</span>
                    </label>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-foreground">Imagem</Label>
                  <div className="flex gap-2">
                    <Input
                      value={formData.image || ''}
                      onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                      className="bg-muted border-border"
                      placeholder="URL ou faça upload"
                    />
                    <input
                      ref={fileRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleImageUpload}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => fileRef.current?.click()}
                      disabled={uploading}
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      {uploading ? 'Enviando...' : 'Upload'}
                    </Button>
                  </div>
                  {formData.image ? (
                    <div className="relative w-24 h-24 rounded-lg overflow-hidden bg-muted mt-2">
                      <Image src={formData.image} alt="preview" fill className="object-cover" />
                    </div>
                  ) : null}
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <Button
                  onClick={isAdding ? handleAdd : handleUpdate}
                  disabled={busy}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  <Check className="w-4 h-4 mr-2" />
                  {busy ? 'Salvando...' : isAdding ? 'Adicionar' : 'Salvar'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsAdding(false)
                    setEditingId(null)
                    resetForm()
                  }}
                >
                  <X className="w-4 h-4 mr-2" />
                  Cancelar
                </Button>
              </div>
            </div>
          )}

          {/* Products Table */}
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-muted">
                <tr>
                  <th className="text-left p-4 text-foreground font-bold">Produto</th>
                  <th className="text-left p-4 text-foreground font-bold hidden md:table-cell">
                    Categoria
                  </th>
                  <th className="text-left p-4 text-foreground font-bold">Preço</th>
                  <th className="text-left p-4 text-foreground font-bold">Status</th>
                  <th className="text-left p-4 text-foreground font-bold">Ações</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => (
                  <tr key={product.id} className="border-t border-border">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-muted">
                          <Image src={product.image} alt={product.name} fill className="object-cover" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-bold text-foreground">{product.name}</p>
                            {product.isBestSeller && (
                              <span className="text-[10px] bg-primary/20 text-primary font-bold px-1.5 py-0.5 rounded-full">🔥</span>
                            )}
                            {product.isNew && (
                              <span className="text-[10px] bg-secondary/20 text-secondary-foreground font-bold px-1.5 py-0.5 rounded-full">🆕</span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-1 max-w-xs">
                            {product.description}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-muted-foreground capitalize hidden md:table-cell">
                      {cats.find((c) => c.slug === product.category)?.name || product.category}
                    </td>
                    <td className="p-4 text-foreground font-bold">{formatPrice(product.price)}</td>
                    <td className="p-4">
                      <button
                        onClick={() => toggleActive(product.id, product.active)}
                        className={`px-3 py-1 rounded-full text-xs font-bold ${
                          product.active
                            ? 'bg-green-600/20 text-green-500'
                            : 'bg-destructive/20 text-destructive'
                        }`}
                      >
                        {product.active ? 'Ativo' : 'Inativo'}
                      </button>
                    </td>
                    <td className="p-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(product)}
                          className="p-2 rounded-lg bg-muted hover:bg-primary/20 text-muted-foreground hover:text-primary transition-colors"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(product.id)}
                          className="p-2 rounded-lg bg-muted hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {products.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-muted-foreground">
                      Nenhum produto cadastrado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
