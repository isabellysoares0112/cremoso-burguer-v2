import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="text-center max-w-md space-y-4">
        <h1 className="text-6xl font-bold text-primary">404</h1>
        <h2 className="text-xl font-bold text-foreground">Página não encontrada</h2>
        <p className="text-muted-foreground text-sm">
          Essa página não existe ou foi movida.
        </p>
        <Link href="/">
          <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
            Voltar para o início
          </Button>
        </Link>
      </div>
    </div>
  )
}
