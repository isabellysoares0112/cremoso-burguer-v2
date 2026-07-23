'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { useStore } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { UserRole } from '@/lib/types'

export default function EquipePage() {
  const router = useRouter()
  const { login, user } = useStore()

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [selectedRole, setSelectedRole] = useState<UserRole>('admin')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (user) {
      if (user.role === 'admin') {
        router.replace('/equipe/admin/cozinha')
      } else {
        router.replace('/equipe/entregador')
      }
    }
  }, [user, router])

  if (user) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const success = await login(username, password, selectedRole)

    setLoading(false)

    if (success) {
      if (selectedRole === 'admin') {
        router.push('/equipe/admin/cozinha')
      } else {
        router.push('/equipe/entregador')
      }
    } else {
      setError('Usuário ou senha incorretos')
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Image
            src="/logo-header.png"
            alt="Cremoso Burguer"
            width={1834}
            height={640}
            className="h-16 sm:h-20 w-auto mx-auto mb-4"
          />
          <h1 className="text-2xl font-bold fire-text">ÁREA DA EQUIPE</h1>
          <p className="text-muted-foreground mt-2">
            Faça login para acessar o painel
          </p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="username" className="text-foreground">Usuário</Label>
            <Input
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Digite seu usuário"
              className="bg-muted border-border text-foreground placeholder:text-muted-foreground"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-foreground">Senha</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Digite sua senha"
              className="bg-muted border-border text-foreground placeholder:text-muted-foreground"
              required
            />
          </div>

          <div className="space-y-3">
            <Label className="text-foreground">Selecione o tipo de acesso</Label>
            <div className="space-y-2">
              <label className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/50 cursor-pointer hover:border-primary/50 transition-colors">
                <input
                  type="radio"
                  name="role"
                  value="admin"
                  checked={selectedRole === 'admin'}
                  onChange={() => setSelectedRole('admin')}
                  className="w-4 h-4 text-primary"
                />
                <span className="text-foreground">Administrador</span>
              </label>
              <label className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/50 cursor-pointer hover:border-primary/50 transition-colors">
                <input
                  type="radio"
                  name="role"
                  value="entregador"
                  checked={selectedRole === 'entregador'}
                  onChange={() => setSelectedRole('entregador')}
                  className="w-4 h-4 text-primary"
                />
                <span className="text-foreground">Entregador</span>
              </label>
            </div>
          </div>

          {error && (
            <p className="text-destructive text-sm text-center">{error}</p>
          )}

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-6 glow-yellow"
          >
            {loading ? 'ENTRANDO...' : 'ENTRAR'}
          </Button>
        </form>
      </div>
    </div>
  )
}
