import type { CartItem } from './types'

export const INSUMOS_KEY = 'cremoso-insumos-v1'
export const MOVIMENTACOES_KEY = 'cremoso-estoque-mov-v1'
export const FORNECEDORES_KEY = 'cremoso-fornecedores-v1'
export const RECEITAS_KEY = 'cremoso-receitas-v1'

export interface Insumo {
  id: string
  nome: string
  unidade: string
  custo: number
  estoque: number
  estoqueMin: number
  fornecedorId: string
  ativo: boolean
}

export interface Movimentacao {
  id: string
  insumoId: string
  tipo: 'entrada' | 'saida' | 'perda' | 'ajuste'
  quantidade: number
  custo: number
  obs: string
  data: string
}

export interface Fornecedor {
  id: string
  nome: string
  telefone: string
  email: string
  obs: string
}

export interface Receita {
  produtoId: string
  insumoId: string
  quantidade: number
}

export function loadInsumos(): Insumo[] {
  try { return JSON.parse(localStorage.getItem(INSUMOS_KEY) || '[]') } catch { return [] }
}
export function saveInsumos(d: Insumo[]) {
  try { localStorage.setItem(INSUMOS_KEY, JSON.stringify(d)) } catch { /* ignore */ }
}

export function loadMovimentacoes(): Movimentacao[] {
  try { return JSON.parse(localStorage.getItem(MOVIMENTACOES_KEY) || '[]') } catch { return [] }
}
export function saveMovimentacoes(d: Movimentacao[]) {
  try { localStorage.setItem(MOVIMENTACOES_KEY, JSON.stringify(d)) } catch { /* ignore */ }
}

export function loadFornecedores(): Fornecedor[] {
  try { return JSON.parse(localStorage.getItem(FORNECEDORES_KEY) || '[]') } catch { return [] }
}
export function saveFornecedores(d: Fornecedor[]) {
  try { localStorage.setItem(FORNECEDORES_KEY, JSON.stringify(d)) } catch { /* ignore */ }
}

export function loadReceitas(): Receita[] {
  try { return JSON.parse(localStorage.getItem(RECEITAS_KEY) || '[]') } catch { return [] }
}
export function saveReceitas(d: Receita[]) {
  try { localStorage.setItem(RECEITAS_KEY, JSON.stringify(d)) } catch { /* ignore */ }
}

/** Deduct stock automatically when an order is confirmed */
export function deductStockForOrder(items: CartItem[]) {
  try {
    const receitas = loadReceitas()
    if (receitas.length === 0) return

    const insumos = loadInsumos()
    const movimentos = loadMovimentacoes()
    const newMovs: Movimentacao[] = []

    for (const item of items) {
      const ings = receitas.filter(r => r.produtoId === item.product.id)
      for (const ing of ings) {
        const idx = insumos.findIndex(i => i.id === ing.insumoId)
        if (idx >= 0) {
          const qty = ing.quantidade * item.quantity
          insumos[idx].estoque = Math.max(0, insumos[idx].estoque - qty)
          newMovs.push({
            id: crypto.randomUUID(),
            insumoId: ing.insumoId,
            tipo: 'saida',
            quantidade: qty,
            custo: 0,
            obs: `Auto: ${item.product.name} ×${item.quantity}`,
            data: new Date().toISOString(),
          })
        }
      }
    }

    saveInsumos(insumos)
    saveMovimentacoes([...newMovs, ...movimentos].slice(0, 1000))
  } catch { /* ignore */ }
}
