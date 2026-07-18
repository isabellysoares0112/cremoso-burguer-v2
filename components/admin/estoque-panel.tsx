'use client'

import { useState, useEffect } from 'react'
import { Plus, Pencil, Trash2, AlertTriangle, Package, Truck, BookOpen, RotateCcw, TrendingDown, TrendingUp, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useStore } from '@/lib/store'
import {
  loadInsumos, saveInsumos, loadMovimentacoes, saveMovimentacoes,
  loadFornecedores, saveFornecedores, loadReceitas, saveReceitas,
  type Insumo, type Movimentacao, type Fornecedor, type Receita,
} from '@/lib/estoque-utils'

type Tab = 'insumos' | 'movimentacoes' | 'receitas' | 'fornecedores' | 'alertas'

const UNIDADES = ['un', 'kg', 'g', 'l', 'ml', 'cx', 'pct', 'dt']
const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const fmtDate = (s: string) => new Date(s).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
const uid = () => crypto.randomUUID()

const emptyInsumo = (): Omit<Insumo, 'id'> => ({ nome: '', unidade: 'un', custo: 0, estoque: 0, estoqueMin: 0, fornecedorId: '', ativo: true })
const emptyForn = (): Omit<Fornecedor, 'id'> => ({ nome: '', telefone: '', email: '', obs: '' })

