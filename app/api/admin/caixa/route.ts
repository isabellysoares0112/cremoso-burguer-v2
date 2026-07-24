import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

async function getSessaoAberta() {
  const { data } = await supabaseAdmin
    .from('caixa_sessoes')
    .select('*')
    .eq('status', 'aberto')
    .order('aberto_em', { ascending: false })
    .limit(1)
    .maybeSingle()
  return data
}

export async function GET() {
  const sessao = await getSessaoAberta()

  if (!sessao) {
    return NextResponse.json({ isOpen: false, totalInicial: 0, movimentos: [] })
  }

  const { data: movs, error } = await supabaseAdmin
    .from('caixa_movimentos')
    .select('*')
    .eq('sessao_id', sessao.id)
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({
    isOpen: true,
    sessaoId: sessao.id,
    openedAt: sessao.aberto_em,
    totalInicial: Number(sessao.total_inicial) || 0,
    movimentos: (movs || []).map((m) => ({
      id: m.id,
      tipo: m.tipo,
      valor: Number(m.valor) || 0,
      obs: m.obs || '',
      data: m.created_at,
    })),
  })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { action } = body

  if (action === 'abrir') {
    const existing = await getSessaoAberta()
    if (existing) return NextResponse.json({ error: 'Já existe um caixa aberto' }, { status: 409 })

    const { data, error } = await supabaseAdmin
      .from('caixa_sessoes')
      .insert({ status: 'aberto', total_inicial: Number(body.totalInicial) || 0 })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true, sessaoId: data.id })
  }

  if (action === 'fechar') {
    const sessao = await getSessaoAberta()
    if (!sessao) return NextResponse.json({ error: 'Nenhum caixa aberto' }, { status: 404 })

    const { error } = await supabaseAdmin
      .from('caixa_sessoes')
      .update({
        status: 'fechado',
        fechado_em: new Date().toISOString(),
        total_final: Number(body.totalFinal) || 0,
      })
      .eq('id', sessao.id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  if (action === 'movimento') {
    const sessao = await getSessaoAberta()
    if (!sessao) return NextResponse.json({ error: 'Nenhum caixa aberto' }, { status: 404 })

    const { tipo, valor, obs } = body
    if (!['sangria', 'suprimento'].includes(tipo) || !valor || Number(valor) <= 0) {
      return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
      .from('caixa_movimentos')
      .insert({ sessao_id: sessao.id, tipo, valor: Number(valor), obs: obs || tipo })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true, movimento: data })
  }

  return NextResponse.json({ error: 'action inválida' }, { status: 400 })
}
