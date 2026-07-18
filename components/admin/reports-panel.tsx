'use client'

import { useEffect, useMemo } from 'react'
import { ShoppingBag, DollarSign, TrendingUp, Award, Target, Calendar, BarChart2, XCircle } from 'lucide-react'
import { useStore } from '@/lib/store'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts'
import { format, subDays, isToday, isThisWeek, isThisMonth, startOfDay } from 'date-fns'
import { ptBR } from 'date-fns/locale'

const statusLabels: Record<string, string> = {
  novo: 'Novo',
  preparando: 'Preparando',
  pronto: 'Pronto',
  entregue: 'Entregue',
}

const statusColors: Record<string, string> = {
  novo: 'bg-primary text-primary-foreground',
  preparando: 'bg-secondary text-secondary-foreground',
  pronto: 'bg-green-600 text-white',
  entregue: 'bg-muted text-muted-foreground',
}

export function ReportsPanel() {
  const { orders, products, loadOrders, loadProducts } = useStore()

  useEffect(() => {
    loadOrders()
    loadProducts()
  }, [loadOrders, loadProducts])

  const formatPrice = (price: number) =>
    price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

  const stats = useMemo(() => {
    // Pedidos cancelados nunca viraram dinheiro de verdade — não podem contar
    // como faturamento nem como "mais vendido".
    const revenueOrders = orders.filter(o => o.status !== 'cancelado')
    const cancelledOrders = orders.filter(o => o.status === 'cancelado')

    const totalOrders = orders.length
    const totalRevenue = revenueOrders.reduce((sum, o) => sum + o.total, 0)
    const averageTicket = revenueOrders.length > 0 ? totalRevenue / revenueOrders.length : 0

    const todayOrders = revenueOrders.filter(o => isToday(new Date(o.createdAt)))
    const todayRevenue = todayOrders.reduce((sum, o) => sum + o.total, 0)

    const weekOrders = revenueOrders.filter(o => isThisWeek(new Date(o.createdAt)))
    const weekRevenue = weekOrders.reduce((sum, o) => sum + o.total, 0)

    const monthOrders = revenueOrders.filter(o => isThisMonth(new Date(o.createdAt)))
    const monthRevenue = monthOrders.reduce((sum, o) => sum + o.total, 0)

    const productSales: Record<string, number> = {}
    revenueOrders.forEach(order => {
      order.items.forEach(item => {
        const id = (item as { product: { id: string } }).product?.id ?? String(item)
        productSales[id] = (productSales[id] || 0) + ((item as { quantity: number }).quantity || 1)
      })
    })

    const topProductId = Object.entries(productSales).sort((a, b) => b[1] - a[1])[0]?.[0]
    const topProduct = products.find(p => p.id === topProductId)
    const topProductSales = topProductId ? productSales[topProductId] : 0

    return {
      totalOrders,
      totalRevenue,
      averageTicket,
      todayRevenue,
      todayOrders: todayOrders.length,
      weekRevenue,
      weekOrders: weekOrders.length,
      monthRevenue,
      monthOrders: monthOrders.length,
      topProduct,
      topProductSales,
      cancelledOrders: cancelledOrders.length,
      cancelledRate: totalOrders > 0 ? (cancelledOrders.length / totalOrders) * 100 : 0,
    }
  }, [orders, products])

  const chartData = useMemo(() => {
    const revenueOrders = orders.filter(o => o.status !== 'cancelado')
    const data = []
    for (let i = 6; i >= 0; i--) {
      const date = subDays(new Date(), i)
      const dayStart = startOfDay(date)
      const dayOrders = revenueOrders.filter(o => {
        const orderDate = startOfDay(new Date(o.createdAt))
        return orderDate.getTime() === dayStart.getTime()
      })
      const revenue = dayOrders.reduce((sum, o) => sum + o.total, 0)
      data.push({
        day: format(date, 'EEE', { locale: ptBR }),
        vendas: revenue,
        pedidos: dayOrders.length,
      })
    }
    return data
  }, [orders])

  const recentOrders = orders.slice(0, 8)

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-foreground mb-6">RELATÓRIOS</h1>

      {/* Stats Cards - Row 1 */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Total pedidos */}
        <div className="bg-card border border-border rounded-lg p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center">
              <ShoppingBag className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-muted-foreground text-sm">Total de pedidos</p>
              <p className="text-2xl font-bold text-foreground">{stats.totalOrders}</p>
            </div>
          </div>
        </div>

        {/* Faturamento total */}
        <div className="bg-card border border-border rounded-lg p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-green-600/20 flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-green-500" />
            </div>
            <div>
              <p className="text-muted-foreground text-sm">Faturamento total</p>
              <p className="text-2xl font-bold text-foreground">{formatPrice(stats.totalRevenue)}</p>
            </div>
          </div>
        </div>

        {/* Ticket médio */}
        <div className="bg-card border border-border rounded-lg p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-blue-600/20 flex items-center justify-center">
              <Target className="w-6 h-6 text-blue-500" />
            </div>
            <div>
              <p className="text-muted-foreground text-sm">Ticket médio</p>
              <p className="text-2xl font-bold text-foreground">{formatPrice(stats.averageTicket)}</p>
            </div>
          </div>
        </div>

        {/* Vendas hoje */}
        <div className="bg-card border border-border rounded-lg p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-secondary/20 flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-secondary" />
            </div>
            <div>
              <p className="text-muted-foreground text-sm">Vendas hoje</p>
              <p className="text-2xl font-bold text-foreground">{formatPrice(stats.todayRevenue)}</p>
              <p className="text-xs text-muted-foreground">{stats.todayOrders} pedido(s)</p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards - Row 2 */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {/* Semana */}
        <div className="bg-card border border-border rounded-lg p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-orange-600/20 flex items-center justify-center">
              <BarChart2 className="w-6 h-6 text-orange-500" />
            </div>
            <div>
              <p className="text-muted-foreground text-sm">Vendas esta semana</p>
              <p className="text-2xl font-bold text-foreground">{formatPrice(stats.weekRevenue)}</p>
              <p className="text-xs text-muted-foreground">{stats.weekOrders} pedido(s)</p>
            </div>
          </div>
        </div>

        {/* Mês */}
        <div className="bg-card border border-border rounded-lg p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-purple-600/20 flex items-center justify-center">
              <Calendar className="w-6 h-6 text-purple-500" />
            </div>
            <div>
              <p className="text-muted-foreground text-sm">Vendas este mês</p>
              <p className="text-2xl font-bold text-foreground">{formatPrice(stats.monthRevenue)}</p>
              <p className="text-xs text-muted-foreground">{stats.monthOrders} pedido(s)</p>
            </div>
          </div>
        </div>

        {/* Produto mais vendido */}
        <div className="bg-card border border-border rounded-lg p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center">
              <Award className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-muted-foreground text-sm">Produto mais vendido</p>
              <p className="text-lg font-bold text-foreground truncate max-w-[160px]">
                {stats.topProduct?.name || 'N/A'}
              </p>
              {stats.topProductSales > 0 && (
                <p className="text-xs text-muted-foreground">{stats.topProductSales} vendidos</p>
              )}
            </div>
          </div>
        </div>

        {/* Cancelamentos */}
        <div className="bg-card border border-border rounded-lg p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-destructive/20 flex items-center justify-center">
              <XCircle className="w-6 h-6 text-destructive" />
            </div>
            <div>
              <p className="text-muted-foreground text-sm">Cancelamentos</p>
              <p className="text-2xl font-bold text-foreground">{stats.cancelledOrders}</p>
              <p className="text-xs text-muted-foreground">{stats.cancelledRate.toFixed(1)}% dos pedidos</p>
            </div>
          </div>
        </div>
      </div>

      {/* Chart & Recent Orders */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Sales Chart */}
        <div className="bg-card border border-border rounded-lg p-6">
          <h2 className="text-lg font-bold text-foreground mb-4">Vendas dos últimos 7 dias</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="day"
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                />
                <YAxis
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  tickFormatter={(v) => `R$${v}`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                  formatter={(value: number) => [formatPrice(value), 'Vendas']}
                />
                <Bar dataKey="vendas" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Orders */}
        <div className="bg-card border border-border rounded-lg p-6">
          <h2 className="text-lg font-bold text-foreground mb-4">Últimos pedidos</h2>
          <div className="space-y-3 overflow-y-auto max-h-64">
            {recentOrders.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">Nenhum pedido ainda</p>
            ) : (
              recentOrders.map((order) => (
                <div
                  key={order.id}
                  className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <p className="font-bold text-foreground">
                      #{String(order.number).padStart(3, '0')}
                    </p>
                    <div>
                      <p className="text-sm text-foreground">{order.customer.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(order.createdAt), 'dd/MM HH:mm')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${statusColors[order.status] ?? 'bg-muted text-muted-foreground'}`}>
                      {statusLabels[order.status] ?? order.status}
                    </span>
                    <p className="font-bold text-primary text-sm">{formatPrice(order.total)}</p>
                  </div>
                </div>
              ))
            )}
          </div>
          {recentOrders.length > 0 && (
            <a
              href="/equipe/admin/pedidos"
              className="block text-center text-primary text-sm mt-4 hover:underline"
            >
              Ver todos os pedidos →
            </a>
          )}
        </div>
      </div>
    </div>
  )
}
