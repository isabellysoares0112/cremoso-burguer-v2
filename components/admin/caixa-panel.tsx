'use client'

import { useState, useEffect, useCallback } from 'react'
import { CreditCard, Banknote, QrCode, Link as LinkIcon, RefreshCw, TrendingDown, TrendingUp, Wallet, ShoppingBag } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { format, subDays, startOfDay } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface CaixaMov {
  id: string
  tipo: 'abertura' | 'fechamento' | 'sangria' | 'suprimento'
  valor: number
  obs: string
  data: string
}

interface CaixaData {
  isOpen: boolean
  openedAt?: string
  totalInicial: number
  movimentos: CaixaMov[]
}

interface OrderSummary {
  number: number
  customer: { name: string }
  total: number
  paymentMethod: string
  status: string
  createdAt: string
}

const CAIXA_KEY = 'cremoso-caixa-v1'

function loadCaixa(): CaixaData {
  try {
    return JSON.parse(localStorage.getItem(CAIXA_KEY) || 'null') || { isOpen: false, totalInicial: 0, movimentos: [] }
  } catch {
    return { isOpen: false, totalInicial: 0, movimentos: [] }
  }
}
function saveCaixa(d: CaixaData) {
  try { localStorage.setItem(CAIXA_KEY, JSON.stringify(d)) } catch { /* ignore */ }
}

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const todayStr = () => new Date().toISOString().slice(0, 10)
const fmtTime = (s: string) => new Date(s).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

type Tab = 'caixa' | 'historico' | 'relatorio'

