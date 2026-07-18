'use client'

import { Users, Shield, Truck } from 'lucide-react'

// Simple static users panel for demo
const demoUsers = [
  { id: '1', username: 'admin', role: 'admin', name: 'Administrador' },
  { id: '2', username: 'entregador', role: 'entregador', name: 'Entregador 1' },
]

export function UsersPanel() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-foreground mb-6">USUÁRIOS</h1>

      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-muted">
            <tr>
              <th className="text-left p-4 text-foreground font-bold">Usuário</th>
              <th className="text-left p-4 text-foreground font-bold">Nome</th>
              <th className="text-left p-4 text-foreground font-bold">Tipo de Acesso</th>
            </tr>
          </thead>
          <tbody>
            {demoUsers.map((user) => (
              <tr key={user.id} className="border-t border-border">
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                      <Users className="w-5 h-5 text-primary" />
                    </div>
                    <span className="font-bold text-foreground">{user.username}</span>
                  </div>
                </td>
                <td className="p-4 text-muted-foreground">{user.name}</td>
                <td className="p-4">
                  <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold ${
                    user.role === 'admin' 
                      ? 'bg-primary/20 text-primary'
                      : 'bg-secondary/20 text-secondary'
                  }`}>
                    {user.role === 'admin' ? (
                      <Shield className="w-3 h-3" />
                    ) : (
                      <Truck className="w-3 h-3" />
                    )}
                    {user.role === 'admin' ? 'Administrador' : 'Entregador'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-6 p-4 bg-muted/50 rounded-lg">
        <p className="text-muted-foreground text-sm">
          <strong>Credenciais de demonstração:</strong>
        </p>
        <ul className="text-muted-foreground text-sm mt-2 space-y-1">
          <li>Admin: usuário <code className="bg-muted px-1 rounded">admin</code> / senha <code className="bg-muted px-1 rounded">admin123</code></li>
          <li>Entregador: usuário <code className="bg-muted px-1 rounded">entregador</code> / senha <code className="bg-muted px-1 rounded">entrega123</code></li>
        </ul>
      </div>
    </div>
  )
}
