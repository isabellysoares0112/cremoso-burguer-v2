'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Users, Star, TrendingDown, AlertTriangle, UserCheck, Search,
  Download, MessageCircle, ArrowLeft, ShoppingBag, Tag, Clock,
  Wallet, Heart, ChevronRight, Phone,
} from 'lucide-react'
import { useStore } from '@/lib/store'
import { format, differenceInDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { Order } from '@/lib/types'

/* ─── Types ─── */
type Segment = 'todos' | 'vip' | 'recorrente' | 'em_risco' | 'inativo' | 'novo'

interface CustomerProfile {
  phone: string
  name: string
  neighborhood: string
  orders: Order[]
  totalOrders: number
  totalSpent: number
  avgTicket: number
  firstOrder: Date
  lastOrder: Date
  daysSince: number
  favoriteProducts: { name: string; count: number }[]
  couponsUsed: string[]
  segment: Segment
}

const segmentConfig: Record<Exclude<Segment, 'todos'>, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  vip:        { label: 'VIP',        color: 'text-yellow-400',  bg: 'bg-yellow-500/20',  icon: Star },
  recorrente: { label: 'Recorrente', color: 'text-green-400',   bg: 'bg-green-500/20',   icon: UserCheck },
  em_risco:   { label: 'Em Risco',   color: 'text-orange-400',  bg: 'bg-orange-500/20',  icon: AlertTriangle },
  inativo:    { label: 'Inativo',    color: 'text-red-400',     bg: 'bg-red-500/20',     icon: TrendingDown },
  novo:       { label: 'Novo',       color: 'text-blue-400',    bg: 'bg-blue-500/20',    icon: Users },
}

const filterTabs: { key: Segment; label: string }[] = [
  { key: 'todos',      label: 'Todos' },
  { key: 'vip',        label: 'VIP' },
  { key: 'recorrente', label: 'Recorrentes' },
  { key: 'em_risco',   label: 'Em Risco' },
  { key: 'inativo',    label: 'Inativos' },
  { key: 'novo',       label: 'Novos' },
]

function classifySegment(totalOrders: number, totalSpent: number, daysSince: number): Exclude<Segment, 'todos'> {
  if (totalOrders >= 8 || totalSpent >= 400) return 'vip'
  if (totalOrders === 1) return 'novo'
  if (daysSince > 60) return 'inativo'
  if (daysSince > 30) return 'em_risco'
  return 'recorrente'
}

