export interface Product {
  id: string
  name: string
  description: string
  price: number
  image: string
  category: string
  active: boolean
  isBestSeller?: boolean
  isNew?: boolean
}

export interface Addon {
  id: string
  name: string
  price: number
  maxQty?: number
}

export interface AddonDB {
  id: string
  categoriaSlug: string
  nome: string
  preco: number
  ativo: boolean
  ordem: number
  createdAt?: string
}

export interface SelectedAddon {
  addon: Addon
  quantity: number
}

export interface CartItem {
  cartItemId?: string
  product: Product
  quantity: number
  addons?: SelectedAddon[]
  observation?: string
}

export interface Customer {
  name: string
  phone: string
  address: string
  neighborhood: string
}

export type PaymentMethod = 'pix' | 'cartao' | 'dinheiro' | 'link'

export type OrderStatus = 'novo' | 'preparando' | 'pronto' | 'entregue' | 'cancelado'

export interface Order {
  id: string
  number: number
  customer: Customer
  items: CartItem[]
  subtotal: number
  deliveryFee: number
  total: number
  discount?: number
  couponCode?: string
  paymentMethod: PaymentMethod
  status: OrderStatus
  observation?: string
  createdAt: Date
  updatedAt: Date
}

export type StatusMode = 'automatic' | 'force_open' | 'force_closed'

export interface EstimatedMinutes {
  novo: number
  preparando: number
  pronto: number
}

export interface Settings {
  phone: string
  whatsapp: string
  deliveryFee: number
  openingHours: string
  workingDays: string[]
  statusMode: StatusMode
  estimatedMinutes?: EstimatedMinutes
}

export type UserRole = 'admin' | 'entregador'

export interface User {
  id: string
  username: string
  role: UserRole
}
