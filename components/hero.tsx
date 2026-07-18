'use client'

import Image from 'next/image'
import { Button } from '@/components/ui/button'

export function Hero() {
  const scrollToMenu = () => {
    const menuSection = document.getElementById('cardapio')
    if (menuSection) {
      menuSection.scrollIntoView({ behavior: 'smooth' })
    }
  }

  return (
    <section id="inicio" className="relative min-h-screen flex items-center pt-16 lg:pt-20 overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-orange-950/20" />
      
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-primary/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-secondary/10 rounded-full blur-3xl animate-pulse delay-1000" />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
          {/* Content */}
          <div className="text-center lg:text-left">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-black leading-tight mb-6">
              <span className="text-foreground">UMA EXPLOSÃO DE</span>
              <br />
              <span className="text-foreground">SABOR EM CADA</span>
              <br />
              <span className="fire-text neon-orange">MORDIDA.</span>
            </h1>
            
            <p className="text-lg lg:text-xl text-muted-foreground mb-8 max-w-xl mx-auto lg:mx-0">
              Hambúrgueres caprichados e absurdamente cremosos, uma mordida e você entende o nome!
            </p>

            <div className="flex justify-center lg:justify-start">
              <Button
                onClick={scrollToMenu}
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-lg px-8 py-6 rounded-lg glow-yellow"
              >
                FAZER MEU PEDIDO
              </Button>
            </div>
          </div>

          {/* Hero Image */}
          <div className="relative flex justify-center lg:justify-end">
            <div className="relative w-full max-w-lg lg:max-w-xl">
              {/* Glow effect behind burger */}
              <div className="absolute inset-0 bg-gradient-to-t from-primary/30 via-secondary/20 to-transparent rounded-full blur-3xl scale-110" />
              
              <Image
                src="/images/hero-burger.jpg"
                alt="Hambúrguer suculento com queijo derretendo"
                width={600}
                height={600}
                className="relative z-10 w-full h-auto object-contain drop-shadow-2xl"
                priority
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
