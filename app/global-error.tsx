'use client'

import { useEffect } from 'react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[Erro global não tratado]', error)
  }, [error])

  return (
    <html lang="pt-BR">
      <body style={{ background: '#1a1a1a', color: '#fff', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif' }}>
        <div style={{ textAlign: 'center', maxWidth: 400, padding: 24 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Ops, algo deu errado</h2>
          <p style={{ color: '#999', fontSize: 14, marginBottom: 16 }}>
            Tivemos um problema ao carregar o site. Tente novamente em alguns instantes.
          </p>
          <button
            onClick={() => reset()}
            style={{ background: '#f5a623', color: '#1a1a1a', fontWeight: 700, padding: '10px 20px', borderRadius: 8, border: 'none', cursor: 'pointer' }}
          >
            Tentar novamente
          </button>
        </div>
      </body>
    </html>
  )
}