/* ─── Component ─── */
export function CRMPanel() {
  const { orders, loadOrders, settings } = useStore()
  const [filter, setFilter] = useState<Segment>('todos')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<CustomerProfile | null>(null)

  useEffect(() => { loadOrders() }, [loadOrders])

  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

  /* Build customer profiles from orders */
  const customers = useMemo<CustomerProfile[]>(() => {
    const map: Record<string, { orders: Order[]; names: string[]; hoods: string[] }> = {}

    orders.forEach(o => {
      const key = o.customer.phone.replace(/\D/g, '') || `noPhone-${o.customer.name}`
      if (!map[key]) map[key] = { orders: [], names: [], hoods: [] }
      map[key].orders.push(o)
      if (o.customer.name) map[key].names.push(o.customer.name)
      if (o.customer.neighborhood) map[key].hoods.push(o.customer.neighborhood)
    })

    return Object.entries(map).map(([phone, data]) => {
      const sorted = [...data.orders].sort((a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      )

      const totalSpent = data.orders.reduce((s, o) => s + o.total, 0)
      const totalOrders = data.orders.length
      const avgTicket = totalOrders > 0 ? totalSpent / totalOrders : 0
      const firstOrder = new Date(sorted[0].createdAt)
      const lastOrder = new Date(sorted[sorted.length - 1].createdAt)
      const daysSince = differenceInDays(new Date(), lastOrder)

      /* Favorite products */
      const prodCount: Record<string, number> = {}
      data.orders.forEach(o => {
        o.items.forEach(item => {
          const name = (item as { product?: { name?: string } }).product?.name
          if (name) prodCount[name] = (prodCount[name] || 0) + ((item as { quantity?: number }).quantity || 1)
        })
      })
      const favoriteProducts = Object.entries(prodCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([name, count]) => ({ name, count }))

      /* Coupons used */
      const couponsSet = new Set<string>()
      data.orders.forEach(o => { if (o.couponCode) couponsSet.add(o.couponCode) })

      /* Name & neighborhood — most common */
      const mostCommon = (arr: string[]) =>
        arr.sort((a, b) =>
          arr.filter(v => v === b).length - arr.filter(v => v === a).length
        )[0] || ''

      return {
        phone: phone.startsWith('noPhone') ? '' : phone,
        name: mostCommon(data.names),
        neighborhood: mostCommon(data.hoods),
        orders: sorted,
        totalOrders,
        totalSpent,
        avgTicket,
        firstOrder,
        lastOrder,
        daysSince,
        favoriteProducts,
        couponsUsed: [...couponsSet],
        segment: classifySegment(totalOrders, totalSpent, daysSince),
      }
    }).sort((a, b) => b.totalSpent - a.totalSpent)
  }, [orders])

  /* Stats */
  const stats = useMemo(() => ({
    total:      customers.length,
    vip:        customers.filter(c => c.segment === 'vip').length,
    recorrente: customers.filter(c => c.segment === 'recorrente').length,
    em_risco:   customers.filter(c => c.segment === 'em_risco').length,
    inativo:    customers.filter(c => c.segment === 'inativo').length,
    novo:       customers.filter(c => c.segment === 'novo').length,
    ltv:        customers.reduce((s, c) => s + c.totalSpent, 0),
  }), [customers])

  /* Filtered list */
  const filtered = useMemo(() => {
    let list = filter === 'todos' ? customers : customers.filter(c => c.segment === filter)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(c =>
        c.name.toLowerCase().includes(q) ||
        c.phone.includes(q) ||
        c.neighborhood.toLowerCase().includes(q)
      )
    }
    return list
  }, [customers, filter, search])

  /* Export CSV */
  const exportCSV = () => {
    const headers = ['Nome', 'Telefone', 'Bairro', 'Pedidos', 'Ticket Médio', 'Total Gasto', 'Última Compra', 'Dias Sem Comprar', 'Segmento', 'Produtos Favoritos', 'Cupons']
    const rows = filtered.map(c => [
      c.name,
      c.phone,
      c.neighborhood,
      c.totalOrders,
      c.avgTicket.toFixed(2).replace('.', ','),
      c.totalSpent.toFixed(2).replace('.', ','),
      format(c.lastOrder, 'dd/MM/yyyy'),
      c.daysSince,
      segmentConfig[c.segment as Exclude<Segment, 'todos'>]?.label || c.segment,
      c.favoriteProducts.map(p => p.name).join(' | '),
      c.couponsUsed.join(' | '),
    ])
    const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(';')).join('\n')
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `clientes-crm-${format(new Date(), 'yyyy-MM-dd')}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  /* WhatsApp remarketing */
  const sendWhatsApp = (c: CustomerProfile, type: 'reativacao' | 'fidelidade') => {
    const msgs: Record<string, string> = {
      reativacao: `Olá, ${c.name.split(' ')[0]}! 😊 Sentimos sua falta no *Cremoso Burguer*! Que tal pedir um hambúrguer hoje? Nosso cardápio está incrível. Acesse e faça seu pedido! 🍔🔥`,
      fidelidade: `Olá, ${c.name.split(' ')[0]}! 🌟 Você é um cliente especial do *Cremoso Burguer* e queremos te recompensar! Aproveite nossos combos e volta mais vezes. Te esperamos! 🍔`,
    }
    const phone = c.phone.replace(/\D/g, '')
    const target = phone || settings.whatsapp
    window.open(`https://wa.me/55${target}?text=${encodeURIComponent(msgs[type])}`, '_blank')
  }

  /* ─── Customer Detail View ─── */
  if (selected) {
    const seg = segmentConfig[selected.segment as Exclude<Segment, 'todos'>]
    const SegIcon = seg?.icon || Users
    return (
      <div className="p-6">
        <button
          onClick={() => setSelected(null)}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Voltar para clientes
        </button>

        {/* Customer Header */}
        <div className="bg-card border border-border rounded-xl p-6 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-primary/20 flex items-center justify-center text-xl font-bold text-primary">
                {selected.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <h2 className="text-xl font-bold text-foreground">{selected.name}</h2>
                <p className="text-muted-foreground flex items-center gap-1 text-sm">
                  <Phone className="w-3 h-3" /> {selected.phone || 'Sem telefone'}
                </p>
                <p className="text-muted-foreground text-sm">{selected.neighborhood}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold ${seg?.bg} ${seg?.color}`}>
                <SegIcon className="w-3.5 h-3.5" />
                {seg?.label}
              </span>
              {selected.phone && (
                <>
                  <button
                    onClick={() => sendWhatsApp(selected, 'fidelidade')}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-green-600/20 text-green-400 hover:bg-green-600/30 transition-colors"
                  >
                    <MessageCircle className="w-3.5 h-3.5" /> Fidelidade
                  </button>
                  <button
                    onClick={() => sendWhatsApp(selected, 'reativacao')}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-orange-500/20 text-orange-400 hover:bg-orange-500/30 transition-colors"
                  >
                    <MessageCircle className="w-3.5 h-3.5" /> Reativar
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[
            { icon: <ShoppingBag className="w-5 h-5 text-primary" />, bg: 'bg-primary/20', label: 'Total de pedidos', value: String(selected.totalOrders) },
            { icon: <Wallet className="w-5 h-5 text-emerald-400" />, bg: 'bg-emerald-500/20', label: 'Valor vitalício', value: fmt(selected.totalSpent) },
            { icon: <TrendingDown className="w-5 h-5 text-blue-400" />, bg: 'bg-blue-500/20', label: 'Ticket médio', value: fmt(selected.avgTicket) },
            { icon: <Clock className="w-5 h-5 text-orange-400" />, bg: 'bg-orange-500/20', label: 'Dias sem comprar', value: String(selected.daysSince), sub: `Última: ${format(selected.lastOrder, 'dd/MM/yyyy')}` },
          ].map((m, i) => (
            <div key={i} className="bg-card border border-border rounded-xl p-4">
              <div className={`w-10 h-10 rounded-lg ${m.bg} flex items-center justify-center mb-3`}>{m.icon}</div>
              <p className="text-muted-foreground text-xs mb-1">{m.label}</p>
              <p className="text-foreground font-bold text-lg leading-tight">{m.value}</p>
              {m.sub && <p className="text-muted-foreground text-[11px] mt-0.5">{m.sub}</p>}
            </div>
          ))}
        </div>

        <div className="grid lg:grid-cols-2 gap-6 mb-6">
          {/* Favorite Products */}
          <div className="bg-card border border-border rounded-xl p-5">
            <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
              <Heart className="w-4 h-4 text-pink-400" /> Produtos Favoritos
            </h3>
            {selected.favoriteProducts.length === 0 ? (
              <p className="text-muted-foreground text-sm">Nenhum dado disponível</p>
            ) : (
              <div className="space-y-2">
                {selected.favoriteProducts.map((p, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <span className="text-sm text-foreground">{p.name}</span>
                    <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full font-bold">{p.count}x</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Coupons & Timeline */}
          <div className="bg-card border border-border rounded-xl p-5">
            <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
              <Tag className="w-4 h-4 text-yellow-400" /> Cupons Utilizados
            </h3>
            {selected.couponsUsed.length === 0 ? (
              <p className="text-muted-foreground text-sm">Nenhum cupom utilizado</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {selected.couponsUsed.map(c => (
                  <span key={c} className="font-mono text-xs bg-yellow-500/20 text-yellow-400 px-3 py-1 rounded-full font-bold">{c}</span>
                ))}
              </div>
            )}
            <div className="mt-4 pt-4 border-t border-border">
              <p className="text-xs text-muted-foreground mb-1">Cliente desde</p>
              <p className="text-sm font-semibold text-foreground">
                {format(selected.firstOrder, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
              </p>
            </div>
          </div>
        </div>

        {/* Order History */}
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2">
            <ShoppingBag className="w-4 h-4 text-primary" /> Histórico de Pedidos
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 px-3 text-muted-foreground font-medium">#</th>
                  <th className="text-left py-2 px-3 text-muted-foreground font-medium hidden sm:table-cell">Itens</th>
                  <th className="text-right py-2 px-3 text-muted-foreground font-medium">Total</th>
                  <th className="text-right py-2 px-3 text-muted-foreground font-medium">Desconto</th>
                  <th className="text-right py-2 px-3 text-muted-foreground font-medium hidden md:table-cell">Pagamento</th>
                  <th className="text-right py-2 px-3 text-muted-foreground font-medium">Data</th>
                </tr>
              </thead>
              <tbody>
                {[...selected.orders].reverse().map(o => {
                  const itemNames = o.items
                    .map(i => (i as { product?: { name?: string } }).product?.name)
                    .filter(Boolean).join(', ')
                  return (
                    <tr key={o.id} className="border-b border-border/50 hover:bg-muted/30">
                      <td className="py-2 px-3 font-bold text-foreground">#{String(o.number).padStart(3, '0')}</td>
                      <td className="py-2 px-3 text-muted-foreground hidden sm:table-cell max-w-[200px] truncate">{itemNames || '—'}</td>
                      <td className="py-2 px-3 text-right font-bold text-primary">{fmt(o.total)}</td>
                      <td className="py-2 px-3 text-right text-destructive text-xs">
                        {o.discount && o.discount > 0 ? `-${fmt(o.discount)}` : '—'}
                      </td>
                      <td className="py-2 px-3 text-right text-muted-foreground capitalize hidden md:table-cell">{o.paymentMethod}</td>
                      <td className="py-2 px-3 text-right text-muted-foreground text-xs">
                        {format(new Date(o.createdAt), 'dd/MM/yy')}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    )
  }

  /* ─── Main List View ─── */
  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold text-foreground">CRM — CLIENTES</h1>
        <Button variant="outline" size="sm" onClick={exportCSV} className="flex items-center gap-2 self-start sm:self-auto">
          <Download className="w-4 h-4" /> Exportar CSV
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total de Clientes',    value: stats.total,      icon: <Users className="w-5 h-5 text-primary" />,        bg: 'bg-primary/20' },
          { label: 'VIP',                  value: stats.vip,        icon: <Star className="w-5 h-5 text-yellow-400" />,       bg: 'bg-yellow-500/20' },
          { label: 'Em Risco + Inativos',  value: stats.em_risco + stats.inativo, icon: <AlertTriangle className="w-5 h-5 text-orange-400" />, bg: 'bg-orange-500/20' },
          { label: 'Receita Total (LTV)',   value: fmt(stats.ltv),   icon: <Wallet className="w-5 h-5 text-emerald-400" />,    bg: 'bg-emerald-500/20' },
        ].map((c, i) => (
          <div key={i} className="bg-card border border-border rounded-xl p-5">
            <div className={`w-10 h-10 rounded-lg ${c.bg} flex items-center justify-center mb-3`}>{c.icon}</div>
            <p className="text-muted-foreground text-xs mb-1">{c.label}</p>
            <p className="text-foreground font-bold text-xl">{c.value}</p>
          </div>
        ))}
      </div>

      {/* Segmentation Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
        {(Object.entries(segmentConfig) as [Exclude<Segment, 'todos'>, typeof segmentConfig[keyof typeof segmentConfig]][]).map(([key, cfg]) => {
          const count = customers.filter(c => c.segment === key).length
          const Ic = cfg.icon
          return (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`bg-card border rounded-xl p-4 text-center transition-all ${filter === key ? 'border-primary' : 'border-border hover:border-muted-foreground'}`}
            >
              <div className={`w-8 h-8 rounded-full ${cfg.bg} flex items-center justify-center mx-auto mb-2`}>
                <Ic className={`w-4 h-4 ${cfg.color}`} />
              </div>
              <p className={`text-lg font-bold ${cfg.color}`}>{count}</p>
              <p className="text-xs text-muted-foreground">{cfg.label}</p>
            </button>
          )
        })}
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, telefone ou bairro..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-10 bg-muted border-border text-foreground"
          />
        </div>
        <div className="flex gap-1 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
          {filterTabs.map(t => (
            <button
              key={t.key}
              onClick={() => setFilter(t.key)}
              className={`whitespace-nowrap px-3 py-2 rounded-lg text-xs font-bold transition-colors ${filter === t.key ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'}`}
            >
              {t.label}
              {t.key !== 'todos' && (
                <span className="ml-1 opacity-70">
                  ({customers.filter(c => c.segment === t.key).length})
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Customer Table */}
      {filtered.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-12 text-center">
          <Users className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">Nenhum cliente encontrado</p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left py-3 px-4 text-muted-foreground font-medium">Cliente</th>
                  <th className="text-left py-3 px-4 text-muted-foreground font-medium hidden sm:table-cell">Bairro</th>
                  <th className="text-right py-3 px-4 text-muted-foreground font-medium">Pedidos</th>
                  <th className="text-right py-3 px-4 text-muted-foreground font-medium hidden md:table-cell">Ticket Médio</th>
                  <th className="text-right py-3 px-4 text-muted-foreground font-medium">LTV</th>
                  <th className="text-right py-3 px-4 text-muted-foreground font-medium hidden lg:table-cell">Última Compra</th>
                  <th className="text-center py-3 px-4 text-muted-foreground font-medium">Segmento</th>
                  <th className="py-3 px-4"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c, i) => {
                  const seg = segmentConfig[c.segment as Exclude<Segment, 'todos'>]
                  const SegIcon = seg?.icon || Users
                  return (
                    <tr
                      key={i}
                      className="border-b border-border/50 hover:bg-muted/30 cursor-pointer transition-colors"
                      onClick={() => setSelected(c)}
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary flex-shrink-0">
                            {c.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-foreground truncate max-w-[130px]">{c.name}</p>
                            <p className="text-xs text-muted-foreground">{c.phone || 'Sem telefone'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-muted-foreground hidden sm:table-cell">{c.neighborhood || '—'}</td>
                      <td className="py-3 px-4 text-right">
                        <span className="bg-primary/20 text-primary text-xs font-bold px-2 py-0.5 rounded-full">{c.totalOrders}</span>
                      </td>
                      <td className="py-3 px-4 text-right text-foreground hidden md:table-cell">{fmt(c.avgTicket)}</td>
                      <td className="py-3 px-4 text-right font-bold text-primary">{fmt(c.totalSpent)}</td>
                      <td className="py-3 px-4 text-right hidden lg:table-cell">
                        <p className="text-foreground text-xs">{format(c.lastOrder, 'dd/MM/yyyy')}</p>
                        <p className="text-muted-foreground text-[11px]">{c.daysSince}d atrás</p>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold ${seg?.bg} ${seg?.color}`}>
                          <SegIcon className="w-3 h-3" />
                          <span className="hidden sm:inline">{seg?.label}</span>
                        </span>
                      </td>
                      <td className="py-3 px-4 text-muted-foreground">
                        <ChevronRight className="w-4 h-4" />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div className="p-3 border-t border-border text-xs text-muted-foreground text-center">
            {filtered.length} cliente{filtered.length !== 1 ? 's' : ''} {filter !== 'todos' ? `— filtro: ${filterTabs.find(t => t.key === filter)?.label}` : ''}
          </div>
        </div>
      )}

      {/* Remarketing Quick Action */}
      {(stats.em_risco + stats.inativo) > 0 && (
        <div className="mt-6 bg-card border border-orange-500/30 rounded-xl p-5">
          <div className="flex items-start gap-3 mb-4">
            <AlertTriangle className="w-5 h-5 text-orange-400 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="text-sm font-bold text-foreground">Ação de Recuperação Sugerida</h3>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.em_risco} cliente{stats.em_risco !== 1 ? 's' : ''} em risco e {stats.inativo} inativo{stats.inativo !== 1 ? 's' : ''} — considere enviar mensagens de reativação.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {customers
              .filter(c => c.segment === 'em_risco' || c.segment === 'inativo')
              .slice(0, 5)
              .map((c, i) => (
                <div key={i} className="flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-2">
                  <span className="text-xs font-medium text-foreground">{c.name.split(' ')[0]}</span>
                  <span className="text-[11px] text-muted-foreground">{c.daysSince}d</span>
                  {c.phone && (
                    <button
                      onClick={() => sendWhatsApp(c, 'reativacao')}
                      className="text-green-400 hover:text-green-300 transition-colors"
                      title="Enviar WhatsApp"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            {(stats.em_risco + stats.inativo) > 5 && (
              <button
                onClick={() => setFilter('em_risco')}
                className="text-xs text-muted-foreground hover:text-foreground px-3 py-2 bg-muted/30 rounded-lg transition-colors"
              >
                +{stats.em_risco + stats.inativo - 5} mais →
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
