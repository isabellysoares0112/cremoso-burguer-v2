import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import type { StatusMode } from '@/lib/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const VALID_MODES: StatusMode[] = ['automatic', 'force_open', 'force_closed']

// Versão PÚBLICA de /api/admin/settings — usada pela página inicial (rodapé,
// faixa de "aberto agora"), que não exige login. Só devolve campos que já
// são informação pública da loja (contato, horário, status); nada sensível.
export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('configuracoes')
      .select('*')
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle()

    if (error) {
      console.error('[settings público GET] Supabase error:', error.message)
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
        // dias_semana parse falhou — usa o padrão
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
    console.error('[settings público GET] Unexpected error:', e)
    return NextResponse.json({ settings: null, error: 'Erro interno' }, { status: 500 })
  }
}
