const BROADCAST_TOPIC = 'cremoso:orders'

export async function broadcastOrdersChanged(): Promise<void> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return
  try {
    await fetch(`${url}/realtime/v1/api/broadcast`, {
      method: 'POST',
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: [{ topic: BROADCAST_TOPIC, event: 'change', payload: {} }],
      }),
    })
  } catch {
    // silent — broadcast failure must never break the main operation
  }
}
