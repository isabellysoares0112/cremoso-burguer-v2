import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { getSupabaseAdminEnv } from './supabaseEnv'

let _client: SupabaseClient | null = null

function getClient(): SupabaseClient {
  if (!_client) {
    const { url, serviceRoleKey } = getSupabaseAdminEnv()
    _client = createClient(url, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  }
  return _client
}

export const supabaseAdmin = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const client = getClient()
    const value = (client as any)[prop]
    return typeof value === 'function' ? value.bind(client) : value
  },
})