export function EstoquePanel() {
  const { products, loadProducts } = useStore()
  const [tab, setTab] = useState<Tab>('insumos')

  const [insumos, setInsumos] = useState<Insumo[]>([])
  const [movs, setMovs] = useState<Movimentacao[]>([])
  const [forns, setForns] = useState<Fornecedor[]>([])
  const [receitas, setReceitas] = useState<Receita[]>([])

  /* ── Insumos form ── */
  const [showFormIns, setShowFormIns] = useState(false)
  const [editIns, setEditIns] = useState<Insumo | null>(null)
  const [formIns, setFormIns] = useState(emptyInsumo())

  /* ── Movimentações form ── */
  const [showFormMov, setShowFormMov] = useState(false)
  const [formMov, setFormMov] = useState({ insumoId: '', tipo: 'entrada' as Movimentacao['tipo'], quantidade: '', custo: '', obs: '' })

  /* ── Fornecedores form ── */
  const [showFormForn, setShowFormForn] = useState(false)
  const [editForn, setEditForn] = useState<Fornecedor | null>(null)
  const [formForn, setFormForn] = useState(emptyForn())

  /* ── Receitas ── */
  const [selectedProd, setSelectedProd] = useState('')
  const [formRec, setFormRec] = useState({ insumoId: '', quantidade: '' })

  useEffect(() => {
    loadProducts()
    setInsumos(loadInsumos())
    setMovs(loadMovimentacoes())
    setForns(loadFornecedores())
    setReceitas(loadReceitas())
  }, [loadProducts])

  /* ── Insumos CRUD ── */
  const submitInsumo = () => {
    if (!formIns.nome) return
    if (editIns) {
      const updated = insumos.map(i => i.id === editIns.id ? { ...editIns, ...formIns } : i)
      setInsumos(updated); saveInsumos(updated)
    } else {
      const updated = [...insumos, { id: uid(), ...formIns }]
      setInsumos(updated); saveInsumos(updated)
    }
    setShowFormIns(false); setEditIns(null); setFormIns(emptyInsumo())
  }
  const deleteInsumo = (id: string) => {
    const updated = insumos.filter(i => i.id !== id)
    setInsumos(updated); saveInsumos(updated)
  }
  const startEditIns = (i: Insumo) => {
    setEditIns(i); setFormIns({ nome: i.nome, unidade: i.unidade, custo: i.custo, estoque: i.estoque, estoqueMin: i.estoqueMin, fornecedorId: i.fornecedorId, ativo: i.ativo })
    setShowFormIns(true)
  }

  /* ── Movimentações ── */
  const submitMov = () => {
    if (!formMov.insumoId || !formMov.quantidade) return
    const qty = parseFloat(formMov.quantidade)
    const mov: Movimentacao = { id: uid(), insumoId: formMov.insumoId, tipo: formMov.tipo, quantidade: qty, custo: parseFloat(formMov.custo) || 0, obs: formMov.obs, data: new Date().toISOString() }
    const updatedMovs = [mov, ...movs]
    setMovs(updatedMovs); saveMovimentacoes(updatedMovs)

    /* Update insumo stock */
    const delta = formMov.tipo === 'entrada' ? qty : -qty
    const updatedIns = insumos.map(i => i.id === formMov.insumoId ? { ...i, estoque: Math.max(0, i.estoque + delta) } : i)
    setInsumos(updatedIns); saveInsumos(updatedIns)

    setFormMov({ insumoId: '', tipo: 'entrada', quantidade: '', custo: '', obs: '' }); setShowFormMov(false)
  }

  /* ── Fornecedores CRUD ── */
  const submitForn = () => {
    if (!formForn.nome) return
    if (editForn) {
      const updated = forns.map(f => f.id === editForn.id ? { ...editForn, ...formForn } : f)
      setForns(updated); saveFornecedores(updated)
    } else {
      const updated = [...forns, { id: uid(), ...formForn }]
      setForns(updated); saveFornecedores(updated)
    }
    setShowFormForn(false); setEditForn(null); setFormForn(emptyForn())
  }
  const deleteForn = (id: string) => {
    const updated = forns.filter(f => f.id !== id)
    setForns(updated); saveFornecedores(updated)
  }
  const startEditForn = (f: Fornecedor) => {
    setEditForn(f); setFormForn({ nome: f.nome, telefone: f.telefone, email: f.email, obs: f.obs }); setShowFormForn(true)
  }

  /* ── Receitas ── */
  const addReceita = () => {
    if (!selectedProd || !formRec.insumoId || !formRec.quantidade) return
    const existing = receitas.filter(r => !(r.produtoId === selectedProd && r.insumoId === formRec.insumoId))
    const updated = [...existing, { produtoId: selectedProd, insumoId: formRec.insumoId, quantidade: parseFloat(formRec.quantidade) }]
    setReceitas(updated); saveReceitas(updated)
    setFormRec({ insumoId: '', quantidade: '' })
  }
  const removeReceita = (produtoId: string, insumoId: string) => {
    const updated = receitas.filter(r => !(r.produtoId === produtoId && r.insumoId === insumoId))
    setReceitas(updated); saveReceitas(updated)
  }

  const alertas = insumos.filter(i => i.ativo && i.estoque <= i.estoqueMin)
  const tabCls = (t: Tab) => `px-3 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${tab === t ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-muted'}`
  const prodRecipes = receitas.filter(r => r.produtoId === selectedProd)
  const selectedProdName = products.find(p => p.id === selectedProd)?.name || ''

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Estoque Inteligente</h1>
          <p className="text-muted-foreground text-sm">Insumos, movimentações e receitas</p>
        </div>
        {alertas.length > 0 && (
          <div className="flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/30 rounded-lg px-3 py-2 text-sm text-yellow-400 cursor-pointer" onClick={() => setTab('alertas')}>
            <AlertTriangle className="w-4 h-4" />
            <span className="font-semibold">{alertas.length} alerta{alertas.length > 1 ? 's' : ''}</span>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1.5 bg-muted/40 p-1 rounded-xl w-fit flex-wrap">
        <button className={tabCls('insumos')} onClick={() => setTab('insumos')}><Package className="w-3.5 h-3.5 inline mr-1" />Insumos</button>
        <button className={tabCls('movimentacoes')} onClick={() => setTab('movimentacoes')}><RotateCcw className="w-3.5 h-3.5 inline mr-1" />Movimentações</button>
        <button className={tabCls('receitas')} onClick={() => setTab('receitas')}><BookOpen className="w-3.5 h-3.5 inline mr-1" />Receitas</button>
        <button className={tabCls('fornecedores')} onClick={() => setTab('fornecedores')}><Truck className="w-3.5 h-3.5 inline mr-1" />Fornecedores</button>
        <button className={tabCls('alertas')} onClick={() => setTab('alertas')}>
          <AlertTriangle className="w-3.5 h-3.5 inline mr-1" />Alertas {alertas.length > 0 && <span className="ml-1 bg-yellow-500 text-black text-xs rounded-full w-4 h-4 inline-flex items-center justify-center font-bold">{alertas.length}</span>}
        </button>
      </div>

      {/* ── INSUMOS ── */}
      {tab === 'insumos' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => { setShowFormIns(!showFormIns); setEditIns(null); setFormIns(emptyInsumo()) }} className="bg-primary hover:bg-primary/90 text-primary-foreground text-sm">
              <Plus className="w-4 h-4 mr-1" /> {showFormIns ? 'Cancelar' : 'Novo Insumo'}
            </Button>
          </div>
          {showFormIns && (
            <div className="bg-card border border-border rounded-xl p-5 space-y-3">
              <h3 className="font-bold text-foreground text-sm">{editIns ? 'Editar Insumo' : 'Novo Insumo'}</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5 col-span-2">
                  <Label className="text-foreground text-xs">Nome *</Label>
                  <Input value={formIns.nome} onChange={e => setFormIns({ ...formIns, nome: e.target.value })} placeholder="Hambúrguer 150g" className="bg-muted border-border text-foreground" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-foreground text-xs">Unidade</Label>
                  <select value={formIns.unidade} onChange={e => setFormIns({ ...formIns, unidade: e.target.value })} className="w-full h-10 px-3 rounded-md bg-muted border border-border text-foreground text-sm">
                    {UNIDADES.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-foreground text-xs">Custo unitário (R$)</Label>
                  <Input type="number" min="0" step="0.01" value={formIns.custo || ''} onChange={e => setFormIns({ ...formIns, custo: parseFloat(e.target.value) || 0 })} placeholder="0.00" className="bg-muted border-border text-foreground" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-foreground text-xs">Estoque atual</Label>
                  <Input type="number" min="0" step="0.01" value={formIns.estoque || ''} onChange={e => setFormIns({ ...formIns, estoque: parseFloat(e.target.value) || 0 })} placeholder="0" className="bg-muted border-border text-foreground" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-foreground text-xs">Estoque mínimo</Label>
                  <Input type="number" min="0" step="0.01" value={formIns.estoqueMin || ''} onChange={e => setFormIns({ ...formIns, estoqueMin: parseFloat(e.target.value) || 0 })} placeholder="0" className="bg-muted border-border text-foreground" />
                </div>
                <div className="space-y-1.5 col-span-2">
                  <Label className="text-foreground text-xs">Fornecedor</Label>
                  <select value={formIns.fornecedorId} onChange={e => setFormIns({ ...formIns, fornecedorId: e.target.value })} className="w-full h-10 px-3 rounded-md bg-muted border border-border text-foreground text-sm">
                    <option value="">Sem fornecedor</option>
                    {forns.map(f => <option key={f.id} value={f.id}>{f.nome}</option>)}
                  </select>
                </div>
              </div>
              <Button onClick={submitInsumo} className="bg-primary hover:bg-primary/90 text-primary-foreground w-full">Salvar</Button>
            </div>
          )}
          {insumos.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">Nenhum insumo cadastrado. Clique em &ldquo;Novo Insumo&rdquo; para começar.</div>
          ) : (
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>{['Insumo', 'Unid.', 'Estoque', 'Mínimo', 'Custo', 'Fornecedor', ''].map(h => <th key={h} className="text-left px-4 py-3 text-xs text-muted-foreground font-semibold">{h}</th>)}</tr>
                </thead>
                <tbody>
                  {insumos.map(i => {
                    const baixo = i.estoque <= i.estoqueMin
                    const forn = forns.find(f => f.id === i.fornecedorId)
                    return (
                      <tr key={i.id} className="border-t border-border hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-3 font-medium text-foreground">{i.nome}</td>
                        <td className="px-4 py-3 text-muted-foreground">{i.unidade}</td>
                        <td className={`px-4 py-3 font-bold ${baixo ? 'text-destructive' : 'text-green-400'}`}>{i.estoque}</td>
                        <td className="px-4 py-3 text-muted-foreground">{i.estoqueMin}</td>
                        <td className="px-4 py-3 text-muted-foreground">{fmt(i.custo)}</td>
                        <td className="px-4 py-3 text-muted-foreground text-xs">{forn?.nome || '—'}</td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1">
                            <button onClick={() => startEditIns(i)} className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"><Pencil className="w-3.5 h-3.5" /></button>
                            <button onClick={() => deleteInsumo(i.id)} className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── MOVIMENTAÇÕES ── */}
      {tab === 'movimentacoes' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setShowFormMov(!showFormMov)} className="bg-primary hover:bg-primary/90 text-primary-foreground text-sm">
              <Plus className="w-4 h-4 mr-1" /> {showFormMov ? 'Cancelar' : 'Nova Movimentação'}
            </Button>
          </div>
          {showFormMov && (
            <div className="bg-card border border-border rounded-xl p-5 space-y-3">
              <h3 className="font-bold text-foreground text-sm">Registrar Movimentação</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5 col-span-2">
                  <Label className="text-foreground text-xs">Insumo *</Label>
                  <select value={formMov.insumoId} onChange={e => setFormMov({ ...formMov, insumoId: e.target.value })} className="w-full h-10 px-3 rounded-md bg-muted border border-border text-foreground text-sm">
                    <option value="">Selecione</option>
                    {insumos.map(i => <option key={i.id} value={i.id}>{i.nome} (atual: {i.estoque} {i.unidade})</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-foreground text-xs">Tipo *</Label>
                  <select value={formMov.tipo} onChange={e => setFormMov({ ...formMov, tipo: e.target.value as Movimentacao['tipo'] })} className="w-full h-10 px-3 rounded-md bg-muted border border-border text-foreground text-sm">
                    <option value="entrada">Entrada</option>
                    <option value="saida">Saída</option>
                    <option value="perda">Perda</option>
                    <option value="ajuste">Ajuste</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-foreground text-xs">Quantidade *</Label>
                  <Input type="number" min="0" step="0.01" value={formMov.quantidade} onChange={e => setFormMov({ ...formMov, quantidade: e.target.value })} placeholder="0" className="bg-muted border-border text-foreground" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-foreground text-xs">Custo (R$)</Label>
                  <Input type="number" min="0" step="0.01" value={formMov.custo} onChange={e => setFormMov({ ...formMov, custo: e.target.value })} placeholder="0.00" className="bg-muted border-border text-foreground" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-foreground text-xs">Observação</Label>
                  <Input value={formMov.obs} onChange={e => setFormMov({ ...formMov, obs: e.target.value })} placeholder="Nota fiscal, motivo..." className="bg-muted border-border text-foreground" />
                </div>
              </div>
              <Button onClick={submitMov} className="bg-primary hover:bg-primary/90 text-primary-foreground w-full">Registrar</Button>
            </div>
          )}
          {movs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">Nenhuma movimentação registrada.</div>
          ) : (
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>{['Data', 'Insumo', 'Tipo', 'Qtd', 'Custo', 'Obs'].map(h => <th key={h} className="text-left px-4 py-3 text-xs text-muted-foreground font-semibold">{h}</th>)}</tr>
                </thead>
                <tbody>
                  {movs.slice(0, 100).map(m => {
                    const ins = insumos.find(i => i.id === m.insumoId)
                    const isIn = m.tipo === 'entrada'
                    return (
                      <tr key={m.id} className="border-t border-border hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-3 text-xs text-muted-foreground">{fmtDate(m.data)}</td>
                        <td className="px-4 py-3 text-foreground font-medium">{ins?.nome || m.insumoId}</td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex items-center gap-1 w-fit ${m.tipo === 'entrada' ? 'bg-green-500/10 text-green-400' : m.tipo === 'perda' ? 'bg-red-500/10 text-red-400' : 'bg-muted text-muted-foreground'}`}>
                            {isIn ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}{m.tipo}
                          </span>
                        </td>
                        <td className={`px-4 py-3 font-bold ${isIn ? 'text-green-400' : 'text-destructive'}`}>{isIn ? '+' : '-'}{m.quantidade} {ins?.unidade || ''}</td>
                        <td className="px-4 py-3 text-muted-foreground">{m.custo > 0 ? fmt(m.custo) : '—'}</td>
                        <td className="px-4 py-3 text-muted-foreground text-xs">{m.obs || '—'}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── RECEITAS ── */}
      {tab === 'receitas' && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">Vincule ingredientes (insumos) a cada produto do cardápio. A baixa de estoque será automática a cada pedido.</p>
          <div className="space-y-1.5">
            <Label className="text-foreground text-xs">Selecionar produto</Label>
            <select value={selectedProd} onChange={e => setSelectedProd(e.target.value)} className="w-full h-10 px-3 rounded-md bg-muted border border-border text-foreground text-sm max-w-sm">
              <option value="">Selecione um produto</option>
              {products.filter(p => p.active !== false).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          {selectedProd && (
            <div className="bg-card border border-border rounded-xl p-5 space-y-4">
              <h3 className="font-bold text-foreground text-sm">Ingredientes — {selectedProdName}</h3>
              {prodRecipes.length > 0 ? (
                <div className="space-y-2">
                  {prodRecipes.map(r => {
                    const ins = insumos.find(i => i.id === r.insumoId)
                    return (
                      <div key={r.insumoId} className="flex items-center justify-between bg-muted/40 rounded-lg px-3 py-2">
                        <span className="text-sm text-foreground">{ins?.nome || r.insumoId}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-bold text-primary">{r.quantidade} {ins?.unidade || ''}</span>
                          <button onClick={() => removeReceita(selectedProd, r.insumoId)} className="text-muted-foreground hover:text-destructive transition-colors"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">Nenhum ingrediente vinculado.</p>
              )}
              {insumos.length > 0 && (
                <div className="flex gap-2 pt-2 border-t border-border">
                  <select value={formRec.insumoId} onChange={e => setFormRec({ ...formRec, insumoId: e.target.value })} className="flex-1 h-10 px-3 rounded-md bg-muted border border-border text-foreground text-sm">
                    <option value="">Selecionar insumo</option>
                    {insumos.map(i => <option key={i.id} value={i.id}>{i.nome} ({i.unidade})</option>)}
                  </select>
                  <Input type="number" min="0" step="0.01" value={formRec.quantidade} onChange={e => setFormRec({ ...formRec, quantidade: e.target.value })} placeholder="Qtd" className="w-20 bg-muted border-border text-foreground" />
                  <Button onClick={addReceita} className="bg-primary hover:bg-primary/90 text-primary-foreground shrink-0"><Plus className="w-4 h-4" /></Button>
                </div>
              )}
              {insumos.length === 0 && (
                <p className="text-xs text-muted-foreground">Cadastre insumos primeiro na aba &ldquo;Insumos&rdquo;.</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── FORNECEDORES ── */}
      {tab === 'fornecedores' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => { setShowFormForn(!showFormForn); setEditForn(null); setFormForn(emptyForn()) }} className="bg-primary hover:bg-primary/90 text-primary-foreground text-sm">
              <Plus className="w-4 h-4 mr-1" /> {showFormForn ? 'Cancelar' : 'Novo Fornecedor'}
            </Button>
          </div>
          {showFormForn && (
            <div className="bg-card border border-border rounded-xl p-5 space-y-3">
              <h3 className="font-bold text-foreground text-sm">{editForn ? 'Editar Fornecedor' : 'Novo Fornecedor'}</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5 col-span-2">
                  <Label className="text-foreground text-xs">Nome *</Label>
                  <Input value={formForn.nome} onChange={e => setFormForn({ ...formForn, nome: e.target.value })} placeholder="Distribuidora XYZ" className="bg-muted border-border text-foreground" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-foreground text-xs">Telefone</Label>
                  <Input value={formForn.telefone} onChange={e => setFormForn({ ...formForn, telefone: e.target.value })} placeholder="(33) 99999-9999" className="bg-muted border-border text-foreground" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-foreground text-xs">E-mail</Label>
                  <Input type="email" value={formForn.email} onChange={e => setFormForn({ ...formForn, email: e.target.value })} placeholder="contato@fornecedor.com" className="bg-muted border-border text-foreground" />
                </div>
                <div className="space-y-1.5 col-span-2">
                  <Label className="text-foreground text-xs">Observações</Label>
                  <Input value={formForn.obs} onChange={e => setFormForn({ ...formForn, obs: e.target.value })} placeholder="Dias de entrega, prazo de pagamento..." className="bg-muted border-border text-foreground" />
                </div>
              </div>
              <Button onClick={submitForn} className="bg-primary hover:bg-primary/90 text-primary-foreground w-full">Salvar</Button>
            </div>
          )}
          {forns.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">Nenhum fornecedor cadastrado.</div>
          ) : (
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>{['Fornecedor', 'Telefone', 'E-mail', 'Obs', ''].map(h => <th key={h} className="text-left px-4 py-3 text-xs text-muted-foreground font-semibold">{h}</th>)}</tr>
                </thead>
                <tbody>
                  {forns.map(f => (
                    <tr key={f.id} className="border-t border-border hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3 font-medium text-foreground">{f.nome}</td>
                      <td className="px-4 py-3 text-muted-foreground">{f.telefone || '—'}</td>
                      <td className="px-4 py-3 text-muted-foreground">{f.email || '—'}</td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">{f.obs || '—'}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          <button onClick={() => startEditForn(f)} className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"><Pencil className="w-3.5 h-3.5" /></button>
                          <button onClick={() => deleteForn(f.id)} className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── ALERTAS ── */}
      {tab === 'alertas' && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <RefreshCw className="w-4 h-4 text-muted-foreground cursor-pointer hover:text-foreground" onClick={() => setInsumos(loadInsumos())} />
            <span className="text-sm text-muted-foreground">Insumos abaixo do estoque mínimo</span>
          </div>
          {alertas.length === 0 ? (
            <div className="text-center py-12 text-green-400 space-y-2">
              <div className="text-4xl">✓</div>
              <p className="font-semibold">Estoque em ordem!</p>
              <p className="text-muted-foreground text-sm">Todos os insumos estão acima do mínimo.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {alertas.map(i => {
                const forn = forns.find(f => f.id === i.fornecedorId)
                const deficit = i.estoqueMin - i.estoque
                return (
                  <div key={i.id} className="bg-yellow-500/5 border border-yellow-500/30 rounded-xl p-4 flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-yellow-400 mt-0.5 shrink-0" />
                      <div>
                        <p className="font-bold text-foreground">{i.nome}</p>
                        <p className="text-sm text-muted-foreground mt-0.5">
                          Atual: <span className="text-destructive font-bold">{i.estoque} {i.unidade}</span> — Mínimo: <span className="text-foreground">{i.estoqueMin} {i.unidade}</span>
                        </p>
                        {forn && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Fornecedor: <span className="text-foreground">{forn.nome}</span>{forn.telefone && ` — ${forn.telefone}`}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs text-muted-foreground">Repor</p>
                      <p className="font-bold text-yellow-400">{deficit} {i.unidade}</p>
                      {i.custo > 0 && <p className="text-xs text-muted-foreground">{fmt(deficit * i.custo)}</p>}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
