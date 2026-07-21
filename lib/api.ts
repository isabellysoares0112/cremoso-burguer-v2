'use client'

import { supabase } from './supabaseClient'
import type { Product, Order, OrderStatus, Customer, PaymentMethod, CartItem } from './types'

export interface Category {
  id: string
  slug: string
  name: string
  sort_order: number
}

// ---------------- Public menu (single request — no auth required) ----------------
export async function fetchPublicMenu(): Promise<{ categories: Category[]; products: Product[] }> {
  const res = await fetch('/api/menu', { cache: 'no-store' })
  if (!res.ok) {
    console.error('fetchPublicMenu failed:', await res.text())
    return { categories: [], products: [] }
  }
  const json = await res.json()
  return {
    categories: (json.categories || []) as Category[],
    products: (json.products || []) as Product[],
  }
}

// ---------------- Categories ----------------
export async function fetchCategories(): Promise<Category[]> {
  const res = await fetch('/api/admin/categories', { cache: 'no-store' })
  if (!res.ok) {
    console.error('fetchCategories failed:', await res.text())
    return []
  }
  const json = await res.json()
  return (json.categories || []) as Category[]
}

export async function createCategory(payload: { name: string }): Promise<Category> {
  const res = await fetch('/api/admin/categories', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new Error(await res.text())
  const json = await res.json()
  return json.category as Category
}

export async function updateCategory(id: string, payload: { name: string }) {
  const res = await fetch(`/api/admin/categories/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function deleteCategory(id: string) {
  const res = await fetch(`/api/admin/categories/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error(await res.text())
}

// ---------------- Products ----------------
export async function fetchProducts(): Promise<Product[]> {
  const res = await fetch('/api/admin/products', { cache: 'no-store' })
  if (!res.ok) {
    console.error('fetchProducts failed:', await res.text())
    return []
  }
  const json = await res.json()
  return (json.products || []) as Product[]
}

export async function fetchActiveProducts(): Promise<Product[]> {
  const all = await fetchProducts()
  return all.filter((p) => p.active)
}

export async function createProduct(input: Omit<Product, 'id'>): Promise<Product> {
  const res = await fetch('/api/admin/products', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  if (!res.ok) throw new Error(await res.text())
  const json = await res.json()
  return json.product as Product
}

export async function updateProduct(id: string, input: Partial<Product>): Promise<Product> {
  const res = await fetch(`/api/admin/products/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  if (!res.ok) throw new Error(await res.text())
  const json = await res.json()
  return json.product as Product
}

export async function deleteProduct(id: string) {
  const res = await fetch(`/api/admin/products/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error(await res.text())
}

// ---------------- Image Upload ----------------
export async function uploadProductImage(file: File): Promise<string> {
  const form = new FormData()
  form.append('file', file)
  const res = await fetch('/api/upload', { method: 'POST', body: form })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Upload failed: ${text}`)
  }
  const json = await res.json()
  return json.url as string
}

// ---------------- Orders ----------------
interface OrderApiShape {
  id: string
  number: number
  customer: Customer
  items: CartItem[]
  subtotal: number
  deliveryFee: number
  total: number
  paymentMethod: string
  status: string
  createdAt: string
  updatedAt: string
}

function apiToOrder(o: OrderApiShape): Order {
  return {
    id: o.id,
    number: o.number,
    customer: o.customer,
    items: o.items,
    subtotal: o.subtotal,
    deliveryFee: o.deliveryFee,
    total: o.total,
    paymentMethod: o.paymentMethod as PaymentMethod,
    status: o.status as OrderStatus,
    createdAt: new Date(o.createdAt),
    updatedAt: new Date(o.updatedAt),
  }
}

export async function fetchOrders(): Promise<Order[]> {
  const res = await fetch('/api/admin/orders', { cache: 'no-store' })
  if (!res.ok) {
    console.error('fetchOrders failed:', await res.text())
    return []
  }
  const json = await res.json()
  return ((json.orders || []) as OrderApiShape[]).map(apiToOrder)
}

export async function createOrder(input: {
  customer: Customer
  items: CartItem[]
  subtotal: number
  deliveryFee: number
  paymentMethod: PaymentMethod
  observation?: string
  discount?: number
  couponCode?: string
}): Promise<Order> {
  // O subtotal/taxa/total calculados no navegador (input.subtotal, input.deliveryFee,
  // input.discount) servem só para a UI mostrar um resumo instantâneo — quem decide
  // o valor real cobrado é o servidor, que recalcula tudo a partir do banco de dados.
  const res = await fetch('/api/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      customer: input.customer,
      items: input.items,
      paymentMethod: input.paymentMethod,
      observation: input.observation || '',
      couponCode: input.couponCode,
    }),
  })

  if (!res.ok) {
    const json = await res.json().catch(() => ({}))
    throw new Error(json.error || 'Não foi possível criar o pedido')
  }

  const json = await res.json()
  const o = json.order

  return {
    id: o.id,
    number: o.number,
    customer: input.customer,
    items: input.items,
    subtotal: o.subtotal,
    deliveryFee: o.deliveryFee,
    total: o.total,
    discount: o.discount,
    couponCode: input.couponCode,
    paymentMethod: input.paymentMethod,
    status: 'novo' as OrderStatus,
    observation: input.observation || '',
    createdAt: new Date(o.createdAt),
    updatedAt: new Date(o.createdAt),
  }
}

export async function updateOrderStatus(id: string, status: OrderStatus): Promise<void> {
  const res = await fetch(`/api/admin/orders/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  })
  if (!res.ok) throw new Error(await res.text())
}

export function subscribeToOrders(onChange: () => void) {
  // Uses Supabase Broadcast — no table SELECT permission required.
  // The admin panels load actual data through protected server-side routes;
  // this channel only carries the "something changed" ping.
  const channel = supabase.channel('cremoso:orders')
  channel
    .on('broadcast', { event: 'change' }, () => onChange())
    .subscribe()
  return () => {
    supabase.removeChannel(channel)
  }
}
export async function fetchSettings() {
  try {
    const res = await fetch('/api/settings', { cache: 'no-store' })
    if (!res.ok) return null
    const json = await res.json()
    return json.settings || null
  } catch {
    return null
  }
}
