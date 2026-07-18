import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import type { StatusMode } from '@/lib/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const VALID_MODES: StatusMode[] = ['automatic', 'force_open', 'force_closed']

// Real DB columns (verified via debug query):
// id, nome_loja, telefone, whatsapp, instagram,
// horario_funcionamento, taxa_padrao, created_at,
// dias_semana, status_mode

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('configuracoes')
      .select('*')
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle()

    if (error) {
      console.error('[settings GET] Supabase error:', error.message)
      return NextResponse.json({ settings: null, error: error.message })
    }

    if (!data) {
      return NextResponse.json({ settings: null })
    }

    let workingDays: string[] = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo']
    if (data.dias_semana) {
      try {
        const parsed = typeof data.dias_semana === 'string'
          ? JSON.parse(data.dias_semana)
          : data.dias_semana
        if (Array.isArray(parsed)) workingDays = parsed
      } catch {
        // dias_semana parse failed — use default
      }
    }

    const statusMode: StatusMode = VALID_MODES.includes(data.status_mode) ? data.status_mode : 'automatic'

    return NextResponse.json({
      settings: {
        whatsapp: data.whatsapp || '',
        deliveryFee: Number(data.taxa_padrao) || 5,
        openingHours: data.horario_funcionamento || '',
        phone: data.telefone || '',
        instagram: data.instagram || '',
        storeName: data.nome_loja || '',
        workingDays,
        statusMode,
      },
    })
  } catch (e) {
    console.error('[settings GET] Unexpected error:', e)
    return NextResponse.json({ settings: null, error: String(e) })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    const workingDays = Array.isArray(body.workingDays) ? body.workingDays : []
    const statusMode: StatusMode = VALID_MODES.includes(body.statusMode) ? body.statusMode : 'automatic'

    const payload = {
      whatsapp: body.whatsapp ?? '',
      taxa_padrao: Number(body.deliveryFee) || 5,
      horario_funcionamento: body.openingHours ?? '',
      telefone: body.phone ?? '',
      dias_semana: JSON.stringify(workingDays),
      status_mode: statusMode,
      ...(body.instagram !== undefined ? { instagram: body.instagram } : {}),
      ...(body.storeName !== undefined ? { nome_loja: body.storeName } : {}),
    }

    const { data: existing, error: findError } = await supabaseAdmin
      .from('configuracoes')
      .select('id')
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle()

    if (findError) {
      console.error('[settings POST] Find error:', findError.message)
      return NextResponse.json({ error: findError.message }, { status: 500 })
    }

    let saveError: { message: string } | null = null

    if (existing) {
      const { error } = await supabaseAdmin
        .from('configuracoes')
        .update(payload)
        .eq('id', existing.id)
      saveError = error
    } else {
      const { error } = await supabaseAdmin
        .from('configuracoes')
        .insert(payload)
      saveError = error
    }

    if (saveError) {
      console.error('[settings POST] Save error:', saveError.message)
      return NextResponse.json({ error: saveError.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[settings POST] Unexpected error:', e)
    return NextResponse.json({ error: e instanceof Error ? e.message : 'unknown' }, { status: 500 })
  }
}
