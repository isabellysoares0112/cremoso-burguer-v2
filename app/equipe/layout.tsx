import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Área da Equipe | Cremoso Burguer',
  description: 'Área restrita para equipe da Cremoso Burguer',
}

export default function EquipeLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
