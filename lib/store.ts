'use client'

import { create } from 'zustand'
import * as api from './api'
import type {
  Product,
  CartItem,
  Order,
  OrderStatus,
  Customer,
  PaymentMethod,
  Settings,
  User,
  UserRole,
  SelectedAddon,
} from './types'

/* ---------------- DEFAULT SETTINGS ---------------- */

const defaultSettings: Settings = {
  phone: '(33) 99823-0847',
  whatsapp: '5533998230847',
  deliveryFee: 5,
  openingHours: '18:00 às 23:00',
  workingDays: ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'],
  statusMode: 'automatic',
}

/* helpers */
function cartKey(i: CartItem): string {
  return i.cartItemId || i.product.id
}

function genId(productId: string): string {
  return `${productId}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

/* ---------------- STATE ---------------- */

interface AppState {
  settings: Settings
  loadSettings: () => Promise<void>
  updateSettings: (data: Partial<Settings>) => void

  products: Product[]
  loadMenu: () => Promise<void>
  loadProducts: () => Promise<void>
  addProduct: (input: Omit<Product, 'id'>) => Promise<void>
  updateProduct: (id: string, data: Partial<Product>) => Promise<void>
  deleteProduct: (id: string) => Promise<void>

  categories: api.Category[]
  loadCategories: () => Promise<void>
  addCategory: (input: { name: string }) => Promise<void>
  renameCategory: (id: string, name: string) => Promise<void>
  removeCategory: (id: string) => Promise<void>

  cart: CartItem[]
  addToCart: (product: Product) => void
  addToCartWithOptions: (product: Product, addons: SelectedAddon[], observation: string) => void
  removeFromCart: (cartItemId: string) => void
  updateQuantity: (cartItemId: string, qty: number) => void
  clearCart: () => void
  getCartSubtotal: () => number
  getCartTotal: () => number

  orders: Order[]
  loadOrders: () => Promise<void>
  currentOrder: Order | null
  addOrder: (
    customer: Customer,
    paymentMethod: PaymentMethod,
    deliveryFee: number,
    observation?: string,
    discount?: number,
    couponCode?: string
  ) => Promise<Order | null>
  updateOrderStatus: (id: string, status: OrderStatus) => Promise<void>
  setCurrentOrder: (order: Order | null) => void

  user: User | null
  setUser: (user: User | null) => void
  login: (u: string, p: string, r: UserRole) => Promise<boolean>
  logout: () => Promise<void>

  isCartOpen: boolean
  setCartOpen: (v: boolean) => void

  activeView: string
  setActiveView: (v: string) => void
}

/* ---------------- STORE ---------------- */

export const useStore = create<AppState>()((set, get) => ({
  /* SETTINGS */
  settings: defaultSettings,

  loadSettings: async () => {
    try {
      const data = await api.fetchSettings()
      if (data) set({ settings: data })
    } catch (err) {
      console.error('loadSettings error', err)
    }
  },

  updateSettings: (data) =>
    set((state) => ({
      settings: { ...state.settings, ...data },
    })),

  /* PRODUCTS */
  products: [],
  loadMenu: async () => {
    const { categories, products } = await api.fetchPublicMenu()
    set({ products, categories })
  },
  loadProducts: async () => {
    const data = await api.fetchProducts()
    set({ products: data })
  },
  addProduct: async (input) => {
    const product = await api.createProduct(input)
    set((state) => ({ products: [...state.products, product] }))
  },
  updateProduct: async (id, data) => {
    const updated = await api.updateProduct(id, data)
    set((state) => ({
      products: state.products.map((p) => (p.id === id ? updated : p)),
    }))
  },
  deleteProduct: async (id) => {
    await api.deleteProduct(id)
    set((state) => ({ products: state.products.filter((p) => p.id !== id) }))
  },

  /* CATEGORIES */
  categories: [],
  loadCategories: async () => {
    const data = await api.fetchCategories()
    set({ categories: data })
  },
  addCategory: async (input) => {
    const cat = await api.createCategory(input)
    set((state) => ({ categories: [...state.categories, cat] }))
  },
  renameCategory: async (id, name) => {
    await api.updateCategory(id, { name })
    set((state) => ({
      categories: state.categories.map((c) =>
        c.id === id
          ? {
              ...c,
              name,
              slug: name
                .toLowerCase()
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/(^-|-$)/g, ''),
            }
          : c
      ),
    }))
  },
  removeCategory: async (id) => {
    await api.deleteCategory(id)
    set((state) => ({ categories: state.categories.filter((c) => c.id !== id) }))
  },

  /* CART */
  cart: [],

  addToCart: (product) =>
    set((state) => {
      const exists = state.cart.find(
        (i) => i.product.id === product.id && (!i.addons || i.addons.length === 0)
      )
      if (exists) {
        return {
          cart: state.cart.map((i) =>
            cartKey(i) === cartKey(exists) ? { ...i, quantity: i.quantity + 1 } : i
          ),
        }
      }
      return {
        cart: [
          ...state.cart,
          {
            cartItemId: genId(product.id),
            product,
            quantity: 1,
            addons: [],
            observation: '',
          },
        ],
      }
    }),

  addToCartWithOptions: (product, addons, observation) =>
    set((state) => ({
      cart: [
        ...state.cart,
        {
          cartItemId: genId(product.id),
          product,
          quantity: 1,
          addons,
          observation,
        },
      ],
    })),

  removeFromCart: (id) =>
    set((state) => ({
      cart: state.cart.filter((i) => cartKey(i) !== id),
    })),

  updateQuantity: (id, qty) =>
    set((state) => ({
      cart:
        qty <= 0
          ? state.cart.filter((i) => cartKey(i) !== id)
          : state.cart.map((i) => (cartKey(i) === id ? { ...i, quantity: qty } : i)),
    })),

  clearCart: () => set({ cart: [] }),

  getCartSubtotal: () =>
    get().cart.reduce((t, i) => {
      const addonsPrice = (i.addons || []).reduce(
        (s, sa) => s + sa.addon.price * sa.quantity,
        0
      )
      return t + (i.product.price + addonsPrice) * i.quantity
    }, 0),

  getCartTotal: () => {
    const subtotal = get().cart.reduce((t, i) => {
      const addonsPrice = (i.addons || []).reduce(
        (s, sa) => s + sa.addon.price * sa.quantity,
        0
      )
      return t + (i.product.price + addonsPrice) * i.quantity
    }, 0)
    return subtotal + get().settings.deliveryFee
  },

  /* ORDERS */
  orders: [],
  loadOrders: async () => {
    const data = await api.fetchOrders()
    set({ orders: data })
  },

  currentOrder: null,

  addOrder: async (customer, paymentMethod, deliveryFee, observation?, discount?, couponCode?) => {
    const { cart, getCartSubtotal } = get()

    try {
      const order = await api.createOrder({
        customer,
        items: cart,
        subtotal: getCartSubtotal(),
        deliveryFee,
        paymentMethod,
        observation,
        discount,
        couponCode,
      })

      set((state) => ({
        orders: [order, ...state.orders],
        currentOrder: order,
        cart: [],
      }))

      return order
    } catch (err) {
      console.error(err)
      return null
    }
  },

  updateOrderStatus: async (id, status) => {
    await api.updateOrderStatus(id, status)

    set((state) => ({
      orders: state.orders.map((o) => (o.id === id ? { ...o, status } : o)),
    }))
  },

  setCurrentOrder: (order) => set({ currentOrder: order }),

  /* AUTH */
  user: null,

  setUser: (user) => set({ user }),

  login: async (u, p, r) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: u, password: p, role: r }),
      })
      if (!res.ok) return false
      const { user } = await res.json()
      set({ user })
      return true
    } catch {
      return false
    }
  },

  logout: async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
    } catch {
      // ignore network errors on logout
    }
    set({ user: null })
  },

  /* UI */
  isCartOpen: false,
  setCartOpen: (v) => set({ isCartOpen: v }),

  activeView: 'home',
  setActiveView: (v) => set({ activeView: v }),
}))
