type ClassValue =
  | string
  | number
  | boolean
  | undefined
  | null
  | ClassValue[]
  | Record<string, boolean | undefined | null>

// Implementação leve (sem dependência extra) do padrão clsx: aceita strings,
// arrays aninhados e objetos { 'classe': condição }. Antes essa função só
// aceitava strings — quando componentes shadcn/ui chamavam cn() com um objeto
// (padrão comum na biblioteca), o objeto virava a string "[object Object]"
// dentro do className.
export function cn(...inputs: ClassValue[]): string {
  const out: string[] = []
  for (const input of inputs) {
    if (!input) continue
    if (typeof input === 'string' || typeof input === 'number') {
      out.push(String(input))
    } else if (Array.isArray(input)) {
      const nested = cn(...input)
      if (nested) out.push(nested)
    } else if (typeof input === 'object') {
      for (const key in input) {
        if (input[key]) out.push(key)
      }
    }
  }
  return out.join(' ')
}

export function formatPrice(price: number) {
  return price?.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }) || 'R$ 0,00'
}
