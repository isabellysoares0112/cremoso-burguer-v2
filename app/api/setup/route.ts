import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export const runtime = 'nodejs'

const seedCategories = ['Hambúrgueres', 'Combos', 'Acompanhamentos', 'Bebidas']

const seedProductsByCategory: Record<string, Array<{ nome: string; descricao: string; preco: number; imagem: string }>> = {
  'Hambúrgueres': [
    { nome: 'Cremoso Burguer', descricao: 'Pão brioche, carne suculenta, cheddar cremoso e bacon crocante', preco: 24.9, imagem: '/images/cremoso-burguer.jpg' },
    { nome: 'Duplo Cremoso', descricao: 'Pão brioche, 2 carnes suculentas, cheddar cremoso e bacon', preco: 32.9, imagem: '/images/duplo-cremoso.jpg' },
    { nome: 'Smash Burger', descricao: 'Pão brioche, smash patty, bacon, cheddar e molho especial', preco: 19.9, imagem: '/images/smash-burger.jpg' },
  ],
  'Combos': [
    { nome: 'Combo Cremoso', descricao: 'Cremoso Burguer + Batata Frita + Coca-Cola 350ml', preco: 39.9, imagem: '/images/cremoso-burguer.jpg' },
    { nome: 'Combo Duplo', descricao: 'Duplo Cremoso + Batata Frita Grande + Bebida', preco: 49.9, imagem: '/images/duplo-cremoso.jpg' },
  ],
  'Acompanhamentos': [
    { nome: 'Batata Frita', descricao: 'Porção de batatas fritas crocantes e douradas', preco: 12.9, imagem: '/images/batata-frita.jpg' },
    { nome: 'Onion Rings', descricao: 'Anéis de cebola empanados e crocantes', preco: 14.9, imagem: '/images/onion-rings.jpg' },
  ],
  'Bebidas': [
    { nome: 'Coca-Cola 350ml', descricao: 'Refrigerante Coca-Cola lata 350ml gelada', preco: 6.9, imagem: '/images/coca-cola.jpg' },
    { nome: 'Guaraná 350ml', descricao: 'Refrigerante Guaraná Antarctica lata 350ml gelada', preco: 6.9, imagem: '/images/guarana.jpg' },
  ],
}

export async function POST() {
  const messages: string[] = []
  const errors: string[] = []

  // 1. Storage bucket
  try {
    const { data: buckets } = await supabaseAdmin.storage.listBuckets()
    const has = buckets?.some((b) => b.name === 'produtos')
    if (!has) {
      const { error } = await supabaseAdmin.storage.createBucket('produtos', { public: true })
      if (error) errors.push(`bucket: ${error.message}`)
      else messages.push('Storage bucket "produtos" created.')
    } else {
      messages.push('Storage bucket "produtos" already exists.')
    }
  } catch (e) {
    errors.push(`bucket exception: ${e instanceof Error ? e.message : 'unknown'}`)
  }

  // 2. Seed categories
  let categoryMap: Record<string, string> = {}
  try {
    const { data: existing, error: selErr } = await supabaseAdmin
      .from('categorias')
      .select('id, nome')
    if (selErr) {
      errors.push(`categorias select: ${selErr.message}`)
    } else {
      const existingNames = new Set((existing ?? []).map((c) => c.nome))
      const toInsert = seedCategories.filter((n) => !existingNames.has(n))
      if (toInsert.length > 0) {
        const { error } = await supabaseAdmin
          .from('categorias')
          .insert(toInsert.map((nome) => ({ nome })))
        if (error) errors.push(`categorias insert: ${error.message}`)
        else messages.push(`Seeded ${toInsert.length} categories.`)
      } else {
        messages.push('Categories already seeded.')
      }
      const { data: refreshed } = await supabaseAdmin.from('categorias').select('id, nome')
      categoryMap = Object.fromEntries((refreshed ?? []).map((c) => [c.nome, c.id]))
    }
  } catch (e) {
    errors.push(`categorias exception: ${e instanceof Error ? e.message : 'unknown'}`)
  }

  // 3. Seed products per category if that category has none
  try {
    for (const [catName, products] of Object.entries(seedProductsByCategory)) {
      const catId = categoryMap[catName]
      if (!catId) continue
      const { count } = await supabaseAdmin
        .from('produtos')
        .select('id', { count: 'exact', head: true })
        .eq('categoria_id', catId)
      if (!count || count === 0) {
        const rows = products.map((p) => ({ ...p, categoria_id: catId, ativo: true }))
        const { error } = await supabaseAdmin.from('produtos').insert(rows)
        if (error) errors.push(`produtos[${catName}] insert: ${error.message}`)
        else messages.push(`Seeded ${rows.length} products in ${catName}.`)
      } else {
        messages.push(`Products already exist in ${catName} (${count}).`)
      }
    }
  } catch (e) {
    errors.push(`produtos exception: ${e instanceof Error ? e.message : 'unknown'}`)
  }

  return NextResponse.json({ ok: errors.length === 0, messages, errors })
}

export async function GET() {
  return POST()
}
