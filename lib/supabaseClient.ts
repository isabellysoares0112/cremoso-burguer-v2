import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { getSupabasePublicEnv } from './supabaseEnv'

let _client: SupabaseClient | null = null

function getClient(): SupabaseClient {
  if (!_client) {
    const { url, anonKey } = getSupabasePublicEnv()
    _client = createClient(url, anonKey, {
      auth: {
        persistSession: false,
      },
    })
  }
  return _client
}

export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const client = getClient()
    const value = (client as any)[prop]
    return typeof value === 'function' ? value.bind(client) : value
  },
})
