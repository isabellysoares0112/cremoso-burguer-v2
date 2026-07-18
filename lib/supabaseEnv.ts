function looksLikeUrl(value: string | undefined): boolean {
  return !!value && /^https?:\/\//i.test(value)
}

function looksLikeJwt(value: string | undefined): boolean {
  return !!value && value.startsWith('eyJ') && value.split('.').length === 3
}

function decodeJwtRole(token: string): string | null {
  try {
    const payload = token.split('.')[1]
    const padded = payload + '='.repeat((4 - (payload.length % 4)) % 4)
    const json = Buffer.from(padded, 'base64').toString('utf8')
    return JSON.parse(json).role ?? null
  } catch {
    return null
  }
}

export function getSupabasePublicEnv(): { url: string; anonKey: string } {
  let url = process.env.NEXT_PUBLIC_SUPABASE_URL
  let anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // Defensive swap: tolerate the URL/ANON values being entered in the wrong fields.
  if (!looksLikeUrl(url) && looksLikeUrl(anonKey)) {
    const tmp = url
    url = anonKey
    anonKey = tmp
  }

  if (!url || !anonKey) {
    throw new Error(
      'Missing Supabase env vars: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY'
    )
  }
  if (!looksLikeUrl(url)) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL must be a URL like https://xxx.supabase.co')
  }
  if (!looksLikeJwt(anonKey)) {
    throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY must be a JWT (eyJ...)')
  }

  return { url, anonKey }
}

export function getSupabaseAdminEnv(): { url: string; serviceRoleKey: string } {
  const { url } = getSupabasePublicEnv()
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceRoleKey || !looksLikeJwt(serviceRoleKey)) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY must be a JWT (eyJ...)')
  }
  const role = decodeJwtRole(serviceRoleKey)
  if (role && role !== 'service_role') {
    throw new Error(
      `SUPABASE_SERVICE_ROLE_KEY has role "${role}", expected "service_role"`
    )
  }
  return { url, serviceRoleKey }
}
