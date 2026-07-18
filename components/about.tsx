'use client'

import Image from 'next/image'

export function About() {
  return (
    <section id="quem-somos" className="py-16 lg:py-24 bg-card">
      <div className="container mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Image */}
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/30 to-secondary/20 rounded-2xl blur-2xl" />
            <Image
              src="/logo.png"
              alt="Cremoso Burguer"
              width={500}
              height={500}
              className="relative z-10 w-full max-w-md mx-auto"
            />
          </div>

          {/* Content */}
          <div>
            <h2 className="text-3xl lg:text-4xl font-black text-foreground mb-6">
              QUEM <span className="fire-text">SOMOS</span>
            </h2>
            
            <div className="space-y-4 text-muted-foreground">
              <p className="text-lg">
                Na <strong className="text-primary">Cremoso Burguer</strong>, cada hambúrguer é preparado com paixão, ingredientes selecionados e aquele toque especial de cremosidade que transforma um simples lanche em uma experiência inesquecível. Nosso compromisso é levar até você sabor de verdade, qualidade e o prazer de morder um hambúrguer feito com capricho.
              </p>
              
              <p>
                Com um sistema de delivery rápido e eficiente, garantimos que seu pedido chegue quente e delicioso na sua casa. Entregamos em toda a região com o mesmo padrão de qualidade.
              </p>

              <div className="pt-6">
                <h3 className="text-xl font-bold text-foreground mb-4">Por que escolher a Cremoso Burguer?</h3>
                <ul className="space-y-2">
                  <li className="flex items-center gap-3">
                    <span className="w-2 h-2 rounded-full bg-primary" />
                    <span>Ingredientes frescos e de qualidade</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <span className="w-2 h-2 rounded-full bg-primary" />
                    <span>Entrega rápida e segura</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <span className="w-2 h-2 rounded-full bg-primary" />
                    <span>Atendimento diferenciado</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
