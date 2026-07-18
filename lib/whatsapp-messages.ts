import type { Order, OrderStatus } from './types'

function normalizePhone(raw: string): string {
  let phone = raw.replace(/\D/g, '')
  if (phone.length === 10 || phone.length === 11) {
    phone = '55' + phone
  }
  return phone
}

function formatPrice(price: number): string {
  return price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function padNum(n: number): string {
  return String(n).padStart(3, '0')
}

export function getWhatsAppMessage(order: Order, newStatus: OrderStatus): string | null {
  const num = padNum(order.number)

  switch (newStatus) {
    case 'preparando':
      return (
        `✅ *Pedido confirmado!*\n` +
        `🍔 Pedido *#${num}*\n\n` +
        `Recebemos seu pedido e já estamos preparando! Em breve chegará até você. `
      )
    case 'pronto':
      return (
        `🏍 *Seu pedido saiu para entrega!*\n` +
        `🍔 Pedido *#${num}*\n\n` +
        `Fique de olho na porta! Estamos a caminho. `
      )
    case 'entregue':
      return (
        `✅ *Pedido entregue!*\n` +
        `🍔 Pedido *#${num}*\n\n` +
        `Obrigado pela preferência! Volte sempre❤️🔥`
      )
    case 'cancelado':
      return (
        `❌ *Pedido cancelado*\n` +
        `🍔 Pedido *#${num}*\n\n` +
        `Seu pedido foi cancelado. Entre em contato conosco para mais informações.`
      )
    default:
      return null
  }
}

export function getPixMessage(order: Order, pixKey: string): string {
  const num = padNum(order.number)
  return (
    `💳 *Pagamento via PIX*\n` +
    `🍔 Pedido *#${num}* — ${formatPrice(order.total)}\n\n` +
    `Chave PIX:\n\`${pixKey}\`\n\n` +
    `Após confirmar o pagamento, seu pedido será preparado! 🙏`
  )
}

export function openWhatsApp(phone: string, message: string): void {
  const normalized = normalizePhone(phone)
  if (!normalized || normalized.length < 12) return
  window.open(`https://wa.me/${normalized}?text=${encodeURIComponent(message)}`, '_blank')
}
