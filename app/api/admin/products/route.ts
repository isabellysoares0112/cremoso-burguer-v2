import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function slugify(input: string): string {
  return (input || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

interface ProductInput {
  name: string
  description?: string
  price: number
  image?: string
  category: string
  active: boolean
}

async function getCategoryIdBySlug(slug: string): Promise<string | null> {
  const { data } = await supabaseAdmin.from('categorias').select('id, nome')
  const match = (data ?? []).find((c) => slugify(c.nome) === slug)
  return match?.id ?? null
}

export async function GET() {
  const [{ data: cats }, { data: prods, error }] = await Promise.all([
    supabaseAdmin.from('categorias').select('id, nome'),
    supabaseAdmin.from('produtos').select('*').order('nome'),
  ])
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  const idToSlug = new Map((cats ?? []).map((c) => [c.id, slugify(c.nome) || c.id]))
  const products = (prods ?? []).map((p) => ({
    id: p.id,
    name: p.nome,
    description: p.descricao ?? '',
    price: Number(p.preco) || 0,
    image: p.imagem || '/images/cremoso-burguer.jpg',
    category: idToSlug.get(p.categoria_id) || 'sem-categoria',
    active: !!p.ativo,
  }))
  return NextResponse.json({ products })
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as ProductInput
  const categoria_id = await getCategoryIdBySlug(body.category)
  const { data, error } = await supabaseAdmin
    .from('produtos')
    .insert({
      nome: body.name,
      descricao: body.description ?? '',
      preco: body.price,
      imagem: body.image ?? null,
      categoria_id,
      ativo: !!body.active,
    })
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({
    product: {
      id: data.id,
      name: data.nome,
      description: data.descricao ?? '',
      price: Number(data.preco) || 0,
      image: data.imagem || '/images/cremoso-burguer.jpg',
      category: body.category,
      active: !!data.ativo,
    },
  })
}