export function CaixaPanel() {
  const [tab, setTab] = useState<Tab>('caixa')
  const [caixa, setCaixa] = useState<CaixaData>({ isOpen: false, totalInicial: 0, movimentos: [] })
  const [caixaValor, setCaixaValor] = useState('')
  const [caixaObs, setCaixaObs] = useState('')
  const [caixaAction, setCaixaAction] = useState<'sangria' | 'suprimento' | null>(null)
  const [valorInicial, setValorInicial] = useState('')

  const [orders, setOrders] = useState<OrderSummary[]>([])
  const [loadingOrders, setLoadingOrders] = useState(false)
  const [dateFilter, setDateFilter] = useState(todayStr())

  useEffect(() => {
    setCaixa(loadCaixa())
  }, [])

  const fetchOrders = useCallback(async () => {
    setLoadingOrders(true)
    try {
      const r = await fetch('/api/admin/orders', { cache: 'no-store' })
      const j = await r.json()
      setOrders(j.orders || [])
    } catch { /* ignore */ }
    finally { setLoadingOrders(false) }
  }, [])

  useEffect(() => {
    fetchOrders()
    let cleanup: (() => void) | null = null
    import('@/lib/api').then(({ subscribeToOrders }) => {
      cleanup = subscribeToOrders(() => fetchOrders())
    })
    return () => { if (cleanup) cleanup() }
  }, [fetchOrders])

  useEffect(() => {
    if (tab === 'historico' || tab === 'relatorio') fetchOrders()
  }, [tab, fetchOrders])

  /* Filtered by date — cancelados excluídos dos cálculos financeiros */
  const filteredOrders = orders.filter(o => o.createdAt?.slice(0, 10) === dateFilter && o.status !== 'cancelado')
  const todayOrders = orders.filter(o => o.createdAt?.slice(0, 10) === todayStr() && o.status !== 'cancelado')

  /* Totals by payment method */
  const calcTotals = (list: OrderSummary[]) => ({
    pix:      list.filter(o => o.paymentMethod === 'pix').reduce((s, o) => s + (o.total || 0), 0),
    cartao:   list.filter(o => o.paymentMethod === 'cartao').reduce((s, o) => s + (o.total || 0), 0),
    dinheiro: list.filter(o => o.paymentMethod === 'dinheiro').reduce((s, o) => s + (o.total || 0), 0),
    link:     list.filter(o => o.paymentMethod === 'link').reduce((s, o) => s + (o.total || 0), 0),
    total:    list.reduce((s, o) => s + (o.total || 0), 0),
  })

  const todayTotals = calcTotals(todayOrders)
  const filteredTotals = calcTotals(filteredOrders)

  /* Caixa movements today */
  const todayMoves = caixa.movimentos.filter(m => m.data.slice(0, 10) === todayStr())
  const caixaSaldo = caixa.movimentos.reduce((s, m) =>
    m.tipo === 'sangria' ? s - m.valor : s + m.valor, 0)

  /* 7-day chart data */
  const chartData = Array.from({ length: 7 }, (_, i) => {
    const d = subDays(new Date(), 6 - i)
    const ds = startOfDay(d)
    const dayStr = d.toISOString().slice(0, 10)
    const dayOrders = orders.filter(o => o.createdAt?.slice(0, 10) === dayStr && o.status !== 'cancelado')
    return {
      label: format(ds, 'EEE', { locale: ptBR }),
      date: dayStr,
      total: dayOrders.reduce((s, o) => s + (o.total || 0), 0),
      count: dayOrders.length,
      pix: dayOrders.filter(o => o.paymentMethod === 'pix').reduce((s, o) => s + (o.total || 0), 0),
      cartao: dayOrders.filter(o => o.paymentMethod === 'cartao').reduce((s, o) => s + (o.total || 0), 0),
      dinheiro: dayOrders.filter(o => o.paymentMethod === 'dinheiro').reduce((s, o) => s + (o.total || 0), 0),
    }
  })

  /* Caixa actions */
  const abrirCaixa = () => {
    const val = parseFloat(valorInicial) || 0
    const novo: CaixaData = {
      isOpen: true,
      openedAt: new Date().toISOString(),
      totalInicial: val,
      movimentos: [{
        id: crypto.randomUUID(), tipo: 'abertura', valor: val,
        obs: 'Abertura de caixa', data: new Date().toISOString(),
      }],
    }
    setCaixa(novo); saveCaixa(novo); setValorInicial('')
  }

  const fecharCaixa = () => {
    const novo: CaixaData = {
      ...caixa, isOpen: false,
      movimentos: [...caixa.movimentos, {
        id: crypto.randomUUID(), tipo: 'fechamento', valor: caixaSaldo,
        obs: 'Fechamento de caixa', data: new Date().toISOString(),
      }],
    }
    setCaixa(novo); saveCaixa(novo)
  }

  const addMovCaixa = () => {
    if (!caixaAction) return
    const val = parseFloat(caixaValor)
    if (!val || val <= 0) return
    const mov: CaixaMov = {
      id: crypto.randomUUID(), tipo: caixaAction,
      valor: val, obs: caixaObs || caixaAction, data: new Date().toISOString(),
    }
    const novo = { ...caixa, movimentos: [...caixa.movimentos, mov] }
    setCaixa(novo); saveCaixa(novo)
    setCaixaValor(''); setCaixaObs(''); setCaixaAction(null)
  }

  const paymentIcons: Record<string, React.ElementType> = {
    pix: QrCode, cartao: CreditCard, dinheiro: Banknote, link: LinkIcon,
  }
  const paymentLabels: Record<string, string> = {
    pix: 'PIX', cartao: 'Cartão', dinheiro: 'Dinheiro', link: 'Link',
  }
  const paymentColors: Record<string, string> = {
    pix: 'text-yellow-400', cartao: 'text-blue-400', dinheiro: 'text-green-400', link: 'text-purple-400',
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: 'caixa', label: 'Caixa' },
    { id: 'historico', label: 'Histórico' },
    { id: 'relatorio', label: 'Relatório' },
  ]

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-foreground">CAIXA</h1>

      {/* Tabs */}
      <div className="flex gap-1 bg-muted rounded-xl p-1 w-fit">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              tab === t.id
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── CAIXA TAB ── */}
      {tab === 'caixa' && (
        <div className="space-y-4">
          {/* Resumo hoje */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'PIX hoje',      value: todayTotals.pix,      color: 'text-yellow-400', icon: QrCode },
              { label: 'Cartão hoje',   value: todayTotals.cartao,   color: 'text-blue-400',   icon: CreditCard },
              { label: 'Dinheiro hoje', value: todayTotals.dinheiro, color: 'text-green-400',  icon: Banknote },
              { label: 'Total hoje',    value: todayTotals.total,    color: 'text-primary',    icon: Wallet },
            ].map(({ label, value, color, icon: Icon }) => (
              <div key={label} className="bg-card border border-border rounded-xl p-4">
                <Icon className={`w-4 h-4 ${color} mb-2`} />
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className={`text-lg font-bold ${color}`}>{fmt(value)}</p>
              </div>
            ))}
          </div>

          {/* Caixa status */}
          <div className="bg-card border border-border rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-foreground">
                  Status: {caixa.isOpen
                    ? <span className="text-green-400">Aberto</span>
                    : <span className="text-destructive">Fechado</span>}
                </h3>
                {caixa.isOpen && caixa.openedAt && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Aberto às {fmtTime(caixa.openedAt)} — Saldo: <span className="text-primary font-bold">{fmt(caixaSaldo)}</span>
                  </p>
                )}
              </div>
              {!caixa.isOpen ? (
                <div className="flex items-end gap-2">
                  <div className="space-y-1">
                    <Label className="text-foreground text-xs">Troco inicial</Label>
                    <Input
                      type="number" min="0" step="0.01"
                      value={valorInicial}
                      onChange={e => setValorInicial(e.target.value)}
                      placeholder="0,00"
                      className="bg-muted border-border text-foreground w-28"
                    />
                  </div>
                  <Button onClick={abrirCaixa} className="bg-green-600 hover:bg-green-700 text-white">
                    Abrir Caixa
                  </Button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setCaixaAction(a => a === 'sangria' ? null : 'sangria')}
                    className={`text-sm ${caixaAction === 'sangria' ? 'border-destructive text-destructive' : ''}`}
                  >
                    <TrendingDown className="w-4 h-4 mr-1" /> Sangria
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setCaixaAction(a => a === 'suprimento' ? null : 'suprimento')}
                    className={`text-sm ${caixaAction === 'suprimento' ? 'border-green-500 text-green-400' : ''}`}
                  >
                    <TrendingUp className="w-4 h-4 mr-1" /> Suprimento
                  </Button>
                  <Button
                    onClick={fecharCaixa}
                    variant="outline"
                    className="text-sm border-destructive text-destructive hover:bg-destructive/10"
                  >
                    Fechar Caixa
                  </Button>
                </div>
              )}
            </div>

            {caixaAction && (
              <div className="flex gap-2 pt-2 border-t border-border">
                <Input
                  value={caixaValor} onChange={e => setCaixaValor(e.target.value)}
                  type="number" placeholder="Valor" className="bg-muted border-border text-foreground w-32"
                />
                <Input
                  value={caixaObs} onChange={e => setCaixaObs(e.target.value)}
                  placeholder="Observação" className="bg-muted border-border text-foreground flex-1"
                />
                <Button onClick={addMovCaixa} className="bg-primary hover:bg-primary/90 text-primary-foreground shrink-0">
                  Confirmar
                </Button>
              </div>
            )}
          </div>

          {/* Movimentos do dia */}
          <div className="bg-card border border-border rounded-xl p-5 space-y-3">
            <h3 className="font-bold text-foreground text-sm">Movimentos de hoje</h3>
            {todayMoves.length === 0 ? (
              <p className="text-muted-foreground text-sm">Nenhuma movimentação hoje.</p>
            ) : (
              <div className="space-y-2">
                {todayMoves.map(m => (
                  <div key={m.id} className="flex items-center justify-between text-sm border-b border-border pb-2 last:border-0 last:pb-0">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        m.tipo === 'sangria'
                          ? 'bg-destructive/10 text-destructive'
                          : m.tipo === 'suprimento'
                            ? 'bg-green-500/10 text-green-400'
                            : 'bg-muted text-muted-foreground'
                      }`}>{m.tipo}</span>
                      <span className="text-muted-foreground truncate max-w-[160px]">{m.obs}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`font-bold ${m.tipo === 'sangria' ? 'text-destructive' : 'text-green-400'}`}>
                        {m.tipo === 'sangria' ? '-' : '+'}{fmt(m.valor)}
                      </span>
                      <span className="text-xs text-muted-foreground">{fmtTime(m.data)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── HISTÓRICO TAB ── */}
      {tab === 'historico' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Input
                type="date"
                value={dateFilter}
                onChange={e => setDateFilter(e.target.value)}
                className="bg-muted border-border text-foreground w-44"
              />
              <span className="text-sm text-muted-foreground">
                {filteredOrders.length} pedido(s)
              </span>
            </div>
            <Button onClick={fetchOrders} variant="outline" size="sm" className="border-border text-muted-foreground" disabled={loadingOrders}>
              <RefreshCw className={`w-3.5 h-3.5 mr-1 ${loadingOrders ? 'animate-spin' : ''}`} /> Atualizar
            </Button>
          </div>

          {/* Payment totals */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {(['pix', 'cartao', 'dinheiro', 'link'] as const).map(m => {
              const Icon = paymentIcons[m]
              return (
                <div key={m} className="bg-card border border-border rounded-xl p-4">
                  <Icon className={`w-4 h-4 ${paymentColors[m]} mb-1`} />
                  <p className="text-xs text-muted-foreground">{paymentLabels[m]}</p>
                  <p className={`text-lg font-bold ${paymentColors[m]}`}>{fmt(filteredTotals[m])}</p>
                </div>
              )
            })}
            <div className="bg-card border border-primary/30 rounded-xl p-4">
              <Wallet className="w-4 h-4 text-primary mb-1" />
              <p className="text-xs text-muted-foreground">Total</p>
              <p className="text-lg font-bold text-primary">{fmt(filteredTotals.total)}</p>
            </div>
          </div>

          {/* Orders table */}
          {filteredOrders.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <ShoppingBag className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p>Nenhum pedido nesta data</p>
            </div>
          ) : (
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    {['Pedido', 'Cliente', 'Total', 'Pagamento', 'Status', 'Hora'].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs text-muted-foreground font-semibold">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.map(o => {
                    const Icon = paymentIcons[o.paymentMethod] || Wallet
                    return (
                      <tr key={o.number} className="border-t border-border hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-3 font-bold text-foreground">#{String(o.number).padStart(3, '0')}</td>
                        <td className="px-4 py-3 text-muted-foreground">{o.customer?.name || '—'}</td>
                        <td className="px-4 py-3 text-primary font-bold">{fmt(o.total)}</td>
                        <td className="px-4 py-3">
                          <span className={`flex items-center gap-1 text-xs font-medium ${paymentColors[o.paymentMethod] || ''}`}>
                            <Icon className="w-3.5 h-3.5" />
                            {paymentLabels[o.paymentMethod] || o.paymentMethod}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            o.status === 'entregue'
                              ? 'bg-green-500/10 text-green-400'
                              : o.status === 'novo'
                                ? 'bg-primary/10 text-primary'
                                : 'bg-muted text-muted-foreground'
                          }`}>{o.status}</span>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground text-xs">{fmtTime(o.createdAt)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── RELATÓRIO TAB ── */}
      {tab === 'relatorio' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-foreground">Últimos 7 dias</h3>
            <Button onClick={fetchOrders} variant="outline" size="sm" className="border-border text-muted-foreground" disabled={loadingOrders}>
              <RefreshCw className={`w-3.5 h-3.5 mr-1 ${loadingOrders ? 'animate-spin' : ''}`} /> Atualizar
            </Button>
          </div>

          {/* Resumo de hoje */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-card border border-border rounded-xl p-4">
              <p className="text-xs text-muted-foreground mb-1">Faturamento Hoje</p>
              <p className="text-xl font-bold text-primary">{fmt(todayTotals.total)}</p>
            </div>
            <div className="bg-card border border-border rounded-xl p-4">
              <p className="text-xs text-muted-foreground mb-1">Pedidos Hoje</p>
              <p className="text-xl font-bold text-foreground">{todayOrders.length}</p>
            </div>
            <div className="bg-card border border-border rounded-xl p-4">
              <p className="text-xs text-muted-foreground mb-1">Ticket Médio Hoje</p>
              <p className="text-xl font-bold text-foreground">
                {todayOrders.length > 0 ? fmt(todayTotals.total / todayOrders.length) : '—'}
              </p>
            </div>
          </div>

          {/* 7-day summary */}
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  {['Dia', 'Pedidos', 'PIX', 'Cartão', 'Dinheiro', 'Total'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs text-muted-foreground font-semibold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {chartData.map(d => (
                  <tr key={d.date} className={`border-t border-border ${d.date === todayStr() ? 'bg-primary/5' : 'hover:bg-muted/20'} transition-colors`}>
                    <td className="px-4 py-3 font-semibold text-foreground capitalize">
                      {d.label} {d.date === todayStr() && <span className="text-xs text-primary ml-1">hoje</span>}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{d.count}</td>
                    <td className="px-4 py-3 text-yellow-400 font-medium">{fmt(d.pix)}</td>
                    <td className="px-4 py-3 text-blue-400 font-medium">{fmt(d.cartao)}</td>
                    <td className="px-4 py-3 text-green-400 font-medium">{fmt(d.dinheiro)}</td>
                    <td className="px-4 py-3 text-primary font-bold">{fmt(d.total)}</td>
                  </tr>
                ))}
                <tr className="border-t-2 border-border bg-muted/30 font-bold">
                  <td className="px-4 py-3 text-foreground">TOTAL</td>
                  <td className="px-4 py-3 text-foreground">{chartData.reduce((s, d) => s + d.count, 0)}</td>
                  <td className="px-4 py-3 text-yellow-400">{fmt(chartData.reduce((s, d) => s + d.pix, 0))}</td>
                  <td className="px-4 py-3 text-blue-400">{fmt(chartData.reduce((s, d) => s + d.cartao, 0))}</td>
                  <td className="px-4 py-3 text-green-400">{fmt(chartData.reduce((s, d) => s + d.dinheiro, 0))}</td>
                  <td className="px-4 py-3 text-primary">{fmt(chartData.reduce((s, d) => s + d.total, 0))}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Payment mix */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {(['pix', 'cartao', 'dinheiro', 'link'] as const).map(m => {
              const weekTotal = chartData.reduce((s, d) => s + (d[m as 'pix' | 'cartao' | 'dinheiro'] || 0), 0)
              const weekGrandTotal = chartData.reduce((s, d) => s + d.total, 0)
              const pct = weekGrandTotal > 0 ? Math.round((weekTotal / weekGrandTotal) * 100) : 0
              const Icon = paymentIcons[m]
              return (
                <div key={m} className="bg-card border border-border rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Icon className={`w-4 h-4 ${paymentColors[m]}`} />
                    <span className="text-sm font-medium text-foreground">{paymentLabels[m]}</span>
                  </div>
                  <p className={`text-xl font-bold ${paymentColors[m]}`}>{fmt(weekTotal)}</p>
                  <p className="text-xs text-muted-foreground mt-1">{pct}% do faturamento</p>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
