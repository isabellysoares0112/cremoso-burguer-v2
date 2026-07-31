import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Recebe a lista de IDs na nova ordem (de cima pra baixo) e regrava a
// coluna "ordem" de cada categoria como a posição dela nessa lista.
export async function POST(req: NextRequest) {
  const body = await req.json()
  const orderedIds = body?.orderedIds

  if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
    return NextResponse.json({ error: 'orderedIds inválido' }, { status: 400 })
  }

  const updates = orderedIds.map((id: string, index: number) =>
    supabaseAdmin.from('categorias').update({ ordem: index }).eq('id', id)
  )

  const results = await Promise.all(updates)
  const failed = results.find((r) => r.error)
  if (failed?.error) {
    return NextResponse.json({ error: failed.error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
