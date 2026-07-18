'use client'

import { useEffect } from 'react'
import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[Erro não tratado]', error)
  }, [error])

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="text-center max-w-md space-y-4">
        <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
          <AlertTriangle className="w-8 h-8 text-destructive" />
        </div>
        <h2 className="text-xl font-bold text-foreground">Ops, algo deu errado</h2>
        <p className="text-muted-foreground text-sm">
          Tivemos um problema ao carregar esta página. Você pode tentar de novo, ou voltar em alguns instantes.
        </p>
        <Button onClick={() => reset()} className="bg-primary hover:bg-primary/90 text-primary-foreground">
          Tentar novamente
        </Button>
      </div>
    </div>
  )
}
