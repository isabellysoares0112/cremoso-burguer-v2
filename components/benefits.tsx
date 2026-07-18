'use client'

import { Beef, Leaf, Truck, CreditCard, Clock } from 'lucide-react'

const benefits = [
  {
    icon: Leaf,
    title: 'Ingredientes selecionados',
    description: 'Tudo feito com muito cuidado e qualidade'
  },
  {
    icon: Beef,
    title: 'Sabor inesquecível',
    description: 'Blend exclusivo e sabor incomparável'
  },
  {
    icon: Truck,
    title: 'Entrega rápida e segura',
    description: 'Seu pedido chega quente e rápido'
  },
  {
    icon: CreditCard,
    title: 'Pague como preferir',
    description: 'Pix, cartão, dinheiro e link de pagamento'
  }
]

export function Benefits() {
  return (
    <section className="py-16 bg-card border-y border-border">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
          {benefits.map((benefit, index) => (
            <div
              key={index}
              className="flex flex-col items-center text-center p-4 lg:p-6"
            >
              <div className="w-14 h-14 lg:w-16 lg:h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <benefit.icon className="w-7 h-7 lg:w-8 lg:h-8 text-primary" />
              </div>
              <h3 className="font-bold text-foreground mb-2 text-sm lg:text-base">
                {benefit.title}
              </h3>
              <p className="text-muted-foreground text-xs lg:text-sm">
                {benefit.description}
              </p>
            </div>
          ))}
        </div>

        {/* Delivery time info */}
        <div className="mt-8 pt-8 border-t border-border flex items-center justify-center gap-3 text-muted-foreground">
          <Clock className="w-5 h-5 text-primary" />
          <span className="text-sm lg:text-base">
            Tempo médio de entrega: <strong className="text-foreground">até 60 minutos</strong>
          </span>
        </div>
      </div>
    </section>
  )
}
