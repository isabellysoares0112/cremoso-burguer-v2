import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Move um produto uma posição pra cima ou pra baixo, trocando a "ordem"
// dele com a do vizinho na mesma categoria. Produtos de categorias
// diferentes nunca se misturam nessa troca.
export async function POST(req: NextRequest) {
  const body = await req.json()
  const { id, direction } = body

  if (!id || !['up', 'down'].includes(direction)) {
    return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
  }

  const { data: atual, error: findError } = await supabaseAdmin
    .from('produtos')
    .select('id, categoria_id, ordem')
    .eq('id', id)
    .single()

  if (findError || !atual) {
    return NextResponse.json({ error: 'Produto não encontrado' }, { status: 404 })
  }

  const { data: irmaos, error: listError } = await supabaseAdmin
    .from('produtos')
    .select('id, ordem')
    .eq('categoria_id', atual.categoria_id)
    .order('ordem', { ascending: true })
    .order('nome', { ascending: true })

  if (listError || !irmaos) {
    return NextResponse.json({ error: 'Erro ao buscar produtos da categoria' }, { status: 500 })
  }

  const index = irmaos.findIndex((p) => p.id === id)
  const targetIndex = direction === 'up' ? index - 1 : index + 1

  if (index === -1 || targetIndex < 0 || targetIndex >= irmaos.length) {
    // Já está no topo ou no fim — não tem pra onde mover.
    return NextResponse.json({ ok: true, moved: false })
  }

  const vizinho = irmaos[targetIndex]

  // Troca as ordens dos dois. Se os dois produtos tiverem a mesma "ordem"
  // (ex: recém-migrados, todos com 0), usa a posição na lista como
  // desempate pra garantir que sempre existam valores distintos depois.
  const ordemAtual = atual.ordem ?? index
  const ordemVizinho = vizinho.ordem ?? targetIndex

  const novaOrdemAtual = ordemAtual === ordemVizinho ? targetIndex : ordemVizinho
  const novaOrdemVizinho = ordemAtual === ordemVizinho ? index : ordemAtual

  const [{ error: err1 }, { error: err2 }] = await Promise.all([
    supabaseAdmin.from('produtos').update({ ordem: novaOrdemAtual }).eq('id', atual.id),
    supabaseAdmin.from('produtos').update({ ordem: novaOrdemVizinho }).eq('id', vizinho.id),
  ])

  if (err1 || err2) {
    return NextResponse.json({ error: (err1 || err2)?.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, moved: true })
}
